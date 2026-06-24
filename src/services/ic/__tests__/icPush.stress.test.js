// Stress test for the Infinite Campus push pipeline.
//
// SCOPE (honest, per design spec §9): this proves OUR internal pipeline is correct
// against a SIMULATED IC (mockIcAdapter) — the push-state machine, drift/supersede
// guard, partial-import handling, idempotent retry (no double-enroll), the FERPA
// field allowlist, the OneRoster CSV artifact, and the claim_seat atomicity
// CONTRACT. It does NOT prove the real IC contract (exact column acceptance,
// sourcedId matching, inbound ingest) — that needs a district sandbox.
import { describe, it, expect } from 'vitest'
import {
  advance, isTerminal, STATES, runPushPipeline, makeOneRosterCsvDeltaAdapter, makeManualUiExportAdapter,
} from '../transportAdapter.js'
import { makeMockIcAdapter } from '../mockIcAdapter.js'
import {
  minimizeStudentPull, findProhibitedFields, ENROLLMENT_PUSH_FIELDS, PROHIBITED_RAW_FIELDS,
} from '../fieldAllowlist.js'
import { buildOneRosterDeltaPackage, enrollmentSourcedId } from '../oneRosterCsv.js'

const NOW = '2026-06-24T12:00:00.000Z'

function rec(i, over = {}) {
  return {
    idempotencyKey: `req-${i}`,
    action: 'add',
    userSourcedId: `u${i}`,
    classSourcedId: `c${i}`,
    schoolSourcedId: 'sch1',
    ...over,
  }
}
const finalState = (transitions, key) => transitions.filter((t) => t.idempotencyKey === key).at(-1)?.to

// ── 1. Push-state machine ─────────────────────────────────────────────────────
describe('push-state machine', () => {
  it('allows only legal transitions', () => {
    expect(advance(STATES.QUEUED, STATES.CLAIMED)).toBe('claimed')
    expect(advance(STATES.CLAIMED, STATES.EXPORTED)).toBe('exported')
    expect(advance(STATES.EXPORTED, STATES.CONFIRMED)).toBe('confirmed')
    expect(advance(STATES.FAILED, STATES.QUEUED)).toBe('queued') // retry
  })

  it('rejects illegal jumps and resurrection of terminal states', () => {
    expect(() => advance(STATES.QUEUED, STATES.CONFIRMED)).toThrow(/illegal/)   // can't skip the pipeline
    expect(() => advance(STATES.SUPERSEDED, STATES.QUEUED)).toThrow(/illegal/)  // superseded is terminal
    expect(() => advance(STATES.CONFIRMED, STATES.EXPORTED)).toThrow(/illegal/) // confirmed is terminal
    expect(() => advance('bogus', STATES.QUEUED)).toThrow(/unknown/)
  })

  it('marks confirmed and superseded terminal', () => {
    expect(isTerminal(STATES.CONFIRMED)).toBe(true)
    expect(isTerminal(STATES.SUPERSEDED)).toBe(true)
    expect(isTerminal(STATES.QUEUED)).toBe(false)
  })
})

