// DFS over the prerequisite graph: "if I drop this course, what becomes impossible?"
import { getDirectDependents } from './courseCatalog.js'

export function findDependents(courseName) {
  const visited = new Set()
  const stack = [courseName]
  const impacted = []
  while (stack.length > 0) {
    const current = stack.pop()
    for (const dependent of getDirectDependents(current)) {
      if (visited.has(dependent)) continue
      visited.add(dependent)
      impacted.push(dependent)
      stack.push(dependent)
    }
  }
  return impacted
}

export function analyzeDropImpact(courseName) {
  const impacted = findDependents(courseName)
  return {
    courseName,
    impacted,
    warning: impacted.length > 0 ? `Dropping "${courseName}" blocks: ${impacted.join(', ')}` : null,
  }
}
