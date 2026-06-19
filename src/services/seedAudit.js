// ════════════════════════════════════════════════════════════════════════════
// AUDIT SEED — historical fixtures for the demo (no backend).
//
// • AI decisions are DERIVED from the existing canned reasoning in mockData.js
//   (recommendation + REVIEW_CHECKS) so the AI-reasoning views read the same
//   data the Review Detail screen already shows — we surface it, we don't invent
//   a model. A score breakdown is synthesised from the per-criterion checks.
// • Audit events carry BAKED actor + device pairs (you can't derive M. Alvarez's
//   laptop from the current browser) so the "who / which device" columns vary
//   the way a real school's log would.
// • Timestamps are fixed (mid-June 2026, matching mockData) so the seeded order
//   is stable across reloads.
// ════════════════════════════════════════════════════════════════════════════

import { REVIEW_QUEUE, REVIEW_CHECKS } from './mockData.js'
import { EVALUATOR, SYSTEM_ACTOR } from './audit.schema.js'

// ── Baked staff identities (the "who") ────────────────────────────────────────
const STAFF = {
  alvarez: { id: 'staff-alvarez', name: 'M. Alvarez', role: 'counselor' },
  okafor:  { id: 'staff-okafor',  name: 'J. Okafor',  role: 'registrar' },
  bishop:  { id: 'staff-bishop',  name: 'D. Bishop',  role: 'admin' },
  demo:    { id: 'demo-admin',    name: 'Demo Counselor', role: 'counselor' },
  system:  SYSTEM_ACTOR,
}

