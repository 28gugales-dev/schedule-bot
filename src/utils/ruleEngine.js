// Data-driven eligibility checking. Rules are derived from the course
// catalog row itself (prerequisite + minimum grade) rather than hardcoded
// per-course conditionals, so adding/editing courses.tsv is enough to change
// what's enforced.

import { gradeRank } from './courseCatalog.js'

/**
 * @param {object} course - { name, minGrade, prerequisite }
 * @returns {Array<{ id: string, label: string, met: (student) => boolean }>}
 */
export function buildRulesForCourse(course) {
  const rules = []

  if (course.prerequisite) {
    rules.push({
      id: 'prereq',
      label: `Completed "${course.prerequisite}"`,
      met: (student) => student.completed.has(course.prerequisite),
    })
  }

  if (course.minGrade) {
    rules.push({
      id: 'grade',
      label: `Grade level >= ${course.minGrade}`,
      met: (student) => gradeRank(student.currentGrade) >= gradeRank(course.minGrade),
    })
  }

  return rules
}

/**
 * @param {object} student - { currentGrade: number, completed: Set<string> }
 * @param {object} course - catalog entry
 * @returns {{ eligible: boolean, failedRules: Array<{id, label}> }}
 */
export function checkEligibility(student, course) {
  const rules = buildRulesForCourse(course)
  const failedRules = rules.filter((r) => !r.met(student)).map(({ id, label }) => ({ id, label }))
  return { eligible: failedRules.length === 0, failedRules }
}
