// Parses a course-list document into canonical catalog names.
import { matchCourseName } from './courseCatalog.js'

export function parseCourseListText(rawText) {
  const candidates = rawText
    .split(/[\r\n,;]+/)
    .map((s) => s.replace(/^[\s\-*•\d.)]+/, '').trim())
    .filter(Boolean)

  const recognized = []
  const unrecognized = []
  const seen = new Set()

  for (const raw of candidates) {
    const result = matchCourseName(raw)
    if (result) {
      if (!seen.has(result.course.name)) {
        seen.add(result.course.name)
        recognized.push({ raw, matched: result.course.name, similarity: result.similarity, exact: result.exact })
      }
    } else {
      unrecognized.push(raw)
    }
  }

  return { recognized, unrecognized, courseNames: recognized.map((r) => r.matched) }
}
