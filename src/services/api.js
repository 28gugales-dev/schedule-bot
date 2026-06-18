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
} from './mockData.js'
import { hashRequestKey } from '../utils/dedupeHash.js'
import { priorityOrderQueue } from '../utils/priorityQueue.js'
import { evaluateAgainstRubric } from '../utils/schedulingLogic.js'

// Module-level mutable copies so submit/decision/sync actions persist across
// calls within a session (simulates a backend without one).
let waivers = WAIVER_TYPES.map((w) => ({ ...w }))
let criteria = RUBRIC_CRITERIA.map((c) => ({ ...c }))
let queue = REVIEW_QUEUE.map((r) => ({ ...r }))
let batch = BATCH_SYNC_QUEUE.map((b) => ({ ...b }))
let submissions = SEED_SUBMISSIONS.map((s) => ({ ...s })) // seeded for demo; new submits prepend

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

// Create a waiver request. Returns the new request id + initial tracker status.
export async function submitWaiver(payload) {
  await delay(600)

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
  const recommendation = payload.transcriptData
    ? evaluateAgainstRubric({ ...payload.transcriptData, fromCourse: payload.fromCourse, toCourse: payload.toCourse }, criteria)
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
      recommendation,
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
  return clone(priorityOrderQueue(queue))
}

// Log an admit/deny decision. Removes the request from the queue; on admit it
// joins the batch-sync queue awaiting the next Infinite Campus push.
export async function submitDecision(requestId, decision, note = '') {
  await delay(350)
  const idx = queue.findIndex((r) => r.id === requestId)
  const request = idx >= 0 ? queue[idx] : null
  if (request) queue = queue.filter((r) => r.id !== requestId)
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
  }
  console.info(`[audit] ${requestId} -> ${decision}${note ? ` (${note})` : ''}`)
  const next = queue[0]?.id ?? null
  return { ok: true, requestId, decision, nextId: next, remaining: queue.length }
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
  batch = batch.map((b) => ({ ...b, synced: true }))
  console.info(`[stub IC push] synced ${pushed.length} waiver(s)`)
  return { ok: true, pushedCount: pushed.length, pushedIds: pushed.map((b) => b.id) }
}
