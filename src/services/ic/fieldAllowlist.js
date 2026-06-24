// FERPA / Forsyth DSA data minimization for the Infinite Campus OneRoster pull.
//
// privacy-policy.md §1.1 enumerates an EXHAUSTIVE set of fields we are permitted
// to collect, and a closed "Prohibited / Restricted" set we must never store
// (date of birth, gender, race/ethnicity, home address, personal email, phone,
// parent/guardian contact, free/reduced-lunch, special-education status). The
// OneRoster API returns more than we are allowed to keep — a /users record can
// carry birthDate, sex, americanIndianOrAlaskaNative, phone, sms, agents, etc.
//
// This module is the single chokepoint that enforces the ceiling. It is
// ALLOWLIST-BY-CONSTRUCTION: minimizeStudentPull builds its output from named
// permitted fields only and NEVER spreads the raw input, so a new prohibited
// field appearing in a future IC schema cannot silently leak into our store.
// assertNoProhibited is a defense-in-depth tripwire that surfaces drift.

// Fields we are permitted to persist (privacy-policy.md §1).
export const ALLOWED_STUDENT_FIELDS = Object.freeze([
  'sisId', 'schoolSourcedId', 'gpa', 'attendanceRate', 'gradeLevel',
  'enrollmentStatus', 'lastSync', 'completedCourses', 'currentSchedule',
])

// Explicitly prohibited (privacy-policy.md §1.1). Matched case-insensitively
// against raw OneRoster keys for the tripwire. Identifiers (sourcedId, username,
// email-as-school-login) are NOT here — they are operational keys, not the
// restricted demographic set.
export const PROHIBITED_RAW_FIELDS = Object.freeze([
  'ssn', 'socialSecurityNumber', 'nationalId',
  'birthDate', 'birthdate', 'dob', 'dateOfBirth',
  'sex', 'gender',
  'race', 'ethnicity', 'americanIndianOrAlaskaNative', 'asian',
  'blackOrAfricanAmerican', 'nativeHawaiianOrOtherPacificIslander', 'white',
  'hispanicOrLatinoEthnicity', 'demographicRaceTwoOrMoreRaces',
  'address', 'homeAddress', 'street', 'city', 'postalCode', 'zip',
  'sms', 'phone', 'personalEmail',
  'agents', 'agentSourcedIds', 'guardian', 'parent', 'contactInfo',
  'freeReducedLunch', 'economicDisadvantage',
  'specialEducation', 'iep', 'disability', 'section504',
])

// Build the minimized, persistable record from a normalized pull object.
// `raw` is expected to already be normalized to camelCase by the pull edge
// function (OneRoster user + enrollments + classes joined); this strips it to the
// allowlist. completedCourses / currentSchedule are themselves re-minimized so a
// nested demographic field cannot ride along inside an array element.
export function minimizeStudentPull(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    sisId: str(raw.sisId),
    schoolSourcedId: str(raw.schoolSourcedId),
    gpa: num(raw.gpa),
    attendanceRate: num(raw.attendanceRate),
    gradeLevel: num(raw.gradeLevel),
    enrollmentStatus: str(raw.enrollmentStatus),
    lastSync: str(raw.lastSync),
    completedCourses: arr(raw.completedCourses).map(minimizeCompletedCourse),
    currentSchedule: arr(raw.currentSchedule).map(minimizeScheduleEntry),
  }
}

function minimizeCompletedCourse(c) {
  if (!c || typeof c !== 'object') return null
  return { name: str(c.name), grade: str(c.grade), gradeYear: num(c.gradeYear), term: str(c.term) }
}

function minimizeScheduleEntry(s) {
  if (!s || typeof s !== 'object') return null
  // classSourcedId is the IC section key needed to build an enrollment row — an
  // operational identifier, not restricted PII, so it is kept.
  return { course: str(s.course), period: num(s.period), classSourcedId: str(s.classSourcedId) }
}

// Defense-in-depth: returns the list of prohibited keys found anywhere in a raw
// object graph. The pull edge function calls this on the RAW IC response and
// refuses to persist (and logs) if it is non-empty — catching IC schema drift
// before a prohibited field could ever reach minimizeStudentPull's blind spots.
export function findProhibitedFields(raw, _seen = new Set()) {
  const hits = []
  walk(raw)
  return [...new Set(hits)]

  function walk(node) {
    if (!node || typeof node !== 'object' || _seen.has(node)) return
    _seen.add(node)
    if (Array.isArray(node)) { node.forEach(walk); return }
    for (const key of Object.keys(node)) {
      if (PROHIBITED_RAW_FIELDS.some((p) => p.toLowerCase() === key.toLowerCase())) hits.push(key)
      walk(node[key])
    }
  }
}

// The ONLY fields an enrollment-change push artifact may carry. No academic
// content, no demographics — just the operational keys to move a placement. Used
// by oneRosterCsv.js and asserted in the stress test.
export const ENROLLMENT_PUSH_FIELDS = Object.freeze([
  'sourcedId', 'status', 'classSourcedId', 'schoolSourcedId', 'userSourcedId',
  'role', 'beginDate', 'endDate',
])

const str = (v) => (v === undefined || v === null ? null : String(v))
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v))
const arr = (v) => (Array.isArray(v) ? v : [])