// ── 2. Drift / supersede guard ────────────────────────────────────────────────
describe('drift guard', () => {
  it('supersedes a record whose decision flipped on re-validation, never pushing it', async () => {
    const mock = makeMockIcAdapter()
    const records = [rec(1), rec(2), rec(3)]
    const drifted = new Set(['req-2']) // IC moved under the snapshot for req-2
    const { transitions } = await runPushPipeline(records, {
      adapter: mock, now: NOW,
      revalidate: (r) => ({ decision: drifted.has(r.idempotencyKey) ? 'deny' : 'admit', reason: 'fresh pull' }),
    })
    expect(finalState(transitions, 'req-2')).toBe('superseded')
    expect(finalState(transitions, 'req-1')).toBe('confirmed')
    // The superseded record must NOT have been enrolled at IC.
    expect(mock._sim.isEnrolled(enrollmentSourcedId('u2', 'c2'))).toBe(false)
    expect(mock._sim.isEnrolled(enrollmentSourcedId('u1', 'c1'))).toBe(true)
  })

  it('carries the REAL verdict (review vs deny) into the supersede transition', async () => {
    const mock = makeMockIcAdapter()
    const { transitions } = await runPushPipeline([rec(1), rec(2)], {
      adapter: mock, now: NOW,
      revalidate: (r) => r.idempotencyKey === 'req-1'
        ? { decision: 'review', reason: 'GPA now borderline' }
        : { decision: 'admit' },
    })
    const t = transitions.find((x) => x.idempotencyKey === 'req-1' && x.to === 'superseded')
    expect(t.decision).toBe('review') // NOT hardcoded 'deny' — audit must be truthful
  })

  it('treats a revalidation ERROR as failed (retryable), never a terminal supersede', async () => {
    const mock = makeMockIcAdapter()
    const { transitions } = await runPushPipeline([rec(1)], {
      adapter: mock, now: NOW,
      revalidate: () => ({ error: true, reason: 'revalidation crashed' }),
    })
    expect(finalState(transitions, 'req-1')).toBe('failed') // retryable, NOT superseded
    expect(mock._sim.isEnrolled(enrollmentSourcedId('u1', 'c1'))).toBe(false)
  })
})

// ── 2b. Manual UI export adapter (the production DEFAULT) ──────────────────────
describe('manual_ui_export adapter (default transport)', () => {
  it('builds a sourcedId-FREE worklist and lands records in imported (not confirmed)', async () => {
    const adapter = makeManualUiExportAdapter({ worklistUrl: 'signed://x' })
    // records have NO IC sourcedIds — the unmapped/demo case that the delta path skips
    const records = [
      { idempotencyKey: 'r1', studentName: 'Ana Diaz', fromCourse: 'Algebra II', toCourse: 'Precalc' },
      { idempotencyKey: 'r2', studentName: 'Ben Cho', fromCourse: 'Bio', toCourse: 'AP Bio' },
    ]
    const { transitions, artifact } = await runPushPipeline(records, {
      adapter, now: NOW, revalidate: () => ({ decision: 'admit' }),
    })
    // forward progress despite null sourcedIds — both reach 'imported', none loop/fail
    expect(finalState(transitions, 'r1')).toBe('imported')
    expect(finalState(transitions, 'r2')).toBe('imported')
    expect(artifact.files['worklist.csv']).toContain('Ana Diaz')
    expect(artifact.files['worklist.csv']).toContain('Precalc')
    expect(artifact.skipped).toEqual([])
  })

  it('neutralizes spreadsheet formula injection in worklist free-text', async () => {
    const adapter = makeManualUiExportAdapter()
    const { artifact } = await runPushPipeline(
      [{ idempotencyKey: 'r1', studentName: '=cmd|calc', fromCourse: 'A', toCourse: 'B' }],
      { adapter, now: NOW, revalidate: () => ({ decision: 'admit' }) },
    )
    expect(artifact.files['worklist.csv']).toContain("'=cmd") // apostrophe-prefixed, inert
  })
})

