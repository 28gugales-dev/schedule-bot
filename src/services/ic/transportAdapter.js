// Transport abstraction for pushing schedule decisions to Infinite Campus, plus
// the push-state machine and the orchestration pipeline that drives a batch of
// approved records from `queued` to a terminal state.
//
// WHY AN ABSTRACTION: Phase-1 research could not confirm which inbound mechanism a
// given district's IC accepts (OneRoster delta ingest vs strictly UI/API section
// placement — see the design spec §1). So the concrete delivery is a swappable
// leaf; the entire pipeline (revalidate → build → deliver → ingest → transition)
// is identical regardless. This file + oneRosterCsv.js + fieldAllowlist.js are the
// TESTED reference implementation; the edge function is a thin Deno wrapper over
// the same logic. The stress test exercises THIS pipeline against mockIcAdapter.

import { buildOneRosterDeltaPackage, buildManualWorklist } from './oneRosterCsv.js'

// ── Push-state machine ───────────────────────────────────────────────────────
// Mirrors the check constraint in migration 0009. Forward-only except failed→queued.
export const STATES = Object.freeze({
  QUEUED: 'queued', CLAIMED: 'claimed', EXPORTED: 'exported', IMPORTED: 'imported',
  CONFIRMED: 'confirmed', FAILED: 'failed', SUPERSEDED: 'superseded',
})

const TRANSITIONS = Object.freeze({
  queued:    ['claimed'],
  claimed:   ['exported', 'superseded', 'failed'],
  exported:  ['imported', 'confirmed', 'failed'],
  imported:  ['confirmed', 'failed'],
  failed:    ['queued'],          // retry
  confirmed: [],                  // terminal
  superseded: [],                 // terminal
})

// Throws on an illegal transition — the stress test relies on this to prove the
// machine can never, e.g., jump queued→confirmed or resurrect a superseded record.
export function advance(from, to) {
  const allowed = TRANSITIONS[from]
  if (!allowed) throw new Error(`unknown push_state '${from}'`)
  if (!allowed.includes(to)) throw new Error(`illegal push_state transition ${from} -> ${to}`)
  return to
}

export function isTerminal(state) {
  return TRANSITIONS[state] && TRANSITIONS[state].length === 0
}

// ── Orchestration pipeline ───────────────────────────────────────────────────
// records: queue rows, each { idempotencyKey, action, userSourcedId, classSourcedId,
//          schoolSourcedId, requestId, ruleVersion, ... } in state 'queued'.
// deps:
//   adapter        — { mode, buildArtifact, deliver, ingestResult }
//   revalidate     — async (record) => { decision: 'admit'|'deny'|'review', reason, error? }
//                    Re-checks the record against a FRESH pull. `error: true` means
//                    revalidation itself FAILED (not a verdict) — handled distinctly.
//   now            — ISO8601 string (injected for determinism)
// Returns { transitions: [{ idempotencyKey, from, to, reason, decision }], artifact, deliverResult }.
export async function runPushPipeline(records, { adapter, revalidate, now } = {}) {
  const transitions = []
  const proceed = []

  // 1. Re-validate against a FRESH pull. Three outcomes, kept DISTINCT so an
  //    internal error can never masquerade as a policy decision in the audit:
  //      - admit            -> proceed to push
  //      - deny / review    -> superseded (terminal), carrying the REAL verdict
  //      - error (threw)    -> failed (RETRYABLE) — never a terminal supersede
  for (const r of records ?? []) {
    advance(STATES.QUEUED, STATES.CLAIMED)
    const verdict = await revalidate(r)
    if (verdict?.error) {
      transitions.push({ idempotencyKey: r.idempotencyKey, from: STATES.CLAIMED, to: advance(STATES.CLAIMED, STATES.FAILED), reason: verdict.reason ?? 'revalidation_error', decision: null })
    } else if (!verdict || verdict.decision !== 'admit') {
      transitions.push({ idempotencyKey: r.idempotencyKey, from: STATES.CLAIMED, to: advance(STATES.CLAIMED, STATES.SUPERSEDED), reason: verdict?.reason ?? 'revalidation flipped decision', decision: verdict?.decision ?? 'deny' })
    } else {
      proceed.push(r)
    }
  }

  if (!proceed.length) return { transitions, artifact: null, deliverResult: null }

  // 2. Build the artifact (field-minimized; refuses rows with null IC keys).
  const artifact = adapter.buildArtifact(proceed, { now })

  // Records the builder skipped (missing IC sourcedIds) cannot be exported — they
  // fail with an explicit reason rather than shipping a malformed row.
  const skippedKeys = new Set((artifact.skipped ?? []).map((s) => s.idempotencyKey))
  for (const r of proceed) {
    if (skippedKeys.has(r.idempotencyKey)) {
      transitions.push({ idempotencyKey: r.idempotencyKey, from: STATES.CLAIMED, to: advance(STATES.CLAIMED, STATES.FAILED), reason: 'unmapped IC keys — route to manual_ui_export' })
    }
  }
  const exportable = proceed.filter((r) => !skippedKeys.has(r.idempotencyKey))
  for (const r of exportable) {
    transitions.push({ idempotencyKey: r.idempotencyKey, from: STATES.CLAIMED, to: advance(STATES.CLAIMED, STATES.EXPORTED), reason: `exported via ${adapter.mode}` })
  }

  // 3. Deliver + ingest the per-record result.
  const deliverResult = await adapter.deliver(artifact, { now })
  const acks = adapter.ingestResult(deliverResult, artifact)
  const ackByKey = new Map((acks ?? []).map((a) => [a.idempotencyKey, a]))

  for (const r of exportable) {
    const ack = ackByKey.get(r.idempotencyKey)
    if (!ack) continue // no ack yet (e.g. manual path) → stays 'exported'
    if (ack.state === STATES.CONFIRMED) {
      transitions.push({ idempotencyKey: r.idempotencyKey, from: STATES.EXPORTED, to: advance(STATES.EXPORTED, STATES.CONFIRMED), reason: ack.reason ?? 'IC confirmed' })
    } else if (ack.state === STATES.IMPORTED) {
      transitions.push({ idempotencyKey: r.idempotencyKey, from: STATES.EXPORTED, to: advance(STATES.EXPORTED, STATES.IMPORTED), reason: ack.reason ?? 'handed to IC import' })
    } else {
      transitions.push({ idempotencyKey: r.idempotencyKey, from: STATES.EXPORTED, to: advance(STATES.EXPORTED, STATES.FAILED), reason: ack.reason ?? 'IC rejected' })
    }
  }

  return { transitions, artifact, deliverResult }
}

