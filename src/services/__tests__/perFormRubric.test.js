import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { diffWaiverType } from '../api.js'

// ── diffWaiverType: per-form rubric + reference-doc summaries ──────────────────
describe('diffWaiverType — rubric + reference docs', () => {
  const base = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: [], formSchema: [], criteria: [], referenceDocs: [] }

  it('summarizes a rubric change as an active-rule count, not the array', () => {
    const before = { ...base, criteria: [{ id: 'min-gpa', enabled: true }, { id: 'min-attendance', enabled: true }] }
    const after = { ...base, criteria: [{ id: 'min-gpa', enabled: false }, { id: 'min-attendance', enabled: true }] }
    const diff = diffWaiverType(before, after)
    expect(diff).toContainEqual({ entity: 'Waiver: A', field: 'activeRubricRules', from: 2, to: 1 })
    // never dumps the full criteria array
    expect(diff.some((d) => Array.isArray(d.from) || Array.isArray(d.to))).toBe(false)
  })

  it('summarizes reference-doc changes as a count', () => {
    const before = { ...base, referenceDocs: [] }
    const after = { ...base, referenceDocs: [{ id: 'r1', title: 'Policy' }] }
    const diff = diffWaiverType(before, after)
    expect(diff).toContainEqual({ entity: 'Waiver: A', field: 'referenceDocs', from: 0, to: 1 })
  })

  it('no rubric/doc diff for identical inputs', () => {
    const w = { ...base, criteria: [{ id: 'min-gpa', enabled: true }], referenceDocs: [{ id: 'r1' }] }
    expect(diffWaiverType(w, { ...w })).toEqual([])
  })
})

