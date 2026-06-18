// Data-driven eligibility rules, derived from each courses.tsv row.
import { gradeRank } from './courseCatalog.js'

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

export function checkEligibility(student, course) {
  const rules = buildRulesForCourse(course)
  const failedRules = rules.filter((r) => !r.met(student)).map(({ id, label }) => ({ id, label }))
  return { eligible: failedRules.length === 0, failedRules }
}
