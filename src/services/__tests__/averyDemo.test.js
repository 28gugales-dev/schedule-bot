import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AVERY_REQUEST_ID, AVERY_STUDENT_ID } from '../demoSeed.js'

// Demo mode (no Supabase) — Avery Mitchell is the hardcoded demo student.
vi.mock('../../lib/supabase.js', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { getUser: vi.fn(async () => ({ data: { user: null } })) }, from: vi.fn() },
}))

describe('Avery Mitchell demo record — deciding her is audited and never makes her disappear', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear?.()
  })

  it('is seeded into the review queue and is reachable by global search while pending', async () => {
    const api = await import('../api.js')
    const queue = await api.fetchReviewQueue()
    expect(queue.some((r) => r.id === AVERY_REQUEST_ID)).toBe(true)

    const hits = await api.searchStudents('avery')
    expect(hits.some((s) => s.id === AVERY_STUDENT_ID)).toBe(true)
  })

  it('admitting her writes a decision.admit audit entry, leaves the queue, stays in search + record', async () => {
    const api = await import('../api.js')
    const audit = await import('../audit.js')

    await api.submitDecision(AVERY_REQUEST_ID, 'admit', 'Looks good')

    // 1. Audit / counselor decisions: a decision.admit event exists for her.
    const log = await audit.fetchAuditLog()
    const entry = log.find((e) => e.requestId === AVERY_REQUEST_ID && e.action === 'decision.admit')
    expect(entry).toBeTruthy()
    expect(entry.student?.id).toBe(AVERY_STUDENT_ID)

    // 2. She leaves the pending queue (decided).
    const queue = await api.fetchReviewQueue()
    expect(queue.some((r) => r.id === AVERY_REQUEST_ID)).toBe(false)

    // 3. She does NOT disappear — still in global search.
    const hits = await api.searchStudents('avery')
    expect(hits.some((s) => s.id === AVERY_STUDENT_ID)).toBe(true)

    // 4. Her record shows the approved decision.
    const record = await api.fetchStudentRecord(AVERY_STUDENT_ID)
    expect(record.requests.some((r) => r.status === 'approved')).toBe(true)
  })
})
