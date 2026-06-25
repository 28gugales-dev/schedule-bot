// Real backend implementation of the service layer (Supabase). Mirrors the
// function signatures + return shapes of services/api.js exactly, so the UI is
// unchanged — api.js delegates here when isSupabaseConfigured (see its guards).
//
// SCOPE (auth-first vertical slice): the student-submit -> counselor-queue ->
// decision loop on the `requests` table + `waiver_types`, protected by RLS.
// Functions NOT defined here (batch, rubric, audit, waitlist, OneRoster) keep
// running their demo implementations in api.js even in real mode.
import { supabase } from '../lib/supabase.js'
import { RUBRIC_CRITERIA } from './mockData.js'
import { evaluateAgainstRubric } from '../utils/schedulingLogic.js'
import { freezeRuleVersion } from '../utils/ruleVersion.js'
import { priorityOrderQueue } from '../utils/priorityQueue.js'
import { slugifyWaiverId } from '../utils/formSchema.js'
import { waiverWindowStatus } from '../utils/waiverWindow.js'
import { recordAuditEvent, actorFromAuth } from './audit.js'

const STATUS_BY_DECISION = { admit: 'approved', deny: 'denied', flag: 'flagged' }

function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

// Set is not JSON-serializable (stringifies to {}); store completed as an array.
function serializeTranscript(t) {
  if (!t) return null
  return { ...t, completed: t.completed instanceof Set ? [...t.completed] : (t.completed ?? []) }
}

// ---- DB row <-> app shape mappers (snake_case <-> camelCase) ---------------
function rowToSubmission(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    waiverTypeId: r.waiver_type_id,
    status: r.status,
    submittedAt: r.submitted_at,
    courseList: r.course_list ?? [],
    fromCourse: r.from_course ?? null,
    toCourse: r.to_course ?? null,
    studentNote: r.student_note ?? '',
    transcriptData: r.transcript_data ?? null,
    documents: r.documents ?? [],
    recommendation: r.recommendation ?? null,
    counselorNote: r.counselor_note ?? undefined,
    formAnswers: r.form_answers ?? {},
    formSchemaSnapshot: r.form_schema_snapshot ?? [],
    consentGivenAt: r.consent_given_at ?? null,
    consentVersion: r.consent_version ?? null,
    withdrawnAt: r.withdrawn_at ?? null,
    deletionRequestedAt: r.deletion_requested_at ?? null,
  }
}

function rowToQueueRow(r) {
  const snap = r.student_snapshot ?? {
    name: r.student_id,
    id: r.student_id,
    grade: r.transcript_data?.studentGrade ?? 9,
    gpa: r.transcript_data?.gpa ?? 0,
  }
  return {
    id: r.id,
    student: snap,
    waiverTypeId: r.waiver_type_id,
    submittedAt: r.submitted_at,
    documents: r.documents ?? [],
    courseList: r.course_list ?? [],
    studentNote: r.student_note ?? '',
    fromCourse: r.from_course ?? null,
    toCourse: r.to_course ?? null,
    recommendation: r.recommendation ?? null,
    formAnswers: r.form_answers ?? {},
    formSchemaSnapshot: r.form_schema_snapshot ?? [],
    ruleVersion: r.rule_version ?? null,
    checks: r.recommendation?.checks ?? [],
  }
}

function rowToWaiverType(w) {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    active: w.active,
    requiredDocs: w.required_docs ?? [],
    formSchema: w.form_schema ?? [],
    criteria: w.criteria ?? [],
    referenceDocs: w.reference_docs ?? [],
    openAt: w.open_at ?? null,
    closeAt: w.close_at ?? null,
  }
}

// ---- Display-status derivation (mirrors api.js — keeps the stepper advancing
// for fresh non-terminal requests without mutating the stored status) --------
const TERMINAL = new Set(['approved', 'denied', 'flagged'])
function deriveDisplayStatus(sub) {
  if (!sub || TERMINAL.has(sub.status)) return sub
  const ms = sub.submittedAt ? Date.parse(sub.submittedAt) : NaN
  if (Number.isNaN(ms)) return sub
  const elapsed = Date.now() - ms
  const status = elapsed < 3000 ? 'submitted' : elapsed < 7000 ? 'automated-review' : 'counselor-review'
  return { ...sub, status }
}

