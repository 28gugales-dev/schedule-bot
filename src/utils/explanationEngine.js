// Explainability layer: turns a pass/fail rule check into a human-readable
// reason with the actual values plugged in, for both passed and failed rules.
import { buildRulesForCourse } from './ruleEngine.js'
import { trackSkipHops } from './courseCatalog.js'

// Mirrors ruleEngine.checkEligibility's track-skip override (see there for
// why) so the explanation text agrees with the eligibility verdict instead
// of saying "has not completed X" right next to a course it just allowed.
export function explainEligibility(student, course, options = {}) {
  const rules = buildRulesForCourse(course)
  const reasons = []
  let eligible = true
  const hops = options.allowTrackSkip ? trackSkipHops(options.fromCourse, course.name) : null

  for (const rule of rules) {
    let met = rule.met(student)
    const overridden = rule.id === 'prereq' && !met && hops != null
    if (overridden) met = true
    if (!met) eligible = false
    if (rule.id === 'prereq') {
      reasons.push({
        id: rule.id,
        passed: met,
        text: overridden
          ? `Prerequisite waived — ${hops} step${hops > 1 ? 's' : ''} ahead of "${options.fromCourse}" in this track`
          : met
            ? `Completed "${course.prerequisite}"`
            : `Has not completed "${course.prerequisite}"`,
      })
    } else if (rule.id === 'grade') {
      reasons.push({
        id: rule.id,
        passed: met,
        text: met
          ? `Grade level ${student.currentGrade} meets the requirement (>= ${course.minGrade})`
          : `Grade level ${student.currentGrade} is below the requirement (>= ${course.minGrade})`,
      })
    }
  }

  return { eligible, reasons }
}

// Renders a numeric threshold check ("GPA 4.24 >= 2.5 required") instead of a bare label.
export function explainNumericCheck(label, actual, threshold, passed, unit = '') {
  if (actual == null) return `${label} (no data on file)`
  return `${label} (${actual}${unit} ${passed ? '>=' : '<'} ${threshold}${unit} required)`
}