// ── Baked devices (the "which device") ────────────────────────────────────────
const DEV = {
  mac:     { id: 'dev-mac-7f3a',  label: 'Safari · macOS',  ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15' },
  winChr:  { id: 'dev-win-2c91',  label: 'Chrome · Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' },
  winEdge: { id: 'dev-win-9b40',  label: 'Edge · Windows',  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0' },
  ipad:    { id: 'dev-ipad-44de', label: 'Safari · iPad',   ua: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1' },
  server:  { id: 'dev-server',    label: 'Scheduled job',   ua: 'cron/auto-sync' },
}

// ── Derive one AiDecision from a request's canned recommendation + checks ──────
function aiFrom({ requestId, student, waiverTypeId, recommendation, checks, ts, snapshot }) {
  const list = checks ?? []
  const weight = list.length ? +(1 / list.length).toFixed(3) : 0
  const builtChecks = list.map((c) => ({
    id: c.id,
    label: c.label,
    claimed: c.claimed,
    actual: c.actual,
    passed: c.passed,
    weight,
    // A pass adds most of its weight; a fail subtracts a portion — a transparent,
    // deterministic stand-in for a real model's per-feature contribution.
    contribution: +(c.passed ? weight * 0.9 : -weight * 0.6).toFixed(3),
    reasoning: c.reasoning,
  }))
  const base = 0.5
  return {
    id: `ai-seed-${requestId}`,
    ts,
    requestId,
    student,
    waiverTypeId,
    evaluator: EVALUATOR,
    decision: recommendation.decision,
    confidence: recommendation.confidence,
    rationale: recommendation.reason,
    checks: builtChecks,
    scoreBreakdown: {
      base,
      items: builtChecks.map((c) => ({ label: c.label, delta: c.contribution })),
    },
    inputsSnapshot: snapshot,
  }
}

// ── AI decisions for the live review queue (read straight off mockData) ────────
const QUEUE_AI = REVIEW_QUEUE.map((item) =>
  aiFrom({
    requestId: item.id,
    student: { id: item.student.id, name: item.student.name },
    waiverTypeId: item.waiverTypeId,
    recommendation: item.recommendation,
    checks: REVIEW_CHECKS[item.id],
    ts: item.submittedAt,
    snapshot: {
      claimedNote: item.studentNote,
      courseList: item.courseList,
      gpa: item.student.gpa,
      grade: item.student.grade,
    },
  }),
)

// ── Historical decided requests (each pairs an AI decision + a human action) ──
// `humanDecision` vs `recommendation.decision` drives the override flag.
const HISTORY = [
  {
    requestId: 'req-0991', student: { id: 'S-44120', name: 'Noah Kim' }, waiverTypeId: 'prereq-override',
    recommendation: { decision: 'admit', confidence: 0.9, reason: 'Prior equivalent credit confirmed; GPA well above threshold.' },
    checks: [
      { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'GPA 3.7', actual: '3.70', passed: true, reasoning: 'GPA 3.70 clears the minimum comfortably.' },
      { id: 'prior-credit', label: 'Prior equivalent credit on transcript', claimed: 'Summer Geometry at CC', actual: 'Geometry (CC), A, Summer 2025', passed: true, reasoning: 'Transfer credit present and matches the prerequisite.' },
    ],
    snapshot: { claimedNote: 'Completed prerequisite over summer.', gpa: 3.7, grade: 11 },
    humanDecision: 'admit', actor: STAFF.alvarez, device: DEV.mac, ts: '2026-06-16T11:00:00Z',
    note: 'Verified transfer transcript. Approved.',
  },
  {
    requestId: 'req-0994', student: { id: 'S-45980', name: 'Olivia Chen' }, waiverTypeId: 'grad-substitution',
    recommendation: { decision: 'admit', confidence: 0.88, reason: 'Course equivalency approved in catalog; exam score on file.' },
    checks: [
      { id: 'prior-credit', label: 'Course equivalency confirmed', claimed: 'AP CS covers requirement', actual: 'AP CS A, grade A; exam 5 on file', passed: true, reasoning: 'Equivalency confirmed in the course catalog.' },
      { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.55', passed: true, reasoning: 'GPA 3.55 clears the minimum.' },
    ],
    snapshot: { claimedNote: 'AP CS substitutes senior math/science.', gpa: 3.55, grade: 12 },
    humanDecision: 'admit', actor: STAFF.okafor, device: DEV.winChr, ts: '2026-06-16T11:42:00Z',
    note: '',
  },
  {
    // OVERRIDE: AI recommended admit, counselor denied (policy nuance the model missed).
    requestId: 'req-0989', student: { id: 'S-46512', name: 'Ethan Brooks' }, waiverTypeId: 'schedule-conflict',
    recommendation: { decision: 'admit', confidence: 0.74, reason: 'Conflict verified; an alternate block appears open.' },
    checks: [
      { id: 'no-conflict', label: 'Schedule conflict resolvable', claimed: 'Move Band to Period 6', actual: 'Period 6 Band shows 2 seats', passed: true, reasoning: 'An alternate Band section appears to have seats.' },
      { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.10', passed: true, reasoning: 'GPA 3.10 clears the minimum.' },
    ],
    snapshot: { claimedNote: 'AP Bio and Band collide in Period 4.', gpa: 3.1, grade: 11 },
    humanDecision: 'deny', actor: STAFF.alvarez, device: DEV.mac, ts: '2026-06-15T15:10:00Z',
    note: 'Period 6 Band is reserved for seniors this term — cannot place an 11th grader. Denied; advised to drop Band.',
  },
  {
    // OVERRIDE: AI recommended deny, admin admitted (documented exception).
    requestId: 'req-0985', student: { id: 'S-47031', name: 'Grace Lee' }, waiverTypeId: 'credit-recovery',
    recommendation: { decision: 'deny', confidence: 0.62, reason: 'Summer recovery section marked pending; completion not yet confirmed.' },
    checks: [
      { id: 'prior-credit', label: 'Recovery path confirmed on transcript', claimed: 'Retaking English 11 online', actual: 'Recovery enrollment "pending"', passed: false, reasoning: 'Recovery section is not yet confirmed complete.' },
      { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '90%', passed: true, reasoning: 'Attendance 90% is above threshold.' },
    ],
    snapshot: { claimedNote: 'Retaking English 11 to graduate on time.', gpa: 2.6, grade: 12 },
    humanDecision: 'admit', actor: STAFF.bishop, device: DEV.winEdge, ts: '2026-06-15T09:25:00Z',
    note: 'Counselor confirmed completion with the provider by phone; documented exception. Approved.',
  },
  {
    requestId: 'req-0980', student: { id: 'S-47720', name: 'James Patterson' }, waiverTypeId: 'late-add-drop',
    recommendation: { decision: 'deny', confidence: 0.7, reason: 'Add/drop window closed; outside policy.' },
    checks: [
      { id: 'within-window', label: 'Within add/drop window', claimed: 'Add AP Stats', actual: 'Window closed Jun 10; submitted Jun 14', passed: false, reasoning: 'Request fell outside the add/drop window.' },
    ],
    snapshot: { claimedNote: 'Add AP Stats before semester.', gpa: 3.2, grade: 11 },
    humanDecision: 'deny', actor: STAFF.okafor, device: DEV.winChr, ts: '2026-06-14T16:20:00Z',
    note: 'Outside window; no special circumstance documented.',
  },
]

const HISTORY_AI = HISTORY.map((h) =>
  aiFrom({
    requestId: h.requestId, student: h.student, waiverTypeId: h.waiverTypeId,
    recommendation: h.recommendation, checks: h.checks, ts: h.ts, snapshot: h.snapshot,
  }),
)

// ── Audit events ──────────────────────────────────────────────────────────────
const HISTORY_EVENTS = HISTORY.map((h) => {
  const admit = h.humanDecision === 'admit'
  return {
    id: `evt-seed-${h.requestId}`,
    ts: h.ts,
    actor: h.actor,
    device: h.device,
    category: 'decision',
    action: admit ? 'decision.admit' : 'decision.deny',
    student: h.student,
    requestId: h.requestId,
    waiverTypeId: h.waiverTypeId,
    summary: `${admit ? 'Admitted' : 'Denied'} ${h.student.name} · ${labelFor(h.waiverTypeId)}`,
    before: { status: 'counselor-review', aiRecommendation: { decision: h.recommendation.decision, confidence: h.recommendation.confidence } },
    after: { status: admit ? 'approved' : 'denied', note: h.note, synced: admit ? false : undefined },
    diff: [],
    aiDecisionId: `ai-seed-${h.requestId}`,
    overrode: h.humanDecision !== h.recommendation.decision,
    note: h.note,
  }
})

function labelFor(id) {
  const map = {
    'prereq-override': 'Prerequisite Override',
    'schedule-conflict': 'Schedule Conflict Waiver',
    'credit-recovery': 'Credit Recovery',
    'grad-substitution': 'Graduation Requirement Substitution',
    'late-add-drop': 'Late Add/Drop',
    'online-course': 'Online Course Approval',
    'ap-entry': 'Advanced Placement Entry',
    'pe-exemption': 'PE Exemption',
  }
  return map[id] ?? id
}

// Config + submission + sync events (the rest of a believable history).
const OTHER_EVENTS = [
  {
    id: 'evt-seed-rubric-1', ts: '2026-06-13T08:40:00Z',
    actor: STAFF.bishop, device: DEV.winEdge,
    category: 'config', action: 'rubric.update',
    student: null, requestId: null, waiverTypeId: null,
    summary: 'Raised minimum GPA 2.5 → 2.7 and enabled "Within add/drop window"',
    before: { 'min-gpa': 2.5, 'within-window': false }, after: { 'min-gpa': 2.7, 'within-window': true },
    diff: [
      { entity: 'Criterion: Minimum cumulative GPA', field: 'value', from: '2.5', to: '2.7' },
      { entity: 'Criterion: Within add/drop window', field: 'enabled', from: false, to: true },
    ],
    aiDecisionId: null, overrode: false,
    note: 'Aligning rubric with the new district policy for fall registration.',
  },
  {
    id: 'evt-seed-waiver-1', ts: '2026-06-13T09:05:00Z',
    actor: STAFF.bishop, device: DEV.winEdge,
    category: 'config', action: 'waiver.toggle',
    student: null, requestId: null, waiverTypeId: 'ap-entry',
    summary: 'Deactivated waiver type "Advanced Placement Entry"',
    before: { active: true }, after: { active: false },
    diff: [{ entity: 'Waiver: Advanced Placement Entry', field: 'active', from: true, to: false }],
    aiDecisionId: null, overrode: false,
    note: 'AP entry paused pending department review.',
  },
  {
    id: 'evt-seed-submit-1', ts: '2026-06-16T15:20:00Z',
    actor: { id: 'student-2001', name: 'Ava Thompson', role: 'student' }, device: DEV.ipad,
    category: 'submission', action: 'waiver.submit',
    student: { id: 'S-48213', name: 'Ava Thompson' }, requestId: 'req-2001', waiverTypeId: 'prereq-override',
    summary: 'Submitted Prerequisite Override request with 1 document',
    before: null, after: { status: 'submitted', documents: 1, files: 'ava_courses.pdf' },
    diff: [], aiDecisionId: null, overrode: false,
    note: 'Completed Statistics at community college last summer; ready for AP Bio.',
  },
  {
    id: 'evt-seed-submit-2', ts: '2026-06-16T16:30:00Z',
    actor: { id: 'student-2006', name: 'Marcus Chen', role: 'student' }, device: DEV.winChr,
    category: 'submission', action: 'waiver.submit',
    student: { id: 'S-52051', name: 'Marcus Chen' }, requestId: 'req-2006', waiverTypeId: 'late-add-drop',
    summary: 'Submitted Late Add/Drop request with 1 document',
    before: null, after: { status: 'submitted', documents: 1, files: 'add_request.pdf' },
    diff: [], aiDecisionId: null, overrode: false,
    note: 'Need to add AP Computer Science before summer session starts next week.',
  },
  {
    id: 'evt-seed-sync-1', ts: '2026-06-16T12:00:00Z',
    actor: STAFF.system, device: DEV.server,
    category: 'sync', action: 'batch.sync',
    student: null, requestId: null, waiverTypeId: null,
    summary: 'Auto-synced 3 approved waiver(s) to Infinite Campus',
    before: { pending: 3 }, after: { pushed: 3, synced: true },
    diff: [], aiDecisionId: null, overrode: false, note: 'Scheduled 60-second batch push.',
  },
  {
    id: 'evt-seed-sync-2', ts: '2026-06-15T14:35:00Z',
    actor: STAFF.demo, device: DEV.winChr,
    category: 'sync', action: 'batch.sync',
    student: null, requestId: null, waiverTypeId: null,
    summary: 'Force-synced 2 approved waiver(s) to Infinite Campus',
    before: { pending: 2 }, after: { pushed: 2, synced: true },
    diff: [], aiDecisionId: null, overrode: false, note: 'Manual push before end of day.',
  },
]

// ── Submission events for the live review queue (the missing producer) ────────
// Every pending REVIEW_QUEUE request is a waiver a student submitted, so each one
// emits a `submission` audit event — that is what makes the Student Submissions
// ledger mirror the queue (previously only the 2 portal submits in OTHER_EVENTS
// showed, neither of them a queue item). The rich `after` snapshot + the
// student's note carry the full request into the detail drawer, and aiDecisionId
// cross-links to the matching QUEUE_AI evaluation ("View AI reasoning").
const SUBMIT_DEVICES = [DEV.ipad, DEV.winChr, DEV.mac, DEV.winEdge]
const QUEUE_SUBMISSION_EVENTS = REVIEW_QUEUE.map((item, i) => {
  const docs = item.documents ?? []
  return {
    id: `evt-seed-submit-${item.id}`,
    ts: item.submittedAt,
    actor: { id: `student-${item.student.id}`, name: item.student.name, role: 'student' },
    device: SUBMIT_DEVICES[i % SUBMIT_DEVICES.length],
    category: 'submission',
    action: 'waiver.submit',
    student: { id: item.student.id, name: item.student.name },
    requestId: item.id,
    waiverTypeId: item.waiverTypeId,
    summary: `Submitted ${labelFor(item.waiverTypeId)} request with ${docs.length} document${docs.length !== 1 ? 's' : ''}`,
    before: null,
    // Primitive/string values only — AuditEventDetail's Snapshot JSON-stringifies
    // raw objects/arrays, so the doc + course lists are pre-joined to clean text.
    after: {
      status: 'submitted',
      documents: docs.length,
      files: docs.map((d) => d.name).join(', '),
      courses: (item.courseList ?? []).join(', '),
    },
    diff: [],
    aiDecisionId: `ai-seed-${item.id}`,
    overrode: false,
    note: item.studentNote ?? '',
  }
})

export const SEED_AI_DECISIONS = [...QUEUE_AI, ...HISTORY_AI]
export const SEED_AUDIT_EVENTS = [...HISTORY_EVENTS, ...QUEUE_SUBMISSION_EVENTS, ...OTHER_EVENTS]
