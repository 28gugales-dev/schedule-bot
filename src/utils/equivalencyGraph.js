// Weighted course-equivalency graph (substitution, not prerequisite): groups
// catalog courses by "core" subject after stripping level-qualifier words,
// so "AP Biology" / "Biology Honors" / "Biology" cluster together without a
// hand-maintained pairs list. Edge weight reflects how close the levels are.
import { getCourseCatalog } from './courseCatalog.js'
import { tokenize } from './levenshtein.js'

const QUALIFIERS = new Set([
  'ap', 'honors', 'accel', 'accelerated', 'concept', 'concepts',
  'connection', 'connections', 'conn', 'intro', 'introduction', 'de', 'ib', 'support', 'block',
])

function coreTokens(name) {
  return tokenize(name).filter((t) => !QUALIFIERS.has(t))
}

function coreKey(name) {
  return [...coreTokens(name)].sort().join(' ')
}

function weightFor(a, b) {
  const qa = new Set(tokenize(a).filter((t) => QUALIFIERS.has(t)))
  const qb = new Set(tokenize(b).filter((t) => QUALIFIERS.has(t)))
  const hasAp = qa.has('ap') || qb.has('ap')
  const hasHonors = qa.has('honors') || qb.has('honors')
  if (hasAp && hasHonors) return 0.85
  if (hasAp || hasHonors) return 0.7
  return 0.6
}

let _graph = null // Map<courseName, Array<{course, weight}>>

function buildGraph() {
  const byCore = new Map()
  for (const course of getCourseCatalog()) {
    const key = coreKey(course.name)
    if (!key) continue
    if (!byCore.has(key)) byCore.set(key, [])
    byCore.get(key).push(course.name)
  }
  const graph = new Map()
  for (const names of byCore.values()) {
    if (names.length < 2) continue
    for (const a of names) {
      graph.set(a, names.filter((b) => b !== a).map((b) => ({ course: b, weight: weightFor(a, b) })))
    }
  }
  return graph
}

function ensureGraph() {
  if (!_graph) _graph = buildGraph()
  return _graph
}

export function getEquivalents(courseName, minWeight = 0.5) {
  return (ensureGraph().get(courseName) ?? []).filter((e) => e.weight >= minWeight)
}

export function areEquivalent(a, b, minWeight = 0.5) {
  return getEquivalents(a, minWeight).some((e) => e.course === b)
}
