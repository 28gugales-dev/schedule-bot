// Mocked service layer. Every function is async with the SAME signature the
// real implementation will have, so UI components code against the final
// contract today and only the bodies change when Supabase/IC wiring lands.
//
// Replace strategy when going live:
//   - reads  -> supabase.from(table).select(...)
//   - writes -> supabase.from(table).insert/update(...)
//   - uploads-> supabase.storage.from(bucket).upload(...)
//   - IC push-> server-side edge function call
// The recommendation field is fed by utils/schedulingLogic.js in production
// (currently a stub); here it is read straight off the seed data.

import {
  WAIVER_TYPES,
  RUBRIC_CRITERIA,
  REVIEW_QUEUE,
  BATCH_SYNC_QUEUE,
  SEED_SUBMISSIONS,
  ONE_ROSTER,
  REVIEW_CHECKS,
} from './mockData.js'
import { recordAuditEvent, diffRubric } from './audit.js'
import { hashRequestKey } from '../utils/dedupeHash.js'
import { priorityOrderQueue } from '../utils/priorityQueue.js'
import { evaluateAgainstRubric } from '../utils/schedulingLogic.js'
import { freezeRuleVersion } from '../utils/ruleVersion.js'
import { canSubmit } from '../utils/rateLimiter.js'
import { buildSyncPackage } from '../utils/batchProcessor.js'
import { releaseSeat } from '../utils/seatAvailability.js'
import * as waitlist from './waitlist.js'
import { isSupabaseConfigured } from '../lib/supabase.js'
import * as sb from './supabaseApi.js'

// When Supabase is configured, the slice functions below delegate to the real
// backend (services/supabaseApi.js); otherwise they fall through to the demo
// (localStorage) implementations. Functions with no real impl yet (batch, rubric,
// audit, waitlist, OneRoster) always run the demo path — graceful partial migration.

// Fallback actor when a caller doesn't pass a session payload (keeps the audit
// trail populated even from code paths that predate the actor argument). The UI
// passes the real actor from useAuth().
const DEFAULT_ACTOR = { id: 'demo-admin', name: 'Demo Counselor', role: 'counselor' }

// Recording must never break the primary action — a full localStorage or a
// transient Supabase error should not stop a counselor from deciding a waiver.
async function safeAudit(event) {
  try {
    return await recordAuditEvent(event)
  } catch {
    return null
  }
}

const WAIVER_NAME = (id) => WAIVER_TYPES.find((w) => w.id === id)?.name ?? id

const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (v) => JSON.parse(JSON.stringify(v))

// ---- Demo persistence (mirrors services/audit.js) ------------------------
// Without this the mock state lived only in module-level `let`s, so a reload
// wiped every submission + decision while the audit log (which DOES persist to
// localStorage) survived — leaving the trail contradicting the live UI. We now
// hydrate from localStorage on init and write back after every mutation. Bump
// SEED_VERSION whenever the mockData fixtures change shape/content, so returning
// demo browsers rebuild from the new seed instead of keeping stale cached data.
const SEED_VERSION = '1'
const NS = 'schedulebot.api.v1'
const LS_KEYS = {
  waivers: `${NS}.waivers`,
  criteria: `${NS}.criteria`,
  queue: `${NS}.queue`,
  batch: `${NS}.batch`,
  submissions: `${NS}.submissions`,
  deniedHistory: `${NS}.deniedHistory`,
  version: `${NS}.version`,
}

function lsRead(key) {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function lsWrite(key, value) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode) — fall back to in-memory only */
  }
}

// Module-level mutable mirrors so submit/decision/sync actions persist across
// calls within a session (simulates a backend without one) and survive reloads
// via localStorage. Hydrated by ensureSeeded() below.
let waivers
let criteria
let queue
let batch
let submissions // seeded for demo; new submits prepend
let deniedHistory

