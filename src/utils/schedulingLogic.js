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

/**
 * Parse a student's transcript text into structured course/grade data.
 *
 * @param {string} transcriptText - raw text extracted from the uploaded
 *   transcript (via pdfText.js) or pasted directly.
 * @returns {object} { gpa, studentGrade, courses: Array<{name, mark, credit, term}>, completed: Set<string> }
 */
export function parseTranscriptData(transcriptText) {
  const { studentGrade, gpa, completedCourses, recognized, unrecognized } = parseTranscriptText(transcriptText)
  const courses = [...completedCourses.entries()].map(([name, info]) => ({ name, ...info }))
  return {
    gpa,
    studentGrade,
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
 * @param {object} studentData - output of parseTranscriptData, plus optional
 *   { fromCourse, toCourse } describing the requested swap.
 * @param {Array<object>} criteria - active rubric from fetchRubricCriteria().
 * @returns {object} { decision: 'admit'|'deny'|'review', confidence, reason, checks }
 */
export function evaluateAgainstRubric(studentData, criteria) {
  const checks = []
  const student = { currentGrade: studentData.studentGrade, completed: studentData.completed ?? new Set() }

  // Rubric-driven checks (only ones we can actually derive from transcript data).
  for (const rule of criteria.filter((c) => c.enabled)) {
    if (rule.id === 'min-gpa') {
      const passed = (studentData.gpa ?? 0) >= rule.value
      checks.push({ id: rule.id, label: rule.label, passed })
    } else if (rule.id === 'prereq-complete' && studentData.toCourse) {
      const course = getCourseByName(studentData.toCourse)
      const passed = course ? checkEligibility(student, course).eligible : false
      checks.push({ id: rule.id, label: rule.label, passed })
    }
  }

  // Course-swap prerequisite/grade gate (Directed Graph + Rule Engine), if applicable.
  let hardFail = false
  if (studentData.toCourse) {
    const course = getCourseByName(studentData.toCourse)
    if (course) {
      const { eligible, failedRules } = checkEligibility(student, course)
      checks.push({ id: 'course-swap', label: `Eligible for "${studentData.toCourse}"`, passed: eligible })
      if (!eligible) {
        hardFail = true
        checks.push(...failedRules.map((r) => ({ id: `swap-${r.id}`, label: r.label, passed: false })))
      }
    }
  }

  const passedCount = checks.filter((c) => c.passed).length
  const confidence = checks.length > 0 ? passedCount / checks.length : 0.5

  let decision
  let reason
  if (hardFail) {
    decision = 'deny'
    reason = 'Prerequisite or grade-level requirement not met for the requested course.'
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
