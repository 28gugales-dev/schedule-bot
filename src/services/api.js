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
import { hashRequestKey } from '../utils/dedupeHash.js'
import { priorityOrderQueue } from '../utils/priorityQueue.js'
import { evaluateAgainstRubric } from '../utils/schedulingLogic.js'
import { freezeRuleVersion } from '../utils/ruleVersion.js'
import { canSubmit } from '../utils/rateLimiter.js'
import { buildSyncPackage } from '../utils/batchProcessor.js'
import { releaseSeat } from '../utils/seatAvailability.js'
import * as waitlist from './waitlist.js'

// Module-level mutable copies so submit/decision/sync actions persist across
// calls within a session (simulates a backend without one).
let waivers = WAIVER_TYPES.map((w) => ({ ...w }))
let criteria = RUBRIC_CRITERIA.map((c) => ({ ...c }))
let queue = REVIEW_QUEUE.map((r) => ({ ...r }))
let batch = BATCH_SYNC_QUEUE.map((b) => ({ ...b }))
let submissions = SEED_SUBMISSIONS.map((s) => ({ ...s })) // seeded for demo; new submits prepend
let deniedHistory = []

const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (v) => JSON.parse(JSON.stringify(v))

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
  await delay()
  return clone(waivers.filter((w) => w.active))
}

// All waiver types incl. inactive — for the admin rubric builder, which toggles
// the active flag. Also used to map waiverTypeId -> display name in the queue.
export async function fetchAllWaivers() {
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
export async function submitWaiver(payload) {
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

  // Stubbed confirmation email — real version triggers a server-side mailer.
  console.info(`[stub email] confirmation queued for request ${request.id}`)
  return { requestId: request.id, status: request.status }
}

// Tracker state for a student's submitted request.
export async function fetchRequestStatus(requestId) {
  await delay(300)
  const found = submissions.find((s) => s.id === requestId)
  return found ? clone(found) : null
}

// All of the current student's submitted requests (newest first). Demo: seeded.
export async function fetchMyRequests() {
  await delay()
  return clone(submissions)
}

// ---- Admin / counselor portal -------------------------------------------

// Priority-queue ordered (graduation risk + submission age), not raw
// insertion order — see utils/priorityQueue.js.
export async function fetchReviewQueue() {
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
// joins the batch-sync queue and frees the dropped course's seat (notifying
// anyone waitlisted for it); on deny it's kept in the rejected-history log.
export async function submitDecision(requestId, decision, note = '') {
  await delay(350)
  const idx = queue.findIndex((r) => r.id === requestId)
  const request = idx >= 0 ? queue[idx] : null
  if (request) queue = queue.filter((r) => r.id !== requestId)

  const subIdx = submissions.findIndex((s) => s.id === requestId)
  if (subIdx >= 0) {
    submissions[subIdx] = {
      ...submissions[subIdx],
      status: decision === 'admit' ? 'approved' : 'denied',
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
        waiver: waivers.find((w) => w.id === request.waiverTypeId)?.name ?? '—',
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

  console.info(`[audit] ${requestId} -> ${decision}${note ? ` (${note})` : ''}`)
  const next = queue[0]?.id ?? null
  return { ok: true, requestId, decision, nextId: next, remaining: queue.length }
}

// Past denied requests — surfaced to counselors as a reference log.
export async function fetchRejectedRequests() {
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
export async function updateRubricCriteria(nextCriteria, nextWaivers) {
  await delay(400)
  if (Array.isArray(nextCriteria)) criteria = nextCriteria.map((c) => ({ ...c }))
  if (Array.isArray(nextWaivers)) waivers = nextWaivers.map((w) => ({ ...w }))
  return { ok: true, criteria: clone(criteria), waivers: clone(waivers) }
}

// ---- Batch sync (Infinite Campus) ---------------------------------------

export async function fetchBatchSyncQueue() {
  await delay()
  return clone(batch)
}

// Force-push the unsynced approved waivers to Infinite Campus. Real version
// calls a server-side edge function holding the IC credentials — never client.
export async function triggerBatchICPush() {
  await delay(900)
  const pushed = batch.filter((b) => !b.synced)
  const syncPackage = buildSyncPackage(pushed)
  batch = batch.map((b) => ({ ...b, synced: true }))
  console.info(`[stub IC push] synced ${syncPackage.totalCount} waiver(s)`, syncPackage.byWaiverType)
  return { ok: true, pushedCount: syncPackage.totalCount, pushedIds: pushed.map((b) => b.id), syncPackage }
}