function ensureSeeded() {
  // Reseed when storage is empty OR the cached seed predates the current
  // fixtures (version mismatch) — otherwise returning browsers keep stale data.
  const versionOk = lsRead(LS_KEYS.version) === SEED_VERSION
  const storedWaivers = lsRead(LS_KEYS.waivers)
  const storedCriteria = lsRead(LS_KEYS.criteria)
  const storedQueue = lsRead(LS_KEYS.queue)
  const storedBatch = lsRead(LS_KEYS.batch)
  const storedSubmissions = lsRead(LS_KEYS.submissions)
  const storedDenied = lsRead(LS_KEYS.deniedHistory)

  const hydrated =
    versionOk &&
    Array.isArray(storedWaivers) &&
    Array.isArray(storedCriteria) &&
    Array.isArray(storedQueue) &&
    Array.isArray(storedBatch) &&
    Array.isArray(storedSubmissions) &&
    Array.isArray(storedDenied)

  if (hydrated) {
    waivers = storedWaivers
    criteria = storedCriteria
    queue = storedQueue
    batch = storedBatch
    submissions = storedSubmissions
    deniedHistory = storedDenied
    return
  }

  // Seed from the mockData imports (the original module-init behavior) and
  // write them back, recording the version so subsequent loads hydrate.
  waivers = WAIVER_TYPES.map((w) => ({ ...w }))
  criteria = RUBRIC_CRITERIA.map((c) => ({ ...c }))
  queue = REVIEW_QUEUE.map((r) => ({ ...r }))
  batch = BATCH_SYNC_QUEUE.map((b) => ({ ...b }))
  submissions = SEED_SUBMISSIONS.map((s) => ({ ...s }))
  deniedHistory = []
  persist()
  lsWrite(LS_KEYS.version, SEED_VERSION)
}

function persist() {
  lsWrite(LS_KEYS.waivers, waivers)
  lsWrite(LS_KEYS.criteria, criteria)
  lsWrite(LS_KEYS.queue, queue)
  lsWrite(LS_KEYS.batch, batch)
  lsWrite(LS_KEYS.submissions, submissions)
  lsWrite(LS_KEYS.deniedHistory, deniedHistory)
}

ensureSeeded()

// ---- Display-status derivation -------------------------------------------
// submitWaiver only ever writes status 'submitted', and decisions jump straight
// to a terminal status, so the two middle stepper stages ('automated-review',
// 'counselor-review') were never shown for anything actually submitted. We
// DERIVE the display status from elapsed time since submittedAt for NON-terminal
// requests, without ever mutating the stored status (keeps it reload-safe — a
// reseed/reload re-derives from the same timestamp). Seeded submissions carry
// old timestamps, so they correctly read as 'counselor-review' while pending.
const TERMINAL_STATUSES = new Set(['approved', 'denied', 'flagged'])
function deriveDisplayStatus(request) {
  if (!request) return request
  if (TERMINAL_STATUSES.has(request.status)) return request
  const submittedMs = request.submittedAt ? Date.parse(request.submittedAt) : NaN
  if (Number.isNaN(submittedMs)) return request
  const elapsed = Date.now() - submittedMs
  const status = elapsed < 3000 ? 'submitted' : elapsed < 7000 ? 'automated-review' : 'counselor-review'
  return { ...request, status }
}

// ---- Student portal ------------------------------------------------------

// Upload transcript / course list / supporting docs. Returns the stored file
// descriptors the submission step will reference.
export async function uploadStudentDocuments(files) {
  await delay(700)
  const stored = (files || []).map((f, i) => ({
    id: `doc-${Date.now()}-${i}`,
    name: f.name,
    type: f.docType || 'supporting',
    size: f.size ?? 0,
    url: `/mock/uploads/${encodeURIComponent(f.name)}`,
  }))
  return { uploadId: `up-${Date.now()}`, files: stored }
}

// Only active waiver types are offered to students.
export async function fetchAvailableWaivers() {
  if (isSupabaseConfigured) return sb.fetchAvailableWaivers()
  await delay()
  return clone(waivers.filter((w) => w.active))
}

// All waiver types incl. inactive — for the admin rubric builder, which toggles
// the active flag. Also used to map waiverTypeId -> display name in the queue.
export async function fetchAllWaivers() {
  if (isSupabaseConfigured) return sb.fetchAllWaivers()
  await delay()
  return clone(waivers)
}

// Prevent duplicate in-flight requests (same student, waiver type, course
// swap) via a Set of fingerprint hashes over the current submissions.
function existingRequestHashes() {
  return new Set(
    submissions.map((s) =>
      hashRequestKey({ studentId: s.studentId, waiverTypeId: s.waiverTypeId, fromCourse: s.fromCourse, toCourse: s.toCourse }),
    ),
  )
}