// ── Concrete adapters ────────────────────────────────────────────────────────

// OneRoster delta CSV → district SFTP/HTTPS ingest. `config.transport` is the
// real delivery fn (held by the edge function; never the client). With no
// transport configured (no district yet) deliver reports unconfigured rather than
// pretending success — honest by construction.
export function makeOneRosterCsvDeltaAdapter(config = {}) {
  return {
    mode: 'oneroster_csv_delta',
    buildArtifact: (records, opts) =>
      buildOneRosterDeltaPackage(records.map(toEnrollmentChange), { now: opts?.now, version: config.version ?? '1.1' }),
    async deliver(artifact, opts) {
      if (typeof config.transport !== 'function') {
        return { mode: 'oneroster_csv_delta', ok: false, reason: 'transport_unconfigured', artifact }
      }
      return config.transport(artifact, opts) // returns { ok, perRecord: [{ sourcedId, ok, reason }] }
    },
    ingestResult(deliverResult, artifact) {
      if (!deliverResult?.ok) {
        // whole-delivery failure → every record fails (retryable)
        return (artifact?.recordRefs ?? []).map((ref) => ({ idempotencyKey: ref.idempotencyKey, state: STATES.FAILED, reason: deliverResult?.reason ?? 'delivery failed' }))
      }
      const bySourced = new Map((deliverResult.perRecord ?? []).map((p) => [p.sourcedId, p]))
      return (artifact?.recordRefs ?? []).map((ref) => {
        const p = bySourced.get(ref.sourcedId)
        return { idempotencyKey: ref.idempotencyKey, state: p?.ok ? STATES.CONFIRMED : STATES.FAILED, reason: p?.reason }
      })
    },
  }
}

// Manual fallback (the safe DEFAULT when inbound CSV ingest is unconfirmed for a
// district): generate a HUMAN WORKLIST a registrar applies via Requests and
// Rosters. It needs NO IC sourcedIds, so it makes forward progress for the demo /
// unmapped-district case (where a OneRoster delta would skip every row). Nothing
// is auto-confirmed — records land in `imported` (handed off); a human later
// confirms.
export function makeManualUiExportAdapter(config = {}) {
  return {
    mode: 'manual_ui_export',
    buildArtifact: (records, opts) =>
      buildManualWorklist(records, { now: opts?.now }),
    async deliver(artifact) {
      // The edge function uploads the worklist to a private bucket and mints a
      // short-lived signed URL; here we surface the handoff without auto-confirm.
      return { mode: 'manual_ui_export', ok: true, worklistUrl: config.worklistUrl ?? null, artifact }
    },
    ingestResult(deliverResult, artifact) {
      if (!deliverResult?.ok) return (artifact?.recordRefs ?? []).map((ref) => ({ idempotencyKey: ref.idempotencyKey, state: STATES.FAILED, reason: 'export failed' }))
      return (artifact?.recordRefs ?? []).map((ref) => ({ idempotencyKey: ref.idempotencyKey, state: STATES.IMPORTED, reason: 'awaiting registrar confirmation' }))
    },
  }
}

// Map a queue record to the placement-change shape oneRosterCsv expects. A swap
// (from→to) is modelled as an ADD of the target section; a drop of the old section
// is emitted only when its sourcedId is known (kept minimal otherwise).
function toEnrollmentChange(r) {
  return {
    idempotencyKey: r.idempotencyKey,
    action: r.action ?? 'add',
    userSourcedId: r.userSourcedId,
    classSourcedId: r.classSourcedId,
    schoolSourcedId: r.schoolSourcedId,
    beginDate: r.beginDate,
    endDate: r.endDate,
  }
}
