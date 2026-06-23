import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Hoisted mock supabase client + scratch state. The query builder is a lazy,
// chainable thenable: each terminal (await / .single() / .maybeSingle())
// computes from the accumulated op/table/filters. ──────────────────────────────
const h = vi.hoisted(() => {
  const state = {
    waiverRows: [
      { id: 'medical-exemption', name: 'Medical Exemption', description: 'd', active: true,
        required_docs: [], form_schema: [] },
    ],
    selectRows: [],        // rows a requests SELECT returns (array path)
    insertedRequest: null, // last requests insert payload
    updates: [],           // every requests update: { payload, filters }
    user: { id: 'user-1', email: 's@x.edu', user_metadata: { name: 'SB User' } },
  }
  function makeBuilder(table) {
    const ctx = { table, op: 'select', filters: {}, payload: null }
    const resolve = () => {
      if (ctx.table === 'waiver_types') {
        let rows = state.waiverRows
        if ('id' in ctx.filters) rows = rows.filter((r) => r.id === ctx.filters.id)
        if ('active' in ctx.filters) rows = rows.filter((r) => r.active === ctx.filters.active)
        if (ctx.single || ctx.maybeSingle) return { data: rows[0] ?? null, error: null }
        return { data: rows, error: null }
      }
      if (ctx.table === 'requests') {
        if (ctx.op === 'insert') {
          state.insertedRequest = ctx.payload
          return { data: { id: 'req-sb-1', status: 'submitted' }, error: null }
        }
        if (ctx.op === 'update') {
          state.updates.push({ payload: ctx.payload, filters: { ...ctx.filters } })
          return { data: null, error: null }
        }
        if (ctx.single || ctx.maybeSingle) return { data: state.selectRows[0] ?? null, error: null }
        return { data: state.selectRows, error: null }
      }
      return { data: null, error: null }
    }
    const builder = {
      select() { return builder },
      insert(p) { ctx.op = 'insert'; ctx.payload = p; return builder },
      update(p) { ctx.op = 'update'; ctx.payload = p; return builder },
      eq(col, val) { ctx.filters[col] = val; return builder },
      order() { return builder },
      single() { ctx.single = true; return Promise.resolve(resolve()) },
      maybeSingle() { ctx.maybeSingle = true; return Promise.resolve(resolve()) },
      then(onF, onR) { return Promise.resolve(resolve()).then(onF, onR) },
    }
    return builder
  }
  const mockClient = {
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user } })) },
    from: vi.fn((table) => makeBuilder(table)),
  }
  return { state, mockClient }
})

vi.mock('../../lib/supabase.js', () => ({ isSupabaseConfigured: true, supabase: h.mockClient }))

// Spy the disclosure logger + actor deriver. recordAuditEvent must NOT fire on
// the student self-poll path and MUST fire (with an auth-derived actor) on the
// counselor bulk reads.
vi.mock('../audit.js', () => ({
  recordAuditEvent: vi.fn(async () => {}),
  actorFromAuth: vi.fn((user, role) => ({ id: user?.id ?? null, role })),
}))

// Keep the rubric engine cheap + deterministic.
vi.mock('../../utils/schedulingLogic.js', () => ({
  evaluateAgainstRubric: vi.fn(() => ({ decision: 'review', confidence: 0.5, reason: 'stub', checks: [] })),
  parseTranscriptData: vi.fn(),
}))

import { recordAuditEvent, actorFromAuth } from '../audit.js'

beforeEach(() => {
  h.state.selectRows = []
  h.state.insertedRequest = null
  h.state.updates = []
  h.state.user = { id: 'user-1', email: 's@x.edu', user_metadata: { name: 'SB User' } }
  vi.clearAllMocks()
})
afterEach(() => { vi.clearAllMocks() })

describe('supabaseApi consent gate', () => {
  it('throws the byte-identical consent error when consentGiven is not true', async () => {
    const sb = await import('../supabaseApi.js')
    await expect(
      sb.submitWaiver({ waiverTypeId: 'medical-exemption', documents: [], courseList: [] }),
    ).rejects.toThrow('Consent to the FERPA disclosure is required before submitting.')
    expect(h.state.insertedRequest).toBeNull()
  })

  it('persists consent_given_at + consent_version on a consented submit', async () => {
    const sb = await import('../supabaseApi.js')
    await sb.submitWaiver({
      waiverTypeId: 'medical-exemption', documents: [], courseList: [],
      consentGiven: true, consentVersion: 'ferpa-v1',
    })
    expect(h.state.insertedRequest.consent_given_at).toBeTruthy()
    expect(typeof h.state.insertedRequest.consent_given_at).toBe('string')
    expect(h.state.insertedRequest.consent_version).toBe('ferpa-v1')
  })
})