// Which required document types (per the waiver type's `requiredDocs`) the
// submission is missing. Course list is no longer a file upload (it's typed
// into the per-period boxes), so it's satisfied by a non-empty course list.
function findMissingDocs(waiverTypeId, documents, courseListNames) {
  const waiver = waivers.find((w) => w.id === waiverTypeId)
  const have = new Set((documents ?? []).map((d) => d.type))
  const missing = []
  for (const req of waiver?.requiredDocs ?? []) {
    if (req === 'courseList') {
      if (!(courseListNames?.length > 0)) missing.push('course list')
    } else if (!have.has(req)) {
      missing.push(req)
    }
  }
  return missing
}

// Create a waiver request. Returns the new request id + initial tracker status.
export async function submitWaiver(payload, actor = null) {
  if (isSupabaseConfigured) return sb.submitWaiver(payload, actor)
  await delay(600)

  if (!canSubmit(payload.studentId)) {
    throw new Error('Too many submissions — please wait before trying again.')
  }

  const hash = hashRequestKey({
    studentId: payload.studentId,
    waiverTypeId: payload.waiverTypeId,
    fromCourse: payload.fromCourse,
    toCourse: payload.toCourse,
  })
  if (existingRequestHashes().has(hash)) {
    throw new Error('An identical request is already pending — check My Requests before resubmitting.')
  }

  const request = {
    id: `req-${Date.now()}`,
    ...payload,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  }
  submissions = [request, ...submissions]

  // Wire the new request into the counselor-facing review queue too — these
  // used to be disconnected mock arrays, so a student submission never
  // actually reached ReviewQueue.jsx. The recommendation is computed for
  // real (rule engine against the active rubric), not canned sample data.
  const missingDocs = findMissingDocs(payload.waiverTypeId, payload.documents, payload.courseList)
  const recommendation = payload.transcriptData
    ? evaluateAgainstRubric(
        { ...payload.transcriptData, fromCourse: payload.fromCourse, toCourse: payload.toCourse, courseList: payload.courseList, missingDocs },
        criteria,
      )
    : { decision: 'review', confidence: 0.5, reason: 'No transcript data available for automated evaluation.', checks: [] }

  queue = [
    ...queue,
    {
      id: request.id,
      student: {
        name: payload.studentId ?? 'Student',
        id: payload.studentId ?? request.id,
        grade: payload.transcriptData?.studentGrade ?? 9,
        gpa: payload.transcriptData?.gpa ?? 0,
      },
      waiverTypeId: payload.waiverTypeId,
      submittedAt: request.submittedAt,
      documents: payload.documents ?? [],
      courseList: payload.courseList ?? [],
      studentNote: payload.studentNote ?? '',
      fromCourse: payload.fromCourse ?? null,
      toCourse: payload.toCourse ?? null,
      recommendation,
      ruleVersion: freezeRuleVersion(criteria),
    },
  ]
  persist()

  // Stubbed confirmation email — real version triggers a server-side mailer.
  console.info(`[stub email] confirmation queued for request ${request.id}`)

  const who = actor ?? { id: 'student-demo', name: 'Demo Student', role: 'student' }
  const docCount = Array.isArray(payload.documents) ? payload.documents.length : 0
  await safeAudit({
    action: 'waiver.submit',
    actor: who,
    student: payload.student ?? { id: who.id, name: who.name },
    requestId: request.id,
    waiverTypeId: payload.waiverTypeId,
    summary: `Submitted ${WAIVER_NAME(payload.waiverTypeId)} request${docCount ? ` with ${docCount} document${docCount !== 1 ? 's' : ''}` : ''}`,
    after: { status: 'submitted', documents: docCount },
  })

  return { requestId: request.id, status: request.status }
}

// Tracker state for a student's submitted request. The status is DERIVED from
// elapsed time for non-terminal requests so the stepper advances (see
// deriveDisplayStatus); the stored status is never mutated.
export async function fetchRequestStatus(requestId) {
  if (isSupabaseConfigured) return sb.fetchRequestStatus(requestId)
  await delay(300)
  const found = submissions.find((s) => s.id === requestId)
  return found ? deriveDisplayStatus(clone(found)) : null
}

