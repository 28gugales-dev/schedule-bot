// Parses courses.tsv (Course / Minimum Grade / Prerequisite) into a catalog
// and a directed prerequisite graph: edge prerequisite -> course means
// "course requires prerequisite". Exposes Kahn's-algorithm topological
// ordering for "what's unlocked next" queries.

import coursesTsv from '../../courses.tsv?raw'
import { bestFuzzyMatch, rankByRelevance } from './levenshtein.js'

function parseTsv(raw) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const [, ...rows] = lines // skip header
  const parsed = rows.map((line) => {
    const [name, minGrade, prerequisite] = line.split('\t').map((c) => c.trim())
    return {
      name,
      minGrade: Number(minGrade),
      prerequisite: prerequisite && prerequisite.toLowerCase() !== 'none' ? prerequisite : null,
    }
  })
  // courses.tsv has at least one literal duplicate row (e.g. "AP Research");
  // de-dupe by name so downstream Maps/keyed lists stay 1:1 with course names.
  const seen = new Set()
  return parsed.filter((c) => {
    if (seen.has(c.name)) return false
    seen.add(c.name)
    return true
  })
}

let _catalog = null
let _byName = null
let _children = null // prerequisite name -> [courses that require it]

function ensureLoaded() {
  if (_catalog) return
  _catalog = parseTsv(coursesTsv)
  _byName = new Map(_catalog.map((c) => [c.name, c]))
  _children = new Map()
  for (const course of _catalog) {
    if (!course.prerequisite) continue
    if (!_children.has(course.prerequisite)) _children.set(course.prerequisite, [])
    _children.get(course.prerequisite).push(course.name)
  }
}

export function getCourseCatalog() {
  ensureLoaded()
  return _catalog
}

export function getCourseByName(name) {
  ensureLoaded()
  return _byName.get(name) ?? null
}

/**
 * Resolve a raw/free-text course name (e.g. parsed off a transcript) to the
 * canonical catalog entry. Exact match wins; otherwise falls back to
 * Levenshtein similarity.
 */
export function matchCourseName(rawName, threshold = 0.55) {
  ensureLoaded()
  if (!rawName) return null
  const names = _catalog.map((c) => c.name)
  const result = bestFuzzyMatch(rawName, names, threshold)
  if (!result) return null
  return { course: _byName.get(result.match), similarity: result.similarity, exact: result.exact }
}

/**
 * Type-ahead suggestions for a partial, in-progress course name (used by the
 * course-list text boxes' autocomplete dropdown).
 */
export function suggestCourseNames(query, limit = 6) {
  ensureLoaded()
  return rankByRelevance(query, _catalog.map((c) => c.name), limit)
}

/**
 * Kahn's algorithm: topologically order the full prerequisite graph.
 * Returns courses in an order where every prerequisite appears before the
 * course(s) that depend on it.
 */
export function topologicalOrder() {
  ensureLoaded()
  const inDegree = new Map(_catalog.map((c) => [c.name, 0]))
  for (const course of _catalog) {
    if (course.prerequisite && inDegree.has(course.prerequisite)) {
      inDegree.set(course.name, inDegree.get(course.name) + 1)
    }
  }

  const queue = [...inDegree.entries()].filter(([, deg]) => deg === 0).map(([name]) => name)
  const order = []
  const remainingInDegree = new Map(inDegree)

  while (queue.length > 0) {
    const name = queue.shift()
    order.push(name)
    for (const child of _children.get(name) ?? []) {
      remainingInDegree.set(child, remainingInDegree.get(child) - 1)
      if (remainingInDegree.get(child) === 0) queue.push(child)
    }
  }
  return order
}

/**
 * Given the set of courses a student has completed, return the courses that
 * are now unlocked (prerequisite satisfied) but not yet completed -
 * i.e. one BFS/Kahn layer past what they've done.
 */
export function getUnlockedCourses(completedNames) {
  ensureLoaded()
  const completed = completedNames instanceof Set ? completedNames : new Set(completedNames)
  const unlocked = []
  for (const course of _catalog) {
    if (completed.has(course.name)) continue
    if (!course.prerequisite) continue // "none" prereq courses are always available, not "newly unlocked"
    if (completed.has(course.prerequisite)) unlocked.push(course.name)
  }
  return unlocked
}

export function gradeRank(grade) {
  const n = Number(grade)
  return Number.isFinite(n) ? n : 0
}