// ---- Waiver types ----------------------------------------------------------
export async function fetchAvailableWaivers() {
  const data = unwrap(await supabase.from('waiver_types').select('*').eq('active', true))
  return data.map(rowToWaiverType)
}

export async function fetchAllWaivers() {
  const data = unwrap(await supabase.from('waiver_types').select('*').order('id'))
  return data.map(rowToWaiverType)
}

// createWaiverType is called via the gateway with the raw input; slug the id
// here too so the supabase path is self-contained. The caller passes {name,...}.
export async function createWaiverType(input, _actor = null) {
  const existing = unwrap(await supabase.from('waiver_types').select('id'))
  const id = slugifyWaiverId(input.name ?? '', existing.map((r) => r.id))
  const row = {
    id,
    name: input.name ?? '',
    description: input.description ?? '',
    active: input.active ?? false,
    required_docs: input.requiredDocs ?? [],
    form_schema: input.formSchema ?? [],
    // New forms inherit the default rubric (mirrors the demo path); ref docs empty.
    criteria: input.criteria ?? RUBRIC_CRITERIA.map((c) => ({ ...c })),
    reference_docs: input.referenceDocs ?? [],
    open_at: input.openAt || null,
    close_at: input.closeAt || null,
  }
  return rowToWaiverType(unwrap(await supabase.from('waiver_types').insert(row).select('*').single()))
}

// Partial patch → snake_case. Only present keys are written. formSchema save
// is just updateWaiverType(id, { formSchema }).
export async function updateWaiverType(id, patch, _actor = null) {
  const row = {}
  if ('name' in patch) row.name = patch.name
  if ('description' in patch) row.description = patch.description
  if ('active' in patch) row.active = patch.active
  if ('requiredDocs' in patch) row.required_docs = patch.requiredDocs
  if ('formSchema' in patch) row.form_schema = patch.formSchema
  if ('criteria' in patch) row.criteria = patch.criteria
  if ('referenceDocs' in patch) row.reference_docs = patch.referenceDocs
  if ('openAt' in patch) row.open_at = patch.openAt || null
  if ('closeAt' in patch) row.close_at = patch.closeAt || null
  return rowToWaiverType(unwrap(await supabase.from('waiver_types').update(row).eq('id', id).select('*').single()))
}

// SOFT delete only — hard DELETE throws the FK NO ACTION violation when the
// type has request history.
export async function deleteWaiverType(id, _actor = null) {
  unwrap(await supabase.from('waiver_types').update({ active: false }).eq('id', id))
  return { ok: true, id }
}

export async function fetchWaiverTypeForm(waiverTypeId) {
  const data = unwrap(
    await supabase.from('waiver_types').select('id, form_schema').eq('id', waiverTypeId).maybeSingle(),
  )
  return { waiverTypeId, formSchema: data?.form_schema ?? [] }
}

