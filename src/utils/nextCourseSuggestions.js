// Bonus/informational: BFS over the prereq graph for "now eligible for" suggestions.
import { getCourseCatalog, getCourseByName } from './courseCatalog.js'
import { checkEligibility } from './ruleEngine.js'

export function suggestNextCourses(student, limit = 6) {
  const catalog = getCourseCatalog()
  const visited = new Set(student.completed)
  const queue = [...student.completed]
  const suggestions = []

  while (queue.length > 0 && suggestions.length < limit) {
    const name = queue.shift()
    for (const course of catalog) {
      if (course.prerequisite !== name) continue
      if (visited.has(course.name)) continue
      visited.add(course.name)
      const { eligible } = checkEligibility(student, getCourseByName(course.name))
      if (eligible) {
        suggestions.push(course.name)
        queue.push(course.name)
      }
    }
  }

  return suggestions.slice(0, limit)
}
