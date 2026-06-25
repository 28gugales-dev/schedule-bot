// Data-driven eligibility rules, derived from each courses.tsv row.
import { gradeRank, trackSkipHops } from './courseCatalog.js'

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

  // NOTE: the digest's upper grade bound (course.maxGrade) is intentionally NOT a
  // hard rule. Those ranges are the *typical* grade, not a ceiling — e.g. Biology
  // shows 9-10 but juniors/seniors may still take it. maxGrade is kept as catalog
  // metadata for display/advisories only, never as an eligibility gate.

  return rules
}

// `options.allowTrackSkip` + `options.fromCourse`: for the Prerequisite
// Override waiver, a missing formal prerequisite is waived when the target
// course is within 2 forward hops of a course the student already
// completed/is dropping — that's exactly the "covered by unlisted credit"
// case the waiver exists for. Without this, the override waiver couldn't
// actually be used to do the one thing it's named for.
export function checkEligibility(student, course, options = {}) {
  const rules = buildRulesForCourse(course)
  let failedRules = rules.filter((r) => !r.met(student)).map(({ id, label }) => ({ id, label }))

  if (options.allowTrackSkip && options.fromCourse) {
    const hops = trackSkipHops(options.fromCourse, course.name)
    if (hops != null) failedRules = failedRules.filter((r) => r.id !== 'prereq')
  }

  return { eligible: failedRules.length === 0, failedRules }
}
