import { describe, it, expect, vi, beforeEach } from 'vitest'

// Keep api.js on the demo path; give supabaseApi.js a non-null client so its
// module import never throws (it's pulled in transitively).
vi.mock('../../lib/supabase.js', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { getUser: vi.fn(async () => ({ data: { user: null } })) }, from: vi.fn() },
}))

describe('FERPA consent gate (demo submitWaiver)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear?.()
  })

  it('rejects a submit with consentGiven omitted and does NOT append a request', async () => {
    const api = await import('../api.js')
    const before = (await api.fetchMyRequests()).length
    await expect(
      api.submitWaiver({ studentId: 'S-consent-1', waiverTypeId: 'medical-exemption', documents: [], courseList: [] }),
    ).rejects.toThrow('Consent to the FERPA disclosure is required before submitting.')
    const after = (await api.fetchMyRequests()).length
    expect(after).toBe(before)
  })

  it('rejects a submit with consentGiven:false', async () => {
    const api = await import('../api.js')
    await expect(
      api.submitWaiver({ studentId: 'S-consent-2', waiverTypeId: 'medical-exemption', documents: [], courseList: [], consentGiven: false }),
    ).rejects.toThrow('Consent to the FERPA disclosure is required before submitting.')
  })

  it('accepts consentGiven:true and persists consentGivenAt + consentVersion', async () => {
    const api = await import('../api.js')
    const { requestId } = await api.submitWaiver({
      studentId: 'S-consent-3',
      waiverTypeId: 'medical-exemption',
      documents: [],
      courseList: [],
      consentGiven: true,
      consentVersion: 'ferpa-v1',
    })
    const row = (await api.fetchMyRequests()).find((r) => r.id === requestId)
    expect(typeof row.consentGivenAt).toBe('string')
    expect(Number.isNaN(Date.parse(row.consentGivenAt))).toBe(false)
    expect(row.consentVersion).toBe('ferpa-v1')
  })

  it('passes the client-supplied consentVersion straight through (no hardcoded version in the service)', async () => {
    const api = await import('../api.js')
    const { requestId } = await api.submitWaiver({
      studentId: 'S-consent-4',
      waiverTypeId: 'medical-exemption',
      documents: [],
      courseList: [],
      consentGiven: true,
      consentVersion: 'ferpa-v99',
    })
    const row = (await api.fetchMyRequests()).find((r) => r.id === requestId)
    expect(row.consentVersion).toBe('ferpa-v99')
  })
})
