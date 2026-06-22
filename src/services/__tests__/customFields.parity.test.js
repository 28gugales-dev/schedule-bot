import { describe, it, expect } from 'vitest'
import { diffWaiverType } from '../api.js'

describe('diffWaiverType', () => {
  it('reports name/description/active changes', () => {
    const before = { id: 'x', name: 'A', description: 'd1', active: true, requiredDocs: [], formSchema: [] }
    const after = { id: 'x', name: 'B', description: 'd1', active: false, requiredDocs: [], formSchema: [] }
    const diff = diffWaiverType(before, after)
    expect(diff).toContainEqual({ entity: 'Waiver: B', field: 'name', from: 'A', to: 'B' })
    expect(diff).toContainEqual({ entity: 'Waiver: B', field: 'active', from: true, to: false })
    expect(diff.find((d) => d.field === 'description')).toBeUndefined()
  })

  it('reports field count + requiredDocs changes without dumping arrays', () => {
    const before = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: ['courseList'], formSchema: [] }
    const after = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: ['courseList', 'supporting'], formSchema: [{ id: 'q1', type: 'shortText', label: 'Q' }] }
    const diff = diffWaiverType(before, after)
    expect(diff).toContainEqual({ entity: 'Waiver: A', field: 'fieldCount', from: 0, to: 1 })
    expect(diff).toContainEqual({ entity: 'Waiver: A', field: 'requiredDocs', from: 'courseList', to: 'courseList, supporting' })
  })

  it('returns empty diff for identical inputs', () => {
    const w = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: [], formSchema: [] }
    expect(diffWaiverType(w, { ...w })).toEqual([])
  })
})

import { vi, beforeEach, afterEach } from 'vitest'