// ── 3. Partial-import failure + idempotent retry ──────────────────────────────
describe('partial import + idempotent retry', () => {
  it('confirms good rows, fails rejected rows, and never double-enrolls on retry', async () => {
    const failOnce = enrollmentSourcedId('u2', 'c2')
    const mock = makeMockIcAdapter({ failSourcedIds: [failOnce] })
    const records = [rec(1), rec(2), rec(3)]
    const revalidate = () => ({ decision: 'admit', reason: 'ok' })

    const run1 = await runPushPipeline(records, { adapter: mock, now: NOW, revalidate })
    expect(finalState(run1.transitions, 'req-1')).toBe('confirmed')
    expect(finalState(run1.transitions, 'req-2')).toBe('failed')
    expect(finalState(run1.transitions, 'req-3')).toBe('confirmed')
    expect(mock._sim.enrolledCount()).toBe(2)
    expect(mock._sim.applyCount(enrollmentSourcedId('u1', 'c1'))).toBe(1)

    // Retry the failed record against a now-healthy IC (failSet cleared).
    const mock2 = makeMockIcAdapter() // healthy
    // carry forward the already-confirmed enrollments to prove re-push is idempotent
    await mock2.deliver(mock2.buildArtifact([rec(1), rec(3)], { now: NOW }))
    const run2 = await runPushPipeline([rec(2)], { adapter: mock2, now: NOW, revalidate })
    expect(finalState(run2.transitions, 'req-2')).toBe('confirmed')

    // Re-pushing an ALREADY-confirmed record applies at IC at most once.
    await runPushPipeline([rec(1)], { adapter: mock2, now: NOW, revalidate })
    expect(mock2._sim.applyCount(enrollmentSourcedId('u1', 'c1'))).toBe(1)
  })

  it('holds the whole batch on an IC threshold pause (retryable)', async () => {
    const mock = makeMockIcAdapter({ thresholdRows: 2 })
    const records = [rec(1), rec(2), rec(3)] // 3 > threshold 2
    const { transitions } = await runPushPipeline(records, {
      adapter: mock, now: NOW, revalidate: () => ({ decision: 'admit' }),
    })
    expect(['req-1', 'req-2', 'req-3'].every((k) => finalState(transitions, k) === 'failed')).toBe(true)
    expect(mock._sim.enrolledCount()).toBe(0)        // nothing committed
    expect(mock._sim.pauseCount()).toBe(1)
  })
})

// ── 4. FERPA field allowlist (data minimization) ──────────────────────────────
describe('FERPA field allowlist', () => {
  const rawFromIc = {
    sisId: 'u1', schoolSourcedId: 'sch1', gpa: 3.4, attendanceRate: 96,
    gradeLevel: 11, enrollmentStatus: 'active', lastSync: NOW,
    completedCourses: [{ name: 'English 9', grade: 'A', gradeYear: 9, term: '2023-24', secretFlag: 'x' }],
    currentSchedule: [{ course: 'English 11', period: 2, classSourcedId: 'c1' }],
    // prohibited demographics IC may return:
    birthDate: '2008-05-01', gender: 'F', race: 'declined', address: '1 Main St',
    agents: [{ name: 'Parent', phone: '555' }],
  }

  it('persists only allowlisted fields and strips prohibited ones', () => {
    const min = minimizeStudentPull(rawFromIc)
    expect(min.gpa).toBe(3.4)
    expect(min.gradeLevel).toBe(11)
    expect(min).not.toHaveProperty('birthDate')
    expect(min).not.toHaveProperty('gender')
    expect(min).not.toHaveProperty('race')
    expect(min).not.toHaveProperty('address')
    expect(min).not.toHaveProperty('agents')
    // nested junk inside completedCourses is also dropped (re-minimized, not spread)
    expect(min.completedCourses[0]).not.toHaveProperty('secretFlag')
    expect(min.completedCourses[0]).toEqual({ name: 'English 9', grade: 'A', gradeYear: 9, term: '2023-24' })
  })

  it('tripwire flags prohibited fields anywhere in the raw graph', () => {
    const hits = findProhibitedFields(rawFromIc)
    expect(hits).toEqual(expect.arrayContaining(['birthDate', 'gender', 'race', 'address', 'agents']))
  })

  it('the enrollment push artifact carries no demographic field', () => {
    const overlap = ENROLLMENT_PUSH_FIELDS.filter((f) =>
      PROHIBITED_RAW_FIELDS.some((p) => p.toLowerCase() === f.toLowerCase()))
    expect(overlap).toEqual([])
  })
})

