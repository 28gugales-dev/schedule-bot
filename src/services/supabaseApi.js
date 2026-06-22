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

  // Compute the AI recommendation client-side against the active rubric (rubric
  // persistence is out of this slice — use the default criteria set).
  const recommendation = payload.transcriptData
    ? evaluateAgainstRubric(
        { ...payload.transcriptData, fromCourse: payload.fromCourse, toCourse: payload.toCourse, courseList: payload.courseList },
        RUBRIC_CRITERIA,
      )
    : { decision: 'review', confidence: 0.5, reason: 'No transcript data available for automated evaluation.', checks: [] }

  // Freeze the waiver type's current formSchema at submit (immutable copy, not
  // a live reference). [] for legacy/no-form types. Mirrors freezeRuleVersion.
  const wt = unwrap(
    await supabase.from('waiver_types').select('form_schema').eq('id', payload.waiverTypeId).maybeSingle(),
  )

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
    recommendation,
    rule_version: freezeRuleVersion(RUBRIC_CRITERIA),
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
  return priorityOrderQueue(data.map(rowToQueueRow))
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
  return { ok: true, requestId, decision }
}

// ---- Counselor: rejected history -------------------------------------------
export async function fetchRejectedRequests() {
  const data = unwrap(
    await supabase.from('requests').select('*').eq('status', 'denied').order('decided_at', { ascending: false }),
  )
  return data.map((r) => ({ ...rowToQueueRow(r), decision: 'deny', counselorNote: r.counselor_note ?? '', deniedAt: r.decided_at }))
}
