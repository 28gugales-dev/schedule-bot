// Deterministic, rule-based implementations — no AI/ML involved.
import { parseTranscriptText } from './transcriptParser.js'
import { getCourseByName } from './courseCatalog.js'
import { checkEligibility } from './ruleEngine.js'
import { checkSeatAvailability } from './seatAvailability.js'
import { hasConflict } from './conflictDetection.js'
import { analyzeDropImpact } from './dependencyAnalysis.js'
import { getEquivalents } from './equivalencyGraph.js'
import { explainEligibility } from './explanationEngine.js'

// Parses transcript text into structured course/grade/attendance data.
export function parseTranscriptData(transcriptText) {
  const { studentGrade, gpa, attendanceRate, completedCourses, recognized, unrecognized } = parseTranscriptText(transcriptText)
  const courses = [...completedCourses.entries()].map(([name, info]) => ({ name, ...info }))
  return {
    gpa,
    studentGrade,
    attendanceRate,
    courses,
    completed: new Set(completedCourses.keys()),
    recognized,
    unrecognized,
  }
}

function numericCheck(rule, actual, unit = '') {
  const passed = actual != null ? actual >= rule.value : null
  const label = actual != null
    ? `${rule.label} (${actual}${unit} ${passed ? '>=' : '<'} ${rule.value}${unit})`
    : `${rule.label} (no data on file)`
  return { id: rule.id, label, passed }
}

// Evaluates parsed student data + an optional course swap against the active
// rubric. Unverifiable criteria report passed: null and are excluded from
// the confidence ratio rather than guessed.
export function evaluateAgainstRubric(studentData, criteria) {
  const student = { currentGrade: studentData.studentGrade, completed: studentData.completed ?? new Set() }
  const checks = []
  let hardFail = false

  const hasSwap = Boolean(studentData.toCourse) && studentData.toCourse !== 'None'
  const swapCourse = hasSwap ? getCourseByName(studentData.toCourse) : null
  const swapElig = swapCourse ? checkEligibility(student, swapCourse) : null
  const seat = swapCourse ? checkSeatAvailability(studentData.toCourse) : null

  // Schedule-conflict check: would the new course's period collide with the
  // rest of the student's current/planned course list (interval overlap)?
  const currentSchedule = (studentData.courseList ?? [])
    .filter((name) => name !== studentData.fromCourse)
    .map((name) => ({ course: name, period: checkSeatAvailability(name).period }))
  const conflict = seat?.available ? hasConflict(currentSchedule, { course: studentData.toCourse, period: seat.period }) : false

  for (const rule of criteria.filter((c) => c.enabled)) {
    switch (rule.id) {
      case 'min-gpa':
        checks.push(numericCheck(rule, studentData.gpa))
        break
      case 'min-attendance':
        checks.push(numericCheck(rule, studentData.attendanceRate != null ? Math.round(studentData.attendanceRate * 100) : null, '%'))
        break
      case 'prereq-complete': {
        const passed = swapElig ? !swapElig.failedRules.some((r) => r.id === 'prereq') : null
        checks.push({ id: rule.id, label: passed === null ? `${rule.label} (no course requested)` : rule.label, passed })
        break
      }
      case 'prior-credit': {
        const prereqName = swapCourse?.prerequisite
        const candidates = prereqName ? [prereqName, ...getEquivalents(prereqName).map((e) => e.course)] : []
        const courses = studentData.courses ?? []
        const record = candidates.length ? courses.find((c) => candidates.includes(c.name)) : null
        const passed = record ? record.mark >= 70 : courses.length > 0 ? courses.some((c) => c.mark >= 70) : null
        checks.push({ id: rule.id, label: passed === null ? `${rule.label} (no transcript on file)` : rule.label, passed })
        break
      }
      case 'no-conflict': {
        const passed = seat ? seat.available && !conflict : null
        checks.push({ id: rule.id, label: passed === null ? `${rule.label} (no course requested)` : rule.label, passed })
        break
      }
      case 'within-window': {
        checks.push({ id: rule.id, label: `${rule.label} (no deadline data on file)`, passed: null })
        break
      }
      default:
        break // e.g. counselor-note — manual, not auto-evaluated
    }
  }

  if (swapCourse) {
    const explanation = explainEligibility(student, swapCourse)
    checks.push({ id: 'eligibility', label: `Eligible for "${studentData.toCourse}"`, passed: explanation.eligible })
    for (const reason of explanation.reasons) checks.push({ id: `reason-${reason.id}`, label: reason.text, passed: reason.passed })
    if (!explanation.eligible) hardFail = true
  }
  if (seat && !seat.available) {
    checks.push({ id: 'seat', label: `Seat available for "${studentData.toCourse}"`, passed: false })
    hardFail = true
  } else if (conflict) {
    checks.push({ id: 'schedule-conflict', label: `No period conflict for "${studentData.toCourse}"`, passed: false })
    hardFail = true
  }

  // Dependency impact is informational, not a pass/fail gate.
  if (studentData.fromCourse) {
    const impact = analyzeDropImpact(studentData.fromCourse)
    if (impact.warning) checks.push({ id: 'dependency-impact', label: impact.warning, passed: null })
  }

  const missingDocs = studentData.missingDocs ?? []

  const verifiable = checks.filter((c) => c.passed !== null)
  const passedCount = verifiable.filter((c) => c.passed).length
  const confidence = verifiable.length > 0 ? passedCount / verifiable.length : 0.5

  let decision
  let reason
  if (hardFail) {
    decision = 'deny'
    reason = seat && !seat.available
      ? `No seats currently available in "${studentData.toCourse}".`
      : conflict
        ? `"${studentData.toCourse}" conflicts with another course already on the schedule.`
        : 'Prerequisite or grade-level requirement not met for the requested course.'
  } else if (missingDocs.length > 0) {
    decision = 'review'
    reason = `Missing required document(s): ${missingDocs.join(', ')}.`
  } else if (confidence >= 0.8) {
    decision = 'admit'
    reason = 'All checked requirements are satisfied.'
  } else if (confidence >= 0.5) {
    decision = 'review'
    reason = 'Some requirements are unmet or unverifiable from the transcript alone.'
  } else {
    decision = 'deny'
    reason = 'Most requirements are unmet.'
  }

  return { decision, confidence, reason, checks }
}