// ── 5. OneRoster CSV artifact ─────────────────────────────────────────────────
describe('OneRoster delta CSV', () => {
  it('emits correct headers, manifest, and active/tobedeleted status', () => {
    const pkg = buildOneRosterDeltaPackage(
      [{ idempotencyKey: 'a', action: 'add', userSourcedId: 'u1', classSourcedId: 'c9', schoolSourcedId: 'sch1' },
       { idempotencyKey: 'b', action: 'drop', userSourcedId: 'u1', classSourcedId: 'c1', schoolSourcedId: 'sch1' }],
      { now: NOW, version: '1.1' },
    )
    const lines = pkg.files['enrollments.csv'].trim().split('\r\n')
    expect(lines[0]).toBe('sourcedId,status,dateLastModified,classSourcedId,schoolSourcedId,userSourcedId,role,primary,beginDate,endDate')
    expect(lines[1]).toContain('active')
    expect(lines[2]).toContain('tobedeleted')
    expect(lines[1]).toContain('student')
    expect(pkg.files['manifest.csv']).toContain('file.enrollments,delta')
    expect(pkg.files['manifest.csv']).toContain('oneroster.version,1.1')
    expect(pkg.skipped).toEqual([])
  })

  it('REFUSES to emit a row with null IC sourcedIds and reports it as skipped', () => {
    const pkg = buildOneRosterDeltaPackage(
      [{ idempotencyKey: 'x', action: 'add', userSourcedId: null, classSourcedId: null, schoolSourcedId: null }],
      { now: NOW },
    )
    expect(pkg.recordRefs).toEqual([])
    expect(pkg.skipped).toHaveLength(1)
    expect(pkg.skipped[0].reason).toMatch(/missing IC keys/)
    // a skipped record drives the pipeline to FAIL it (→ route to manual_ui_export)
  })

  it('strips illegal characters from sourcedIds (CSV-injection / charset safety)', () => {
    const pkg = buildOneRosterDeltaPackage(
      [{ idempotencyKey: 'q', action: 'add', userSourcedId: 'u1', classSourcedId: 'c,1"x', schoolSourcedId: 'sch1' }],
      { now: NOW },
    )
    // OneRoster sourcedId charset forbids comma/quote; sanitize removes them BEFORE
    // CSV assembly, so no injection and nothing to quote. classSourcedId 'c,1"x' -> 'c1x'.
    expect(pkg.files['enrollments.csv']).toContain('c1x')
    expect(pkg.files['enrollments.csv']).not.toContain('c,1')
    expect(pkg.files['enrollments.csv']).not.toContain('"x')
  })

  it('the csv-delta adapter honestly reports an unconfigured transport (no fake push)', async () => {
    const adapter = makeOneRosterCsvDeltaAdapter({}) // no transport injected
    const records = [rec(1)]
    const { transitions } = await runPushPipeline(records, {
      adapter, now: NOW, revalidate: () => ({ decision: 'admit' }),
    })
    expect(finalState(transitions, 'req-1')).toBe('failed') // delivery unconfigured -> failed, retryable
  })
})

// ── 6. Concurrency: claim_seat atomicity CONTRACT (models the RPC) ─────────────
// The real guarantee lives in Postgres (pg_advisory_xact_lock in claim_seat,
// migration 0011). vitest can't run Postgres, so this models the contract: a naive
// check-then-act over-allocates the last seat; a serialized one (modeling the
// advisory lock) never exceeds capacity. Proves WHY the lock is required and that
// the intended invariant holds.
describe('claim_seat atomicity contract (models the RPC)', () => {
  const CAPACITY = 1 // one seat left

  async function naiveClaim(state) {
    const enrolled = state.count            // read
    await Promise.resolve()                 // yield — interleave point
    if (enrolled < CAPACITY) { state.count += 1; return true }
    return false
  }

  function makeSerialized() {
    let chain = Promise.resolve()
    const state = { count: 0 }
    return (fn) => (chain = chain.then(() => fn(state))) // advisory-lock analog
  }

  it('naive check-then-act OVER-allocates the last seat under concurrency', async () => {
    const state = { count: 0 }
    const results = await Promise.all([naiveClaim(state), naiveClaim(state), naiveClaim(state)])
    expect(results.filter(Boolean).length).toBeGreaterThan(CAPACITY) // bug demonstrated
  })

  it('serialized claim (advisory-lock model) never exceeds capacity', async () => {
    const lock = makeSerialized()
    const claim = (state) => {
      const enrolled = state.count
      if (enrolled < CAPACITY) { state.count += 1; return true }
      return false
    }
    const results = await Promise.all([lock(claim), lock(claim), lock(claim), lock(claim)])
    expect(results.filter(Boolean).length).toBe(CAPACITY) // exactly one winner
  })
})