// ---- Student: submit -------------------------------------------------------
export async function submitWaiver(payload) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  if (payload.consentGiven !== true) throw new Error('Consent to the FERPA disclosure is required before submitting.')

  // Fetch the form's own rubric + schema. Score against the per-form criteria,
  // falling back to the global default set when the form carries none (legacy/
  // empty) so untouched forms behave exactly as before.
  const wt = unwrap(
    await supabase.from('waiver_types').select('form_schema, criteria, active, open_at, close_at').eq('id', payload.waiverTypeId).maybeSingle(),
  )
  // Friendly window gate. The requests_insert_own RLS policy (0005) is the
  // authoritative enforcement (it also checks active); this turns the otherwise-
  // opaque RLS rejection into a clear message for a not-yet-open / closed form.
  const wStatus = waiverWindowStatus({ active: wt?.active, openAt: wt?.open_at ?? null, closeAt: wt?.close_at ?? null })
  if (wStatus === 'scheduled' || wStatus === 'closed') {
    throw new Error('This form is not currently open for submissions.')
  }
  // Per-form rubric. Empty array = counselor cleared it → manual review (engine
  // returns 'review' for zero rules). Only a missing column (null) falls back to
  // the global default — the 0006 column default backfills legacy rows so this is
  // effectively the malformed-only path.
  const formCriteria = Array.isArray(wt?.criteria) ? wt.criteria : RUBRIC_CRITERIA

  const recommendation = payload.transcriptData
    ? evaluateAgainstRubric(
        { ...payload.transcriptData, waiverTypeId: payload.waiverTypeId, fromCourse: payload.fromCourse, toCourse: payload.toCourse, courseList: payload.courseList },
        formCriteria,
      )
    : { decision: 'review', confidence: 0.5, reason: 'No transcript data available for automated evaluation.', checks: [] }

  const insertRow = {
    student_id: user.id, // authoritative — must equal auth.uid() per RLS
    waiver_type_id: payload.waiverTypeId,
    status: 'submitted',
    course_list: payload.courseList ?? [],
    from_course: payload.fromCourse ?? null,
    to_course: payload.toCourse ?? null,
    student_note: payload.studentNote ?? '',
    transcript_data: serializeTranscript(payload.transcriptData),
    documents: payload.documents ?? [],
    form_answers: payload.formAnswers ?? {},
    form_schema_snapshot: wt?.form_schema ?? [],
    consent_given_at: new Date().toISOString(),
    consent_version: payload.consentVersion ?? null,
    recommendation,
    rule_version: freezeRuleVersion(formCriteria),
    student_snapshot: {
      name: user.user_metadata?.name ?? user.email,
      id: user.id,
      grade: payload.transcriptData?.studentGrade ?? 9,
      gpa: payload.transcriptData?.gpa ?? 0,
    },
  }

  const row = unwrap(await supabase.from('requests').insert(insertRow).select('id, status').single())
  return { requestId: row.id, status: row.status }
}

// ---- Student: tracker / my requests ----------------------------------------
export async function fetchRequestStatus(requestId) {
  const data = unwrap(
    await supabase.from('requests').select('*').eq('id', requestId).maybeSingle(),
  )
  return data ? deriveDisplayStatus(rowToSubmission(data)) : null
}

export async function fetchMyRequests() {
  // RLS scopes this to the current student's own rows.
  const data = unwrap(await supabase.from('requests').select('*').order('submitted_at', { ascending: false }))
  return data.map((r) => deriveDisplayStatus(rowToSubmission(r)))
}

// ---- Counselor: queue ------------------------------------------------------
export async function fetchReviewQueue() {
  // RLS lets counselors read all; pending = not yet decided.
  const data = unwrap(
    await supabase.from('requests').select('*').eq('status', 'submitted').order('submitted_at', { ascending: false }),
  )
  await logBulkDisclosure(data)
  return priorityOrderQueue(data.map(rowToQueueRow))
}

// FERPA §99.32 disclosure log. The counselor's bulk reads of student records are
// a "disclosure" event. Actor is derived from the session (auth.getUser),
// never a client arg. Fire-and-forget: the recordAuditEvent promise is NOT
// awaited (so the read isn't blocked), but its rejection is swallowed via
// .catch — an unawaited reject would otherwise escape the surrounding try/catch
// as an unhandled rejection. The try/catch still guards the synchronous setup
// (getUser + map). NOT called from fetchRequestStatus — that is the student
// self-poll path (would log on every 2s poll + be rejected by the
// counselor-only INSERT policy).
async function logBulkDisclosure(data) {
  if (!data?.length) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    recordAuditEvent({
      action: 'record.view.bulk',
      actor: actorFromAuth(user, 'counselor'),
      summary: `Counselor viewed ${data.length} student record(s)`,
      after: { studentIds: data.map((r) => r.student_id) },
    }).catch(() => {
      /* disclosure logging must never error the counselor read */
    })
  } catch {
    /* disclosure logging must never block the counselor read */
  }
}