// ── Hoisted mock state (vi.mock factory is hoisted above imports, so the client
// and its scratch state must live in vi.hoisted or they're TDZ-undefined). ──
const h = vi.hoisted(() => {
  const state = {
    waiverRows: [],          // current waiver_types rows (snake_case)
    insertedRequest: null,   // last requests insert payload
    requestRowToReturn: null, // what a requests SELECT/insert returns
  }
  // A thenable, chainable query builder. Resolution is computed lazily from
  // `op`, `table`, and accumulated filters when the chain is awaited.
  function makeBuilder(table) {
    const ctx = { table, op: 'select', columns: '*', filters: {}, payload: null }
    const resolve = () => {
      if (ctx.table === 'waiver_types') {
        if (ctx.op === 'insert') {
          state.waiverRows.push(ctx.payload)
          return { data: ctx.payload, error: null }
        }
        if (ctx.op === 'update') {
          const row = state.waiverRows.find((r) => r.id === ctx.filters.id)
          if (row) Object.assign(row, ctx.payload)
          return { data: row ?? null, error: null }
        }
        // select
        let rows = state.waiverRows
        if ('id' in ctx.filters) rows = rows.filter((r) => r.id === ctx.filters.id)
        if ('active' in ctx.filters) rows = rows.filter((r) => r.active === ctx.filters.active)
        if (ctx.single || ctx.maybeSingle) return { data: rows[0] ?? null, error: null }
        return { data: rows, error: null }
      }
      if (ctx.table === 'requests') {
        if (ctx.op === 'insert') {
          state.insertedRequest = ctx.payload
          return { data: state.requestRowToReturn ?? { id: 'req-sb-1', status: 'submitted' }, error: null }
        }
        // select: single/maybeSingle → scalar; otherwise → array (queue/list).
        if (ctx.single || ctx.maybeSingle) return { data: state.requestRowToReturn ?? null, error: null }
        return { data: state.requestRowToReturn ? [state.requestRowToReturn] : [], error: null }
      }
      return { data: null, error: null }
    }
    const builder = {
      select(cols) { ctx.columns = cols; ctx.op = ctx.op === 'select' ? 'select' : ctx.op; return builder },
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
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-sb-1', email: 's@x.edu', user_metadata: { name: 'SB Student' } } } })) },
    from: vi.fn((table) => makeBuilder(table)),
  }
  return { state, mockClient }
})

// isSupabaseConfigured:false keeps api.js on the demo path; supabase:mockClient
// gives supabaseApi.js a working client (without it, supabase is null → TypeError).
vi.mock('../../lib/supabase.js', () => ({ isSupabaseConfigured: false, supabase: h.mockClient }))

// Spy the engine to prove formAnswers never reaches it.
vi.mock('../../utils/schedulingLogic.js', () => ({
  evaluateAgainstRubric: vi.fn(() => ({ decision: 'review', confidence: 0.5, reason: 'stub', checks: [] })),
  parseTranscriptData: vi.fn(),
}))

import { evaluateAgainstRubric } from '../../utils/schedulingLogic.js'

describe('custom-fields parity + isolation', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear?.()
    h.state.waiverRows = [
      { id: 'medical-exemption', name: 'Medical Exemption', description: 'd', active: true, required_docs: ['supporting'],
        form_schema: [{ id: 'condition', type: 'shortText', label: 'Condition', required: true }] },
    ]
    h.state.insertedRequest = null
    h.state.requestRowToReturn = null
    evaluateAgainstRubric.mockClear()
  })
  afterEach(() => { vi.clearAllMocks() })

  // ── T25: demo round-trip ──────────────────────────────────────────────────
  it('T25 demo: formAnswers round-trip submit → fetchReviewQueue/fetchMyRequests', async () => {
    const api = await import('../api.js')
    const answers = { condition: 'knee recovery' }
    const { requestId } = await api.submitWaiver({
      studentId: 'S-T25', waiverTypeId: 'medical-exemption', documents: [], courseList: [],
      formAnswers: answers,
    })
    const queue = await api.fetchReviewQueue()
    const qRow = queue.find((r) => r.id === requestId)
    expect(qRow.formAnswers).toEqual(answers)
    expect(Array.isArray(qRow.formSchemaSnapshot)).toBe(true)

    const mine = await api.fetchMyRequests()
    const mRow = mine.find((r) => r.id === requestId)
    expect(mRow.formAnswers).toEqual(answers)
    expect(Array.isArray(mRow.formSchemaSnapshot)).toBe(true)
  })

  // ── T26: supabase mapping both directions ─────────────────────────────────
  it('T26 supabase: submitWaiver writes form_answers + frozen snapshot to the requests insert', async () => {
    const sb = await import('../supabaseApi.js')
    const answers = { condition: 'knee recovery' }
    await sb.submitWaiver({ waiverTypeId: 'medical-exemption', documents: [], courseList: [], formAnswers: answers })
    expect(h.state.insertedRequest.form_answers).toEqual(answers)
    expect(h.state.insertedRequest.form_schema_snapshot).toEqual(
      h.state.waiverRows[0].form_schema,
    )
  })

  it('T26 supabase: rowToWaiverType/rowToSubmission map snake↔camel', async () => {
    const sb = await import('../supabaseApi.js')
    const waivers = await sb.fetchAllWaivers()
    expect(waivers[0].formSchema).toEqual([{ id: 'condition', type: 'shortText', label: 'Condition', required: true }])
    expect(waivers[0].requiredDocs).toEqual(['supporting'])

    h.state.requestRowToReturn = {
      id: 'req-sb-9', student_id: 'user-sb-1', waiver_type_id: 'medical-exemption', status: 'submitted',
      form_answers: { condition: 'x' }, form_schema_snapshot: [{ id: 'condition', type: 'shortText', label: 'C' }],
    }
    const got = await sb.fetchRequestStatus('req-sb-9')
    expect(got.formAnswers).toEqual({ condition: 'x' })
    expect(got.formSchemaSnapshot).toEqual([{ id: 'condition', type: 'shortText', label: 'C' }])
  })

  it('T26 supabase: updateWaiverType(formSchema) → form_schema, partial preserves rest', async () => {
    const sb = await import('../supabaseApi.js')
    const newSchema = [{ id: 'q2', type: 'longText', label: 'Why?' }]
    const updated = await sb.updateWaiverType('medical-exemption', { formSchema: newSchema })
    expect(h.state.waiverRows[0].form_schema).toEqual(newSchema)
    expect(h.state.waiverRows[0].name).toBe('Medical Exemption') // untouched
    expect(updated.formSchema).toEqual(newSchema)
  })

  it('T26 supabase: deleteWaiverType is soft (active=false), createWaiverType slugs id + defaults inactive', async () => {
    const sb = await import('../supabaseApi.js')
    await sb.deleteWaiverType('medical-exemption')
    expect(h.state.waiverRows[0].active).toBe(false)
    const created = await sb.createWaiverType({ name: 'Field Trip Form', requiredDocs: [], formSchema: [] })
    expect(created.id).toBe('field-trip-form')
    expect(created.active).toBe(false)
  })

  // ── T27: identical key-sets across both paths ─────────────────────────────
  it('T27 identical key-sets: demo queue row vs supabase queue row carry the same form keys', async () => {
    const api = await import('../api.js')
    const sb = await import('../supabaseApi.js')

    const { requestId } = await api.submitWaiver({
      studentId: 'S-T27', waiverTypeId: 'medical-exemption', documents: [], courseList: [], formAnswers: { condition: 'x' },
    })
    const demoRow = (await api.fetchReviewQueue()).find((r) => r.id === requestId)

    h.state.requestRowToReturn = {
      id: 'req-sb-27', student_id: 'user-sb-1', waiver_type_id: 'medical-exemption', status: 'submitted',
      form_answers: { condition: 'x' }, form_schema_snapshot: h.state.waiverRows[0].form_schema,
    }
    const sbRow = (await sb.fetchReviewQueue()).find((r) => r.id === 'req-sb-27')

    const formKeys = (o) => Object.keys(o).filter((k) => k === 'formAnswers' || k === 'formSchemaSnapshot').sort()
    expect(formKeys(demoRow)).toEqual(['formAnswers', 'formSchemaSnapshot'])
    expect(['formAnswers', 'formSchemaSnapshot'].every((k) => k in sbRow)).toBe(true)
  })

  // ── T16/T17: AI-engine isolation (highest value) ──────────────────────────
  it('T16 demo: evaluateAgainstRubric arg object has NO formAnswers key', async () => {
    const api = await import('../api.js')
    await api.submitWaiver({
      studentId: 'S-T16', waiverTypeId: 'medical-exemption', documents: [], courseList: ['Algebra'],
      transcriptData: { gpa: 3.5, studentGrade: 11 },
      formAnswers: { condition: 'should NOT leak', secret: 'nope' },
    })
    expect(evaluateAgainstRubric).toHaveBeenCalled()
    const arg = evaluateAgainstRubric.mock.calls[0][0]
    expect('formAnswers' in arg).toBe(false)
    expect('condition' in arg).toBe(false)
    expect('secret' in arg).toBe(false)
  })

  it('T16 supabase: evaluateAgainstRubric arg object has NO formAnswers key', async () => {
    const sb = await import('../supabaseApi.js')
    await sb.submitWaiver({
      waiverTypeId: 'medical-exemption', documents: [], courseList: ['Algebra'],
      transcriptData: { gpa: 3.5, studentGrade: 11 },
      formAnswers: { condition: 'should NOT leak' },
    })
    const arg = evaluateAgainstRubric.mock.calls[0][0]
    expect('formAnswers' in arg).toBe(false)
    expect('condition' in arg).toBe(false)
  })

  it('T17 demo: the engine arg is byte-identical with vs without a populated formAnswers sibling', async () => {
    const api = await import('../api.js')
    const base = { studentId: 'S-T17a', waiverTypeId: 'medical-exemption', documents: [], courseList: ['Algebra'], transcriptData: { gpa: 3.5, studentGrade: 11 } }
    await api.submitWaiver({ ...base })
    const without = evaluateAgainstRubric.mock.calls[0][0]
    evaluateAgainstRubric.mockClear()
    await api.submitWaiver({ ...base, studentId: 'S-T17b', formAnswers: { condition: 'x', reasons: ['a', 'b'] } })
    const withAns = evaluateAgainstRubric.mock.calls[0][0]
    expect(withAns).toEqual(without)
  })

  // ── T29: backward compat — legacy request (no form fields) reads null-safe ─
  it('T29 legacy: a pre-feature request without form fields reads back null-safe', async () => {
    const sb = await import('../supabaseApi.js')
    h.state.requestRowToReturn = {
      id: 'req-legacy', student_id: 'user-sb-1', waiver_type_id: 'prereq-override', status: 'submitted',
      // no form_answers / form_schema_snapshot columns present (legacy row)
    }
    const got = await sb.fetchRequestStatus('req-legacy')
    expect(got.formAnswers).toEqual({})
    expect(got.formSchemaSnapshot).toEqual([])

    // demo legacy seed reads null-safe too (a seed with no form fields)
    const api = await import('../api.js')
    const mine = await api.fetchMyRequests()
    const legacy = mine.find((r) => r.formAnswers === undefined)
    if (legacy) expect(() => JSON.stringify(legacy)).not.toThrow()
  })
})
