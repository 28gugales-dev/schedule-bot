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

// Sequential level markers ("Journalism I" / "II" / "III" / "IV") stripped on
// top of the AP/Honors qualifiers above, so the whole numbered family
// collapses to one "pathway" key — distinct from areEquivalent, which is for
// AP/Honors/base variants of the SAME level, not different levels of the
// same sequence.
const SEQUENCE_TOKENS = new Set(['i', 'ii', 'iii', 'iv', 'v', 'vi'])

function pathwayKey(name) {
  return tokenize(name)
    .filter((t) => !QUALIFIERS.has(t) && !SEQUENCE_TOKENS.has(t))
    .sort()
    .join(' ')
}

// True if `a` and `b` are the same course, the same numbered-sequence family
// (e.g. "Journalism I" vs "Journalism III"), or AP/Honors/base level-variants
// of the same subject. Used to stop a schedule from holding two courses out
// of the same pathway at once — NOT a real period-collision check (the app
// has no real period data for a student's typed course list).
export function sharesPathway(a, b) {
  if (a === b) return true
  const key = pathwayKey(a)
  if (key && key === pathwayKey(b)) return true
  return areEquivalent(a, b)
}
