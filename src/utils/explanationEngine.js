// Explainability layer: turns a pass/fail rule check into a human-readable
// reason with the actual values plugged in, for both passed and failed rules.
import { buildRulesForCourse } from './ruleEngine.js'

export function explainEligibility(student, course) {
  const rules = buildRulesForCourse(course)
  const reasons = []
  let eligible = true

  for (const rule of rules) {
    const met = rule.met(student)
    if (!met) eligible = false
    if (rule.id === 'prereq') {
      reasons.push({
        id: rule.id,
        passed: met,
        text: met ? `Completed "${course.prerequisite}"` : `Has not completed "${course.prerequisite}"`,
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