// ---- Counselor: student quick-find + record --------------------------------
// Typeahead for the command palette. profiles_select_self_or_counselor RLS lets
// a counselor read every profile; bounded + names only, so this is NOT a
// disclosure event (that is logged when a full record is opened, below).
export async function searchStudents(query) {
  const q = query.trim()
  if (!q) return []
  const data = unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, grade')
      .eq('role', 'student')
      .ilike('full_name', `%${q}%`)
      .limit(10),
  )
  return data.map((p) => ({ id: p.id, name: p.full_name ?? p.id, grade: p.grade ?? null }))
}

// One student's full record: identity + every request, newest first. Opening a
// student record IS a FERPA §99.32 disclosure — logged fire-and-forget like the
// bulk-read above. Header falls back to a request snapshot when the profile row
// is sparse (keeps parity with the demo path, which has no profiles table).
export async function fetchStudentRecord(studentId) {
  const profile = unwrap(await supabase.from('profiles').select('*').eq('id', studentId).maybeSingle())
  const requests = unwrap(
    await supabase.from('requests').select('*').eq('student_id', studentId).order('submitted_at', { ascending: false }),
  )
  logRecordDisclosure(studentId, profile)
  const snap = requests[0]?.student_snapshot ?? null
  return {
    student: {
      id: studentId,
      name: profile?.full_name ?? snap?.name ?? studentId,
      grade: profile?.grade ?? snap?.grade ?? null,
      gpa: profile?.gpa ?? snap?.gpa ?? null,
      email: profile?.email ?? null,
    },
    requests: requests.map((r) => ({
      id: r.id,
      waiverTypeId: r.waiver_type_id,
      status: r.status,
      submittedAt: r.submitted_at,
      decidedAt: r.decided_at ?? null,
      studentNote: r.student_note ?? '',
      counselorNote: r.counselor_note ?? '',
    })),
  }
}

function logRecordDisclosure(studentId, profile) {
  try {
    supabase.auth.getUser().then(({ data: { user } }) => {
      recordAuditEvent({
        action: 'record.view',
        actor: actorFromAuth(user, 'counselor'),
        student: { id: studentId, name: profile?.full_name ?? studentId },
        summary: `Counselor opened ${profile?.full_name ?? studentId}'s record`,
      }).catch(() => {
        /* disclosure logging must never error the counselor read */
      })
    }).catch(() => {})
  } catch {
    /* disclosure logging must never block the read */
  }
}

// ---- Counselor: decision ---------------------------------------------------
export async function submitDecision(requestId, decision, note = '') {
  const { data: { user } } = await supabase.auth.getUser()
  const status = STATUS_BY_DECISION[decision] ?? 'denied'
  unwrap(
    await supabase
      .from('requests')
      .update({ status, counselor_note: note, decided_by: user?.id ?? null, decided_at: new Date().toISOString() })
      .eq('id', requestId),
  )
  // Bridge the approval into the IC push queue + claim a soft seat hold. The demo
  // path (api.js) does this inline; real mode previously did NOT — this is the
  // missing wire. Best-effort: the DECISION is the primary action and must never
  // be undone by a queue/hold hiccup (e.g. the 0009/0011 migrations not yet
  // applied), so the bridge is wrapped and its failure is swallowed like audit.
  if (decision === 'admit') await enqueueForIcPush(requestId).catch(() => {})
  if (decision === 'deny') await supabase.rpc('release_seat_hold', { p_request_id: requestId }).then(undefined, () => {})
  return { ok: true, requestId, decision }
}