describe('supabaseApi student rights', () => {
  it('withdrawRequest updates status+withdrawn_at gated by id AND status=submitted', async () => {
    const sb = await import('../supabaseApi.js')
    const res = await sb.withdrawRequest('req-9')
    expect(res).toEqual({ ok: true, requestId: 'req-9', status: 'withdrawn' })
    expect(h.state.updates).toHaveLength(1)
    const { payload, filters } = h.state.updates[0]
    expect(payload.status).toBe('withdrawn')
    expect(payload.withdrawn_at).toBeTruthy()
    expect(filters).toEqual({ id: 'req-9', status: 'submitted' }) // race-safe RLS mirror
  })

  it('requestRequestDeletion stamps deletion_requested_at gated by id only', async () => {
    const sb = await import('../supabaseApi.js')
    const res = await sb.requestRequestDeletion('req-9')
    expect(res).toEqual({ ok: true, requestId: 'req-9' })
    const { payload, filters } = h.state.updates[0]
    expect(payload.deletion_requested_at).toBeTruthy()
    expect(payload.status).toBeUndefined() // never changes status
    expect(filters).toEqual({ id: 'req-9' })
  })
})

describe('supabaseApi FERPA §99.32 disclosure logging', () => {
  it('fetchReviewQueue logs record.view.bulk with an auth-derived counselor actor', async () => {
    h.state.selectRows = [
      { id: 'r1', student_id: 'stu-a', status: 'submitted', submitted_at: '2026-06-23T00:00:00Z' },
      { id: 'r2', student_id: 'stu-b', status: 'submitted', submitted_at: '2026-06-23T00:01:00Z' },
    ]
    const sb = await import('../supabaseApi.js')
    await sb.fetchReviewQueue()
    expect(recordAuditEvent).toHaveBeenCalledTimes(1)
    const arg = recordAuditEvent.mock.calls[0][0]
    expect(arg.action).toBe('record.view.bulk')
    expect(arg.after.studentIds).toEqual(['stu-a', 'stu-b'])
    // actor came from auth.getUser(), not a client arg
    expect(actorFromAuth).toHaveBeenCalledWith(h.state.user, 'counselor')
    expect(arg.actor).toEqual({ id: 'user-1', role: 'counselor' })
  })

  it('fetchRejectedRequests logs record.view.bulk', async () => {
    h.state.selectRows = [
      { id: 'r3', student_id: 'stu-c', status: 'denied', decided_at: '2026-06-23T00:00:00Z' },
    ]
    const sb = await import('../supabaseApi.js')
    await sb.fetchRejectedRequests()
    expect(recordAuditEvent).toHaveBeenCalledTimes(1)
    expect(recordAuditEvent.mock.calls[0][0].action).toBe('record.view.bulk')
  })

  it('does NOT log on an empty bulk read', async () => {
    h.state.selectRows = []
    const sb = await import('../supabaseApi.js')
    await sb.fetchReviewQueue()
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('fetchRequestStatus (student self-poll path) does NOT log a disclosure', async () => {
    h.state.selectRows = [{ id: 'r1', student_id: 'stu-a', status: 'approved', submitted_at: '2026-06-23T00:00:00Z' }]
    const sb = await import('../supabaseApi.js')
    await sb.fetchRequestStatus('r1')
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('an ASYNC disclosure-logging rejection never blocks the counselor read', async () => {
    // recordAuditEvent rejects AFTER its internal await (the realistic failure
    // mode) — the read must still resolve and no unhandled rejection escapes.
    recordAuditEvent.mockRejectedValueOnce(new Error('audit down'))
    h.state.selectRows = [{ id: 'r1', student_id: 'stu-a', status: 'submitted', submitted_at: '2026-06-23T00:00:00Z' }]
    const sb = await import('../supabaseApi.js')
    await expect(sb.fetchReviewQueue()).resolves.toBeInstanceOf(Array)
  })
})