// All of the current student's submitted requests (newest first). Demo: seeded.
// Each record's display status is derived the same way as fetchRequestStatus so
// the list badge and the tracker agree.
export async function fetchMyRequests() {
  if (isSupabaseConfigured) return sb.fetchMyRequests()
  await delay()
  return clone(submissions).map((s) => deriveDisplayStatus(s))
}

// ---- Admin / counselor portal -------------------------------------------

// Priority-queue ordered (graduation risk + submission age), not raw
// insertion order — see utils/priorityQueue.js.
export async function fetchReviewQueue() {
  if (isSupabaseConfigured) return sb.fetchReviewQueue()
  await delay()
  // Join per-request rubric verification (checks) at the read seam: real
  // submissions already carry it on recommendation.checks (evaluateAgainstRubric);
  // legacy seed requests fall back to the canned REVIEW_CHECKS fixture.
  return clone(priorityOrderQueue(queue)).map((r) => ({
    ...r,
    checks: r.recommendation?.checks?.length ? r.recommendation.checks : REVIEW_CHECKS[r.id] ?? [],
  }))
}

// Authoritative SIS record for a student, pulled from the OneRoster API.
export async function fetchOneRosterRecord(studentId) {
  await delay(300)
  const record = ONE_ROSTER[studentId]
  return record ? clone(record) : null
}

// Log an admit/deny decision. Removes the request from the queue; on admit it
// joins the batch-sync queue (awaiting the next Infinite Campus push) and frees
// the dropped course's seat (notifying anyone waitlisted for it); on deny it's
// kept in the rejected-history log. Every outcome is written to the audit trail.
export async function submitDecision(requestId, decision, note = '', actor = null) {
  if (isSupabaseConfigured) return sb.submitDecision(requestId, decision, note, actor)
  await delay(350)
  const idx = queue.findIndex((r) => r.id === requestId)
  const request = idx >= 0 ? queue[idx] : null
  if (request) queue = queue.filter((r) => r.id !== requestId)

  // Map the human decision → persisted student-facing status. Same lookup the
  // audit block uses below, so the stored submission status agrees with the
  // audit trail — a `flag` must persist 'flagged', not fall through to 'denied'.
  const STATUS_BY_DECISION = { admit: 'approved', deny: 'denied', flag: 'flagged' }
  const subIdx = submissions.findIndex((s) => s.id === requestId)
  if (subIdx >= 0) {
    submissions[subIdx] = {
      ...submissions[subIdx],
      status: STATUS_BY_DECISION[decision] ?? 'denied',
      recommendation: request?.recommendation,
      counselorNote: note,
    }
  }

  if (request && decision === 'admit') {
    batch = [
      ...batch,
      {
        id: request.id,
        student: request.student.name,
        waiver: WAIVER_NAME(request.waiverTypeId),
        approvedAt: new Date().toISOString(),
        synced: false,
      },
    ]
    if (request.fromCourse) {
      releaseSeat(request.fromCourse)
      waitlist.notifySubscribers(request.fromCourse)
    }
  }
  if (request && decision === 'deny') {
    deniedHistory = [{ ...request, decision, counselorNote: note, deniedAt: new Date().toISOString() }, ...deniedHistory]
  }
  // Persist unconditionally — the submissions[] status update above can run even
  // when the request wasn't in the queue (idempotent write otherwise).
  persist()

  if (request) {
    const rec = request.recommendation
    // An "override" is a human admit/deny that contradicts a definite AI call.
    // A flag is an escalation, not an override; 'review' means the AI deferred.
    const overrode =
      (decision === 'admit' || decision === 'deny') &&
      !!rec && (rec.decision === 'admit' || rec.decision === 'deny') &&
      rec.decision !== decision
    const ACTION = { admit: 'decision.admit', deny: 'decision.deny', flag: 'decision.flag' }
    const VERB = { admit: 'Admitted', deny: 'Denied', flag: 'Flagged' }
    await safeAudit({
      action: ACTION[decision] ?? 'decision.deny',
      actor: actor ?? DEFAULT_ACTOR,
      student: { id: request.student.id, name: request.student.name },
      requestId,
      waiverTypeId: request.waiverTypeId,
      summary: `${VERB[decision] ?? 'Decided'} ${request.student.name} · ${WAIVER_NAME(request.waiverTypeId)}`,
      before: {
        status: 'counselor-review',
        aiRecommendation: rec ? { decision: rec.decision, confidence: rec.confidence } : null,
      },
      after: { status: STATUS_BY_DECISION[decision] ?? 'denied', note, synced: decision === 'admit' ? false : undefined },
      // Seeded AI decisions key off the request id (see seedAudit.js).
      aiDecisionId: `ai-seed-${requestId}`,
      overrode,
      note,
    })
  }

  const next = queue[0]?.id ?? null
  return { ok: true, requestId, decision, nextId: next, remaining: queue.length }
}

