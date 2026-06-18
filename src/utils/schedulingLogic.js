// ============================================================================
// REAL (NON-AI) IMPLEMENTATION
// ============================================================================
// These two functions used to be intentional stubs (NotImplementedError).
// They're now backed by deterministic, rule-based logic: transcript text ->
// structured data (transcriptParser.js + courseCatalog.js), then structured
// data -> a recommendation (ruleEngine.js against the active rubric + any
// requested course swap). No AI/ML involved anywhere in this path.
// ============================================================================

import { parseTranscriptText } from './transcriptParser.js'
import { getCourseByName } from './courseCatalog.js'
import { checkEligibility } from './ruleEngine.js'
import { checkSeatAvailability } from './seatAvailability.js'

/**
 * Parse a student's transcript text into structured course/grade data.
 *
 * @param {string} transcriptText - raw text extracted from the uploaded
 *   transcript (via pdfText.js) or pasted directly.
 * @returns {object} { gpa, studentGrade, attendanceRate, courses: Array<{name, mark, credit, term}>, completed: Set<string> }
 */
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

/**
 * Evaluate parsed student data against the active rubric criteria (and, if
 * present, a requested course swap) and return a recommendation.
 *
 * Every enabled rubric criterion is backed by a real, derivable signal where
 * one exists (GPA off the transcript, attendance off the transcript's
 * attendance table, prior-credit quality off the recorded mark, seat
 * availability for a "no schedule conflict" check, …). Where no real signal
 * exists yet (e.g. add/drop deadline data), the check is reported as
 * unverifiable (`passed: null`) rather than silently skipped or guessed —
 * unverifiable checks are excluded from the confidence ratio instead of
 * counting against (or for) the student.
 *
 * @param {object} studentData - output of parseTranscriptData, plus optional
 *   { fromCourse, toCourse, missingDocs } describing the requested swap and
 *   any required documents the submission is missing.
 * @param {Array<object>} criteria - active rubric from fetchRubricCriteria().
 * @returns {object} { decision: 'admit'|'deny'|'review', confidence, reason, checks }
 */
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
        // "Equivalent credit on file": prefer the actual prerequisite's
        // recorded mark; fall back to "any passing mark on the transcript"
        // when no specific course is being requested.
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
