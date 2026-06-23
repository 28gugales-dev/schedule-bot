import { describe, it, expect, beforeEach, vi } from 'vitest'
import { aggregateByActor, capabilitiesFor, CAPABILITIES } from '../counselors.js'

// Demo path only (mirrors dataRights.test.js) — the real Supabase branch needs a
// live smoke test.
vi.mock('../../lib/supabase.js', () => ({
  isSupabaseConfigured: false,
  supabase: { from: vi.fn() },
}))

describe('aggregateByActor', () => {
  it('rolls decisions / overrides / config / lastActivity up per actor and skips actorless events', () => {
    const events = [
      { actor: { id: 'a' }, category: 'decision', overrode: true, ts: '2026-06-20T10:00:00Z' },
      { actor: { id: 'a' }, category: 'decision', overrode: false, ts: '2026-06-21T10:00:00Z' },
      { actor: { id: 'a' }, category: 'config', ts: '2026-06-19T10:00:00Z' },
      { actor: { id: 'b' }, category: 'decision', overrode: false, ts: '2026-06-18T10:00:00Z' },
      { actor: null, category: 'decision', ts: '2026-06-18T10:00:00Z' },
    ]
    const m = aggregateByActor(events)
    expect(m.get('a')).toEqual({
      total: 3, decisions: 2, overrides: 1, overrideRate: 50, configChanges: 1,
      lastActivity: '2026-06-21T10:00:00Z',
    })
    expect(m.get('b').overrideRate).toBe(0)
    expect(m.has(undefined)).toBe(false)
  })
})

describe('capabilitiesFor', () => {
  it('admins carry every capability', () => {
    expect(capabilitiesFor('admin')).toHaveLength(CAPABILITIES.length)
  })
  it('finer roles carry a subset', () => {
    expect(capabilitiesFor('counselor')).toEqual(['review', 'audit'])
    expect(capabilitiesFor('registrar')).toContain('batch')
    expect(capabilitiesFor('registrar')).not.toContain('configure')
  })
  it('unknown roles fall back to the counselor grant (never empty)', () => {
    expect(capabilitiesFor('nope')).toEqual(['review', 'audit'])
  })
})

describe('fetchCounselors (demo)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear?.()
  })

  it('builds the roster from audit staff actors — keeping registrar + admin, not just counselors', async () => {
    const { fetchCounselors } = await import('../counselors.js')
    const roster = await fetchCounselors()

    expect(roster.length).toBeGreaterThan(0)
    // Every roster member is staff (no student / ai / system leaks in).
    expect(roster.every((c) => ['counselor', 'registrar', 'admin'].includes(c.role))).toBe(true)
    // The seam: the registrar (Okafor) and admin (Bishop) seed actors survive the
    // filter — proof we did NOT narrow to role === 'counselor'.
    const roles = new Set(roster.map((c) => c.role))
    expect(roles.has('registrar')).toBe(true)
    expect(roles.has('admin')).toBe(true)
  })

  it('enriches each member with capabilities matching their role and sorts busiest-first', async () => {
    const { fetchCounselors } = await import('../counselors.js')
    const roster = await fetchCounselors()

    for (const c of roster) {
      expect(c.capabilities).toEqual(capabilitiesFor(c.role))
      expect(c.stats).toBeDefined()
    }
    // Non-increasing decision counts.
    for (let i = 1; i < roster.length; i++) {
      expect(roster[i - 1].stats.decisions).toBeGreaterThanOrEqual(roster[i].stats.decisions)
    }
  })
})