// Insert a 'queued' batch_sync_queue row for an approved request and claim a soft
// seat hold for the target course. RLS lets a counselor INSERT only 'queued' rows;
// all later push_state transitions are made server-side by the edge function.
async function enqueueForIcPush(requestId) {
  const { data: req } = await supabase.from('requests').select('*').eq('id', requestId).maybeSingle()
  if (!req) return
  const snap = req.student_snapshot ?? null
  // Idempotent enqueue: skip if this request is already queued/in-flight.
  const { data: existing } = await supabase
    .from('batch_sync_queue').select('id').eq('request_id', requestId)
    .in('push_state', ['queued', 'claimed', 'exported', 'imported', 'confirmed']).maybeSingle()
  if (existing) return

  // Backfill the IC student/school keys from the pull cache when present. The TARGET
  // section key (class_sourced_id) is genuinely unknown without IC section data, so
  // it stays null — which routes the record to the manual_ui_export worklist (the
  // safe default) rather than an auto-push it can't address. idempotency_key is set
  // only once all three keys exist (a real-district, fully-mapped record).
  const { data: roster } = await supabase
    .from('one_roster').select('sis_id, school_sourced_id').eq('student_id', req.student_id).maybeSingle()

  await supabase.from('batch_sync_queue').insert({
    request_id: requestId,
    student_id: req.student_id,
    student_name: snap?.name ?? req.student_id,
    waiver_name: req.waiver_type_id,
    from_course: req.from_course ?? null,
    to_course: req.to_course ?? null,
    user_sourced_id: roster?.sis_id ?? null,
    school_sourced_id: roster?.school_sourced_id ?? null,
    push_state: 'queued',
  })

  // Soft seat hold on the TARGET course (the one being JOINED — where
  // over-allocation happens), best-effort. The real seat authority is IC Max
  // Students, reconciled at push. Period is a coarse placeholder (0) until real IC
  // section data resolves the target period — documented as a course-level hold.
  if (req.to_course) {
    await supabase.rpc('claim_seat', {
      p_course: req.to_course, p_period: 0, p_request_id: requestId, p_student_id: req.student_id, p_capacity: 30,
    }).then(undefined, () => {})
  }
}

// ---- Batch sync to Infinite Campus -----------------------------------------
// Read the push queue. Maps the push_state machine back to a demo-compatible
// { synced } boolean while also surfacing the richer state. 'done' = handed off:
// in the DEFAULT manual_ui_export mode the terminal success state is 'imported'
// (handed to the registrar), not 'confirmed' (auto-push ack) — collapsing to
// confirmed-only would mark every manual record pending forever.
export async function fetchBatchSyncQueue() {
  const data = unwrap(
    await supabase.from('batch_sync_queue').select('*').order('approved_at', { ascending: false }),
  )
  return data.map((r) => ({
    id: r.id,
    student: r.student_name ?? r.student_id,
    waiver: r.waiver_name ?? r.waiver_type_id ?? '',
    approvedAt: r.approved_at,
    synced: r.push_state === 'confirmed' || r.push_state === 'imported',
    pushState: r.push_state,
    lastError: r.last_error ?? null,
  }))
}

// Trigger a push run. All credential-holding work + push_state transitions happen
// server-side in the edge function; the client only invokes it and reports counts.
export async function triggerBatchICPush() {
  const { data, error } = await supabase.functions.invoke('sync-to-infinite-campus', { body: {} })
  if (error) throw new Error(error.message)
  const counts = data?.counts ?? {}
  // "Pushed" = handed off / done only (confirmed + imported). exported is still in
  // flight; superseded/failed are not pushes. Keeps the toast honest vs the badge.
  const pushedCount = (counts.confirmed ?? 0) + (counts.imported ?? 0)
  return {
    ok: !!data?.ok,
    pushedCount,
    inFlight: counts.exported ?? 0,
    superseded: counts.superseded ?? 0,
    failed: counts.failed ?? 0,
    counts,
    transportMode: data?.transportMode ?? null,
    worklistUrl: data?.worklistUrl ?? null,
  }
}

// Authoritative student snapshot from the one_roster cache (refreshed by the
// oneroster-pull edge function). Mirrors the mock fetchOneRosterRecord shape.
export async function fetchOneRosterRecord(studentId) {
  const r = unwrap(await supabase.from('one_roster').select('*').eq('student_id', studentId).maybeSingle())
  if (!r) return null
  return {
    studentId: r.sis_id ?? r.student_id,
    gpa: r.gpa,
    attendanceRate: r.attendance_rate,
    gradeLevel: r.grade_level,
    enrollmentStatus: r.enrollment_status,
    lastSync: r.last_sync,
    completedCourses: r.completed_courses ?? [],
    currentSchedule: r.current_schedule ?? [],
  }
}

