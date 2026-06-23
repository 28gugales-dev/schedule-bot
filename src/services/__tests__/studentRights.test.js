import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/supabase.js', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { getUser: vi.fn(async () => ({ data: { user: null } })) }, from: vi.fn() },
}))

// Submit a consented request and return its id (demo path).
async function seedSubmitted(api, studentId) {
  const { requestId } = await api.submitWaiver({
    studentId,
    waiverTypeId: 'medical-exemption',
    documents: [],
    courseList: [],
    consentGiven: true,
    consentVersion: 'ferpa-v1',
  })
  return requestId
}

describe('student rights — demo withdrawRequest / requestRequestDeletion', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear?.()
  })

  it('withdrawRequest flips a submitted request to withdrawn, stamps withdrawnAt, and removes it from the queue', async () => {
    const api = await import('../api.js')
    const id = await seedSubmitted(api, 'S-wd-1')
    expect((await api.fetchReviewQueue()).some((r) => r.id === id)).toBe(true)

    const res = await api.withdrawRequest(id)
    expect(res).toEqual({ ok: true, requestId: id, status: 'withdrawn' })

    const row = (await api.fetchMyRequests()).find((r) => r.id === id)
    expect(row.status).toBe('withdrawn')
    expect(typeof row.withdrawnAt).toBe('string')
    expect(Number.isNaN(Date.parse(row.withdrawnAt))).toBe(false)

    // dropped from the counselor queue (parity with real fetchReviewQueue filter)
    expect((await api.fetchReviewQueue()).some((r) => r.id === id)).toBe(false)
  })

  it('withdrawRequest is a no-op on an already-decided (approved) request — status stays approved', async () => {
    const api = await import('../api.js')
    const id = await seedSubmitted(api, 'S-wd-2')
    await api.submitDecision(id, 'admit', 'ok')

    const res = await api.withdrawRequest(id)
    expect(res).toEqual({ ok: true, requestId: id, status: 'withdrawn' })

    const row = (await api.fetchMyRequests()).find((r) => r.id === id)
    expect(row.status).toBe('approved') // unchanged — submitted-only guard
    expect(row.withdrawnAt).toBeUndefined()
  })

  it('requestRequestDeletion stamps deletionRequestedAt and never changes status', async () => {
    const api = await import('../api.js')
    const id = await seedSubmitted(api, 'S-del-1')
    await api.submitDecision(id, 'admit', 'ok')

    const res = await api.requestRequestDeletion(id)
    expect(res).toEqual({ ok: true, requestId: id })

    const row = (await api.fetchMyRequests()).find((r) => r.id === id)
    expect(typeof row.deletionRequestedAt).toBe('string')
    expect(row.status).toBe('approved')
  })

  it('requestRequestDeletion on a still-submitted request stamps the flag without changing status', async () => {
    const api = await import('../api.js')
    const id = await seedSubmitted(api, 'S-del-2')

    await api.requestRequestDeletion(id)
    const row = (await api.fetchMyRequests()).find((r) => r.id === id)
    expect(typeof row.deletionRequestedAt).toBe('string')
    // status is derived for non-terminal rows; the stored status is still 'submitted'
    // so it must not have become a terminal/withdrawn value.
    expect(['submitted', 'automated-review', 'counselor-review']).toContain(row.status)
  })
})
