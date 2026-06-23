import { describe, it, expect, vi, beforeEach } from 'vitest'

// Demo path only — vitest never exercises the real Supabase branch (those need a
// live smoke test). Mirrors studentRights.test.js.
vi.mock('../../lib/supabase.js', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { getUser: vi.fn(async () => ({ data: { user: null } })) }, from: vi.fn() },
}))

// Submit a consented request for a given student and return its id (demo path).
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

describe('data rights — demo export / deletion', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear?.()
  })

  it('exportStudentData returns a bundle scoped to that student', async () => {
    const api = await import('../api.js')
    const id = await seedSubmitted(api, 'S-exp-1')
    await seedSubmitted(api, 'S-exp-2')

    const out = await api.exportStudentData('S-exp-1')
    expect(out.subject).toBe('S-exp-1')
    expect(out.requests.some((r) => r.id === id)).toBe(true)
    expect(out.requests.every((r) => r.studentId === 'S-exp-1')).toBe(true)
  })

  it('exportMyData returns a timestamped bundle with a requests array', async () => {
    const api = await import('../api.js')
    await seedSubmitted(api, 'S-exp-3')

    const out = await api.exportMyData()
    expect(Array.isArray(out.requests)).toBe(true)
    expect(Number.isNaN(Date.parse(out.exportedAt))).toBe(false)
  })

  it('deleteStudentData removes every one of a student\'s requests', async () => {
    const api = await import('../api.js')
    const id = await seedSubmitted(api, 'S-del-A')
    expect((await api.fetchMyRequests()).some((r) => r.id === id)).toBe(true)

    const res = await api.deleteStudentData('S-del-A')
    expect(res).toEqual({ ok: true, studentId: 'S-del-A' })
    expect((await api.fetchMyRequests()).some((r) => r.id === id)).toBe(false)
  })

  it('deleteRequest removes a single request and drops it from the queue', async () => {
    const api = await import('../api.js')
    const id = await seedSubmitted(api, 'S-del-B')

    const res = await api.deleteRequest(id)
    expect(res).toEqual({ ok: true, requestId: id })
    expect((await api.fetchMyRequests()).some((r) => r.id === id)).toBe(false)
    expect((await api.fetchReviewQueue()).some((r) => r.id === id)).toBe(false)
  })
})
