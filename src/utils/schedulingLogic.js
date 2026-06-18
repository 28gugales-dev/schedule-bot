// Deterministic, rule-based implementations — no AI/ML involved.
import { parseTranscriptText } from './transcriptParser.js'
import { getCourseByName } from './courseCatalog.js'
import { checkEligibility } from './ruleEngine.js'
import { checkSeatAvailability } from './seatAvailability.js'

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

// Evaluates parsed student data + an optional course swap against the active
// rubric. Unverifiable criteria (no real data source) report passed: null
// and are excluded from the confidence ratio rather than guessed.
export function evaluateAgainstRubric(studentData, criteria) {
  const student = { currentGrade: studentData.studentGrade, completed: studentData.completed ?? new Set() }
  const checks = []
  let hardFail = false

  // Course-swap eligibility (Directed Graph + Rule Engine) and seat
  // availability (CSP placeholder) — computed once, reused by both the
  // rubric checks below and the hard-fail gate.
  const hasSwap = Boolean(studentData.toCourse) && studentData.toCourse !== 'None'
  const swapCourse = hasSwap ? getCourseByName(studentData.toCourse) : null
  const swapElig = swapCourse ? checkEligibility(student, swapCourse) : null
  const seat = swapCourse ? checkSeatAvailability(studentData.toCourse) : null

  for (const rule of criteria.filter((c) => c.enabled)) {
    switch (rule.id) {
      case 'min-gpa': {
        const passed = studentData.gpa != null ? studentData.gpa >= rule.value : null
        checks.push({ id: rule.id, label: passed === null ? `${rule.label} (no GPA on file)` : rule.label, passed })
        break
      }
      case 'min-attendance': {
        const passed = studentData.attendanceRate != null ? studentData.attendanceRate * 100 >= rule.value : null
        checks.push({ id: rule.id, label: passed === null ? `${rule.label} (no attendance on file)` : rule.label, passed })
        break
      }
      case 'prereq-complete': {
        const passed = swapElig ? !swapElig.failedRules.some((r) => r.id === 'prereq') : null
        checks.push({ id: rule.id, label: passed === null ? `${rule.label} (no course requested)` : rule.label, passed })
        break
      }
      case 'prior-credit': {
        const prereqName = swapCourse?.prerequisite
        const record = prereqName ? (studentData.courses ?? []).find((c) => c.name === prereqName) : null
        const courses = studentData.courses ?? []
        const passed = record ? record.mark >= 70 : courses.length > 0 ? courses.some((c) => c.mark >= 70) : null
        checks.push({ id: rule.id, label: passed === null ? `${rule.label} (no transcript on file)` : rule.label, passed })
        break
      }
      case 'no-conflict': {
        const passed = seat ? seat.available : null
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

  if (swapElig) {
    checks.push({ id: 'eligibility', label: `Eligible for "${studentData.toCourse}"`, passed: swapElig.eligible })
    if (!swapElig.eligible) hardFail = true
  }
  if (seat && !seat.available) {
    checks.push({ id: 'seat', label: `Seat available for "${studentData.toCourse}"`, passed: false })
    hardFail = true
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