// ---- Counselor: rejected history -------------------------------------------
export async function fetchRejectedRequests() {
  const data = unwrap(
    await supabase.from('requests').select('*').eq('status', 'denied').order('decided_at', { ascending: false }),
  )
  await logBulkDisclosure(data)
  return data.map((r) => ({ ...rowToQueueRow(r), decision: 'deny', counselorNote: r.counselor_note ?? '', deniedAt: r.decided_at }))
}

// ---- Student: withdraw / deletion-request ----------------------------------
// withdrawRequest mirrors the RLS USING gate (.eq('status','submitted')) so an
// already-decided race returns 0 rows, not an error.
export async function withdrawRequest(requestId) {
  unwrap(
    await supabase
      .from('requests')
      .update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'submitted'),
  )
  return { ok: true, requestId, status: 'withdrawn' }
}

export async function requestRequestDeletion(requestId) {
  unwrap(
    await supabase
      .from('requests')
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq('id', requestId),
  )
  return { ok: true, requestId }
}

// ---- Document storage (private 'documents' bucket, see migration 0004) ------
// Objects are keyed "<auth.uid()>/<unique>-<name>" — the storage RLS keys off
// foldername[1] === uid, so a student can only ever read/write their own folder.
const DOC_BUCKET = 'documents'

function safeKeySegment(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-128)
}

// WaiverIntake passes [{ file: File, name, size, docType }]. We upload the bytes
// to the private bucket and return descriptors that carry `path` (durable) plus a
// short-lived signed `url` for immediate display. Persist `path` in the request;
// re-sign for later viewing with getDocumentUrl (signed URLs expire by design).
export async function uploadStudentDocuments(files) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  const stored = []
  for (const f of files || []) {
    const blob = f.file ?? f // accept a File or a wrapper carrying `.file`
    if (!(blob instanceof Blob)) {
      throw new Error(`Document "${f.name ?? 'unknown'}" is missing its file data.`)
    }
    const name = f.name ?? blob.name ?? 'file'
    const path = `${user.id}/${crypto.randomUUID()}-${safeKeySegment(name)}`
    const { error } = await supabase.storage.from(DOC_BUCKET).upload(path, blob, { upsert: false })
    if (error) throw new Error(error.message)
    const { data: signed } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path, 3600)
    stored.push({
      id: path,
      name,
      type: f.docType || 'supporting',
      size: blob.size ?? f.size ?? 0,
      path,
      url: signed?.signedUrl ?? null,
    })
  }
  return { uploadId: `up-${Date.now()}`, files: stored }
}

// Fresh short-lived signed URL for a stored document. The viewer (ReviewDetail)
// calls this on demand because URLs persisted at upload time expire.
export async function getDocumentUrl(path, expiresIn = 300) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path, expiresIn)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

// ---- Shared resource library (staff-only; see migration 0007) --------------
// Private 'resources' bucket with FLAT keys (a shared shelf, not per-user). RLS on
// public.resources + the bucket gates all of this to counselors.
const RES_BUCKET = 'resources'

function rowToResource(r) {
  return {
    id: r.id,
    title: r.title,
    category: r.category ?? 'other',
    description: r.description ?? '',
    fileName: r.file_name ?? null,
    path: r.storage_path ?? null,
    size: r.size ?? 0,
    contentType: r.content_type ?? null,
    uploadedBy: r.uploaded_by ?? null,
    createdAt: r.created_at ?? null,
  }
}

export async function fetchResources() {
  const data = unwrap(await supabase.from('resources').select('*').order('created_at', { ascending: false }))
  return (data ?? []).map(rowToResource)
}