// ── Hoisted Supabase mock (chainable, lazy-resolved builder) ───────────────────
const h = vi.hoisted(() => {
  const state = { waiverRows: [], insertedRequest: null, requestRowToReturn: null }
  function makeBuilder(table) {
    const ctx = { table, op: 'select', columns: '*', filters: {}, payload: null }
    const resolve = () => {
      if (ctx.table === 'waiver_types') {
        if (ctx.op === 'insert') { state.waiverRows.push(ctx.payload); return { data: ctx.payload, error: null } }
        if (ctx.op === 'update') {
          const row = state.waiverRows.find((r) => r.id === ctx.filters.id)
          if (row) Object.assign(row, ctx.payload)
          return { data: row ?? null, error: null }
        }
        let rows = state.waiverRows
        if ('id' in ctx.filters) rows = rows.filter((r) => r.id === ctx.filters.id)
        if ('active' in ctx.filters) rows = rows.filter((r) => r.active === ctx.filters.active)
        if (ctx.single || ctx.maybeSingle) return { data: rows[0] ?? null, error: null }
        return { data: rows, error: null }
      }
      if (ctx.table === 'requests') {
        if (ctx.op === 'insert') { state.insertedRequest = ctx.payload; return { data: state.requestRowToReturn ?? { id: 'req-sb-1', status: 'submitted' }, error: null } }
        if (ctx.single || ctx.maybeSingle) return { data: state.requestRowToReturn ?? null, error: null }
        return { data: state.requestRowToReturn ? [state.requestRowToReturn] : [], error: null }
      }
      return { data: null, error: null }
    }
    const builder = {
      select(cols) { ctx.columns = cols; return builder },
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
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-sb-1', email: 's@x.edu', user_metadata: { name: 'SB' } } } })) },
    from: vi.fn((table) => makeBuilder(table)),
  }
  return { state, mockClient }
})

vi.mock('../../lib/supabase.js', () => ({ isSupabaseConfigured: false, supabase: h.mockClient }))
vi.mock('../../utils/schedulingLogic.js', () => ({
  evaluateAgainstRubric: vi.fn(() => ({ decision: 'review', confidence: 0.5, reason: 'stub', checks: [] })),
  parseTranscriptData: vi.fn(),
}))

import { evaluateAgainstRubric } from '../../utils/schedulingLogic.js'
import { RUBRIC_CRITERIA } from '../mockData.js'

describe('per-form rubric wiring', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear?.()
    h.state.waiverRows = []
    h.state.insertedRequest = null
    h.state.requestRowToReturn = null
    evaluateAgainstRubric.mockClear()
  })
  afterEach(() => { vi.clearAllMocks() })

  // ── Demo path ────────────────────────────────────────────────────────────────
  it('demo: every seeded form carries its own criteria + referenceDocs', async () => {
    const api = await import('../api.js')
    const all = await api.fetchAllWaivers()
    expect(all.length).toBeGreaterThan(0)
    for (const w of all) {
      expect(Array.isArray(w.criteria)).toBe(true)
      expect(w.criteria.length).toBeGreaterThan(0)
      expect(Array.isArray(w.referenceDocs)).toBe(true)
    }
    // The demo medical type tunes its own rubric (min-gpa disabled).
    const medical = all.find((w) => w.id === 'medical-exemption')
    expect(medical.criteria.find((c) => c.id === 'min-gpa').enabled).toBe(false)
  })

  it('demo: submitWaiver scores against the form\'s OWN criteria, not the global set', async () => {
    const api = await import('../api.js')
    // Activate the (seed-inactive) demo form so the open-window gate lets it through;
    // activating doesn't touch its tuned criteria (min-gpa disabled).
    await api.updateWaiverType('medical-exemption', { active: true })
    const medical = (await api.fetchAllWaivers()).find((w) => w.id === 'medical-exemption')
    await api.submitWaiver({
      studentId: 'S-PF1', waiverTypeId: 'medical-exemption', documents: [], courseList: ['Algebra'],
      transcriptData: { gpa: 3.5, studentGrade: 11 }, consentGiven: true,
    })
    expect(evaluateAgainstRubric).toHaveBeenCalled()
    const critArg = evaluateAgainstRubric.mock.calls[0][1]
    expect(critArg).toEqual(medical.criteria)
    // min-gpa is disabled on this form, so it must NOT appear as an enabled rule.
    expect(critArg.find((c) => c.id === 'min-gpa').enabled).toBe(false)
  })

  it('demo: createWaiverType seeds the default rubric; updateWaiverType round-trips criteria + referenceDocs', async () => {
    const api = await import('../api.js')
    const created = await api.createWaiverType({ name: 'Field Trip Consent' })
    expect(created.criteria.length).toBe(RUBRIC_CRITERIA.length)
    expect(created.referenceDocs).toEqual([])

    const nextCriteria = [{ id: 'min-gpa', label: 'Min GPA', type: 'number', value: 3.0, enabled: true }]
    const nextDocs = [{ id: 'r1', title: 'Trip policy', note: 'see p.3' }]
    await api.updateWaiverType(created.id, { criteria: nextCriteria, referenceDocs: nextDocs })
    const reloaded = (await api.fetchAllWaivers()).find((w) => w.id === created.id)
    expect(reloaded.criteria).toEqual(nextCriteria)
    expect(reloaded.referenceDocs).toEqual(nextDocs)
  })

  // ── Supabase path ──────────────────────────────────────────────────────────────
  it('supabase: rowToWaiverType maps criteria + reference_docs (snake→camel)', async () => {
    const sb = await import('../supabaseApi.js')
    h.state.waiverRows = [{
      id: 'medical-exemption', name: 'Medical', description: 'd', active: true,
      required_docs: ['supporting'], form_schema: [],
      criteria: [{ id: 'min-gpa', enabled: false }],
      reference_docs: [{ id: 'r1', title: 'Policy' }],
    }]
    const all = await sb.fetchAllWaivers()
    expect(all[0].criteria).toEqual([{ id: 'min-gpa', enabled: false }])
    expect(all[0].referenceDocs).toEqual([{ id: 'r1', title: 'Policy' }])
  })

  it('supabase: updateWaiverType writes criteria + reference_docs; createWaiverType defaults criteria', async () => {
    const sb = await import('../supabaseApi.js')
    h.state.waiverRows = [{ id: 'x', name: 'X', description: 'd', active: true, required_docs: [], form_schema: [], criteria: [], reference_docs: [] }]
    const crit = [{ id: 'min-gpa', type: 'number', value: 2.0, enabled: true }]
    const docs = [{ id: 'r1', title: 'Policy' }]
    await sb.updateWaiverType('x', { criteria: crit, referenceDocs: docs })
    expect(h.state.waiverRows[0].criteria).toEqual(crit)
    expect(h.state.waiverRows[0].reference_docs).toEqual(docs)
    expect(h.state.waiverRows[0].name).toBe('X') // untouched

    const created = await sb.createWaiverType({ name: 'New Form' })
    expect(created.criteria.length).toBe(RUBRIC_CRITERIA.length)
    expect(created.referenceDocs).toEqual([])
  })

  it('supabase: per-form criteria score the form; empty=[] → manual review; missing → global fallback', async () => {
    const sb = await import('../supabaseApi.js')
    const formCrit = [{ id: 'min-attendance', type: 'number', value: 90, enabled: true }]
    h.state.waiverRows = [
      { id: 'with-crit', name: 'W', active: true, required_docs: [], form_schema: [], criteria: formCrit, reference_docs: [] },
      { id: 'empty-crit', name: 'E', active: true, required_docs: [], form_schema: [], criteria: [], reference_docs: [] },
      // null-crit: no `criteria` key at all (malformed/legacy) → global fallback.
      { id: 'null-crit', name: 'L', active: true, required_docs: [], form_schema: [], reference_docs: [] },
    ]
    const submit = (id) => sb.submitWaiver({ waiverTypeId: id, documents: [], courseList: ['Algebra'], transcriptData: { gpa: 3.5, studentGrade: 11 }, formAnswers: {}, consentGiven: true })

    await submit('with-crit')
    expect(evaluateAgainstRubric.mock.calls[0][1]).toEqual(formCrit)

    evaluateAgainstRubric.mockClear()
    await submit('empty-crit') // deliberately cleared rubric → engine gets [] → review
    expect(evaluateAgainstRubric.mock.calls[0][1]).toEqual([])

    evaluateAgainstRubric.mockClear()
    await submit('null-crit') // missing column → global default
    expect(evaluateAgainstRubric.mock.calls[0][1]).toEqual(RUBRIC_CRITERIA)
  })
})
