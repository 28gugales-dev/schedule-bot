import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase row-mapper round-trip (audit.js toRow/fromRow, toAiRow/fromAiRow).
// The mappers are module-private, so we exercise them through the public API in
// the Supabase branch: recordAuditEvent → toRow → insert (captured) and
// fetchAuditLog → select (returns the captured row) → fromRow. A fully-populated
// fixture (every field non-null) makes the round-trip exact equality — the
// fromRow/fromAiRow null-coalescing defaults (diff??[], !!overrode, note??'',
// checks??[]) only bite on null inputs, which a full fixture avoids. ───────────
const h = vi.hoisted(() => {
  const state = { auditRow: null, aiRow: null }
  function makeBuilder(table) {
    const ctx = { table, op: 'select', payload: null }
    const resolve = () => {
      if (ctx.op === 'insert') {
        if (ctx.table === 'audit_log') state.auditRow = ctx.payload
        if (ctx.table === 'ai_decisions') state.aiRow = ctx.payload
        return { data: null, error: null }
      }
      if (ctx.table === 'audit_log') return { data: state.auditRow ? [state.auditRow] : [], error: null }
      if (ctx.table === 'ai_decisions') return { data: state.aiRow ? [state.aiRow] : [], error: null }
      return { data: [], error: null }
    }
    const builder = {
      select() { return builder },
      insert(p) { ctx.op = 'insert'; ctx.payload = p; return Promise.resolve(resolve()) },
      then(onF, onR) { return Promise.resolve(resolve()).then(onF, onR) },
    }
    return builder
  }
  const mockClient = { from: vi.fn((table) => makeBuilder(table)) }
  return { state, mockClient }
})

vi.mock('../../lib/supabase.js', () => ({ isSupabaseConfigured: true, supabase: h.mockClient }))

import { recordAuditEvent, recordAiDecision, fetchAuditLog, fetchAiDecisions } from '../audit.js'

beforeEach(() => {
  h.state.auditRow = null
  h.state.aiRow = null
  vi.clearAllMocks()
})

describe('audit_log row mapper round-trip (toRow ↔ fromRow)', () => {
  it('preserves all 16 app-shape fields through insert + read', async () => {
    const full = {
      id: 'evt-fixed-1',
      ts: '2026-06-23T12:00:00.000Z',
      action: 'decision.admit',
      category: 'decision',
      actor: { id: 'staff-1', name: 'M. Alvarez', role: 'counselor' },
      device: { id: 'dev-1', label: 'Chrome · Windows', ua: 'Mozilla/5.0' },
      student: { id: 'stu-1', name: 'Demo Student' },
      requestId: 'req-1',
      waiverTypeId: 'medical-exemption',
      summary: 'Admitted the request',
      before: { status: 'submitted' },
      after: { status: 'approved', synced: true },
      diff: [{ entity: 'Request', field: 'status', from: 'submitted', to: 'approved' }],
      aiDecisionId: 'ai-1',
      overrode: true,
      note: 'manual override after review',
    }

    const recorded = await recordAuditEvent(full)
    // toRow ran during insert → snake_case row captured.
    expect(h.state.auditRow.request_id).toBe('req-1')
    expect(h.state.auditRow.waiver_type_id).toBe('medical-exemption')
    expect(h.state.auditRow.before_state).toEqual(full.before)
    expect(h.state.auditRow.after_state).toEqual(full.after)
    expect(h.state.auditRow.ai_decision_id).toBe('ai-1')

    // fromRow on the same row → back to the original app shape.
    const [readBack] = await fetchAuditLog()
    for (const k of Object.keys(full)) {
      expect(readBack[k]).toEqual(recorded[k])
      expect(readBack[k]).toEqual(full[k])
    }
  })
})

describe('ai_decisions row mapper round-trip (toAiRow ↔ fromAiRow)', () => {
  it('preserves all 12 app-shape fields through insert + read', async () => {
    const full = {
      id: 'ai-fixed-1',
      ts: '2026-06-23T12:30:00.000Z',
      requestId: 'req-1',
      student: { id: 'stu-1', name: 'Demo Student' },
      waiverTypeId: 'medical-exemption',
      evaluator: 'rubric-eval-v1',
      decision: 'admit',
      confidence: 0.87,
      rationale: 'Meets GPA and attendance thresholds',
      checks: [{ id: 'gpa', label: 'GPA', passed: true, weight: 0.5, contribution: 0.4, reasoning: 'ok' }],
      scoreBreakdown: { base: 0.5, items: [{ label: 'GPA', delta: 0.37 }] },
      inputsSnapshot: { gpa: 3.9, attendance: 0.98 },
    }

    const recorded = await recordAiDecision(full)
    expect(h.state.aiRow.request_id).toBe('req-1')
    expect(h.state.aiRow.waiver_type_id).toBe('medical-exemption')
    expect(h.state.aiRow.score_breakdown).toEqual(full.scoreBreakdown)
    expect(h.state.aiRow.inputs_snapshot).toEqual(full.inputsSnapshot)

    const [readBack] = await fetchAiDecisions()
    for (const k of Object.keys(full)) {
      expect(readBack[k]).toEqual(recorded[k])
      expect(readBack[k]).toEqual(full[k])
    }
  })
})