// Upload the bytes (if any) then insert the metadata row. A note-only entry (no
// file) is allowed — title + description with a null path.
export async function createResource({ title, category, description, file } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  let path = null
  let fileName = null
  let size = 0
  let contentType = null
  if (file) {
    fileName = file.name ?? 'file'
    path = `${crypto.randomUUID()}-${safeKeySegment(fileName)}`
    const { error } = await supabase.storage.from(RES_BUCKET).upload(path, file, { upsert: false })
    if (error) throw new Error(error.message)
    size = file.size ?? 0
    contentType = file.type || null
  }
  const insertRow = {
    title: title?.trim() || fileName || 'Untitled resource',
    category: category || 'other',
    description: description?.trim() || '',
    file_name: fileName,
    storage_path: path,
    size,
    content_type: contentType,
    uploaded_by: user.id,
  }
  const row = unwrap(await supabase.from('resources').insert(insertRow).select('*').single())
  return rowToResource(row)
}

export async function deleteResource(id, path = null) {
  if (path) {
    // Best-effort object removal; the row delete is the source of truth.
    await supabase.storage.from(RES_BUCKET).remove([path])
  }
  unwrap(await supabase.from('resources').delete().eq('id', id))
  return { ok: true, id }
}

export async function getResourceUrl(path, expiresIn = 300) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(RES_BUCKET).createSignedUrl(path, expiresIn)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

// ---- Data rights: export (DSA 6.2 access / data return) --------------------
// Student SAR: a copy of everything we hold about the signed-in student. RLS
// already scopes both reads to the caller's own rows.
export async function exportMyData() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  const profile = unwrap(await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle())
  const requests = unwrap(
    await supabase.from('requests').select('*').eq('student_id', user.id).order('submitted_at', { ascending: false }),
  )
  return { exportedAt: new Date().toISOString(), subject: user.id, profile, requests }
}

// Counselor: one student's full record (parental access request, DSA 6.2).
export async function exportStudentData(studentId) {
  const profile = unwrap(await supabase.from('profiles').select('*').eq('id', studentId).maybeSingle())
  const requests = unwrap(
    await supabase.from('requests').select('*').eq('student_id', studentId).order('submitted_at', { ascending: false }),
  )
  return { exportedAt: new Date().toISOString(), subject: studentId, profile, requests }
}

// Counselor/admin: ALL district data — supports the "return all FCS Data within
// 10 business days of termination" obligation (DSA 6.3). RLS lets a counselor
// read every profile/request; waiver_types are world-readable to authenticated.
export async function exportAllData() {
  const profiles = unwrap(await supabase.from('profiles').select('*'))
  const requests = unwrap(await supabase.from('requests').select('*'))
  const waiverTypes = unwrap(await supabase.from('waiver_types').select('*'))
  return { exportedAt: new Date().toISOString(), profiles, requests, waiverTypes }
}

// ---- Data rights: deletion (FERPA destruction, DSA 6.4 / 6.5) --------------
// Counselor fulfils a deletion: remove the student's uploaded documents, then
// hard-delete the profile (requests cascade via FK). This is the real
// destruction the DSA requires. The auth.users identity shell is removed
// separately via the purge-student edge function on full account closure; a later
// re-sign-in simply creates a fresh (empty) student profile.
export async function deleteStudentData(studentId) {
  const { data: objs } = await supabase.storage.from(DOC_BUCKET).list(studentId, { limit: 1000 })
  if (objs?.length) {
    await supabase.storage.from(DOC_BUCKET).remove(objs.map((o) => `${studentId}/${o.name}`))
  }
  unwrap(await supabase.from('profiles').delete().eq('id', studentId))
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await recordAuditEvent({
      action: 'record.delete',
      actor: actorFromAuth(user, 'counselor'),
      student: { id: studentId },
      summary: `Destroyed all records for student ${studentId} (deletion fulfilment)`,
    })
  } catch {
    /* the destruction succeeded; an audit-write failure must not undo it */
  }
  return { ok: true, studentId }
}

// Counselor deletes a single request (granular parental request for one record).
export async function deleteRequest(requestId) {
  unwrap(await supabase.from('requests').delete().eq('id', requestId))
  return { ok: true, requestId }
}
