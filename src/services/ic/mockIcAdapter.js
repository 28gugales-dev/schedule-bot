// Simulated Infinite Campus for the stress test. NOT a production adapter — it
// stands in for a real district's IC so the internal push-state machine,
// idempotency, partial-import handling, and threshold-pause behavior can be proven
// without (and before) a live IC sandbox. The honest-scope boundary: passing the
// stress test proves OUR pipeline is correct against THIS simulation, not that the
// real IC contract holds (see design spec §9).
//
// It mirrors the real IC behaviors Phase-1 research established:
//   - per-row partial success (some rows commit, some are rejected)
//   - a magnitude-based threshold PAUSE that holds the whole batch (all-or-nothing)
//   - no double-apply: re-delivering an already-enrolled sourcedId is idempotent
//     (IC would report the enrollment already exists, not create a second one)

import { buildOneRosterDeltaPackage } from './oneRosterCsv.js'
import { STATES } from './transportAdapter.js'

// opts:
//   failSourcedIds: string[]  — sourcedIds IC will reject (e.g. seat full at IC)
//   thresholdRows:  number    — if a delivery exceeds this many rows, IC pauses it
export function makeMockIcAdapter(opts = {}) {
  const failSet = new Set(opts.failSourcedIds ?? [])
  const thresholdRows = opts.thresholdRows ?? Infinity

  // Simulated IC server state.
  const enrolled = new Set()          // sourcedIds currently enrolled in IC
  const applyCount = new Map()        // sourcedId -> times IC actually applied it
  let pauseCount = 0

  const adapter = {
    mode: 'mock',
    buildArtifact: (records, o) =>
      buildOneRosterDeltaPackage(records.map((r) => ({
        idempotencyKey: r.idempotencyKey,
        action: r.action ?? 'add',
        userSourcedId: r.userSourcedId,
        classSourcedId: r.classSourcedId,
        schoolSourcedId: r.schoolSourcedId,
      })), { now: o?.now, version: '1.1' }),

    async deliver(artifact) {
      const refs = artifact?.recordRefs ?? []

      // Threshold pause: magnitude exceeds config → whole batch held (retryable).
      if (refs.length > thresholdRows) {
        pauseCount += 1
        return { mode: 'mock', ok: false, reason: 'threshold_pause', perRecord: [] }
      }

      const perRecord = refs.map((ref) => {
        if (failSet.has(ref.sourcedId)) return { sourcedId: ref.sourcedId, ok: false, reason: 'IC rejected (seat full / conflict)' }
        // Idempotent apply: only the FIRST successful delivery enrolls; a retry of
        // an already-enrolled sourcedId is acknowledged without a second apply.
        if (ref.status === 'tobedeleted') {
          enrolled.delete(ref.sourcedId)
          return { sourcedId: ref.sourcedId, ok: true, reason: 'dropped' }
        }
        if (!enrolled.has(ref.sourcedId)) {
          enrolled.add(ref.sourcedId)
          applyCount.set(ref.sourcedId, (applyCount.get(ref.sourcedId) ?? 0) + 1)
          return { sourcedId: ref.sourcedId, ok: true, reason: 'enrolled' }
        }
        return { sourcedId: ref.sourcedId, ok: true, reason: 'already enrolled (idempotent)' }
      })
      return { mode: 'mock', ok: true, perRecord }
    },

    ingestResult(deliverResult, artifact) {
      if (!deliverResult?.ok) {
        return (artifact?.recordRefs ?? []).map((ref) => ({ idempotencyKey: ref.idempotencyKey, state: STATES.FAILED, reason: deliverResult?.reason ?? 'delivery failed' }))
      }
      const bySourced = new Map((deliverResult.perRecord ?? []).map((p) => [p.sourcedId, p]))
      return (artifact?.recordRefs ?? []).map((ref) => {
        const p = bySourced.get(ref.sourcedId)
        return { idempotencyKey: ref.idempotencyKey, state: p?.ok ? STATES.CONFIRMED : STATES.FAILED, reason: p?.reason }
      })
    },

    // Test introspection (not part of the TransportAdapter contract).
    _sim: {
      isEnrolled: (sourcedId) => enrolled.has(sourcedId),
      applyCount: (sourcedId) => applyCount.get(sourcedId) ?? 0,
      enrolledCount: () => enrolled.size,
      pauseCount: () => pauseCount,
    },
  }
  return adapter
}