// Past denied requests — surfaced to counselors as a reference log.
export async function fetchRejectedRequests() {
  if (isSupabaseConfigured) return sb.fetchRejectedRequests()
  await delay()
  return clone(deniedHistory)
}

// Student opts into being notified if a seat opens up in a course they were denied.
export async function subscribeToWaitlist(studentId, courseName, requestId) {
  await delay(200)
  waitlist.subscribe(studentId, courseName, requestId)
  return { ok: true }
}

export async function fetchNotifications(studentId) {
  await delay(200)
  return clone(waitlist.getNotifications(studentId))
}

export async function dismissNotification(notificationId) {
  await delay(150)
  waitlist.dismissNotification(notificationId)
  return { ok: true }
}

export async function fetchRubricCriteria() {
  await delay()
  return clone(criteria)
}

// Persist edits to rubric rules and waiver active/inactive toggles.
export async function updateRubricCriteria(nextCriteria, nextWaivers, actor = null) {
  await delay(400)
  // Snapshot the prior state BEFORE reassigning so the diff is accurate.
  const prevCriteria = clone(criteria)
  const prevWaivers = clone(waivers)

  if (Array.isArray(nextCriteria)) criteria = nextCriteria.map((c) => ({ ...c }))
  if (Array.isArray(nextWaivers)) waivers = nextWaivers.map((w) => ({ ...w }))
  persist()

  const diff = diffRubric(prevCriteria, prevWaivers, criteria, waivers)
  const critDiff = diff.filter((d) => d.entity.startsWith('Criterion'))
  const waiverDiff = diff.filter((d) => d.entity.startsWith('Waiver'))
  const who = actor ?? DEFAULT_ACTOR

  if (critDiff.length) {
    await safeAudit({
      action: 'rubric.update',
      actor: who,
      summary: `Edited ${critDiff.length} rubric ${critDiff.length === 1 ? 'rule' : 'rules'}`,
      before: prevCriteria, after: clone(criteria), diff: critDiff,
    })
  }
  if (waiverDiff.length) {
    const names = waiverDiff.map((d) => d.entity.replace('Waiver: ', ''))
    await safeAudit({
      action: 'waiver.toggle',
      actor: who,
      summary: `Toggled ${waiverDiff.length} waiver ${waiverDiff.length === 1 ? 'type' : 'types'}: ${names.join(', ')}`,
      before: prevWaivers, after: clone(waivers), diff: waiverDiff,
    })
  }

  return { ok: true, criteria: clone(criteria), waivers: clone(waivers) }
}

// ---- Batch sync (Infinite Campus) ---------------------------------------

export async function fetchBatchSyncQueue() {
  await delay()
  return clone(batch)
}

// Force-push the unsynced approved waivers to Infinite Campus. Real version
// calls a server-side edge function holding the IC credentials — never client.
export async function triggerBatchICPush(actor = null) {
  await delay(900)
  const pushed = batch.filter((b) => !b.synced)
  const syncPackage = buildSyncPackage(pushed)
  batch = batch.map((b) => ({ ...b, synced: true }))
  persist()
  console.info(`[stub IC push] synced ${syncPackage.totalCount} waiver(s)`, syncPackage.byWaiverType)

  await safeAudit({
    action: 'batch.sync',
    actor: actor ?? DEFAULT_ACTOR,
    summary: `Force-synced ${pushed.length} approved waiver${pushed.length !== 1 ? 's' : ''} to Infinite Campus`,
    before: { pending: pushed.length },
    after: { pushed: pushed.length, synced: true },
  })

  return { ok: true, pushedCount: syncPackage.totalCount, pushedIds: pushed.map((b) => b.id), syncPackage }
}
