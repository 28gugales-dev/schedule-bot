// Parses courses.tsv into a catalog + directed prerequisite graph, enriched with
// the 2026-27 SFHS Course Digest (course codes, grade ranges, category) — see
// src/data/courseDigest.json, generated from the official digest spreadsheet.
import coursesTsv from '../../courses.tsv?raw'
import courseDigest from '../data/courseDigest.json'
import { bestFuzzyMatch, rankByRelevance } from './levenshtein.js'

// Normalise a course name to the same key shape the digest is keyed by, so a
// courses.tsv row ("Chemistry *") matches its digest entry ("Chemistry").
function digestKey(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[*@†‡]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\d+\s*periods?\s*in\s*schedule/g, '') // drop "2 Periods in Schedule" suffix
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-*]+|[\s\-*]+$/g, '')
}

// Hand maintained aliases: courses.tsv name (normalised) -> digest key, for the
// handful the digest abbreviates or annotates differently. Without these the row
// still works but misses its code/grade/category metadata.
const DIGEST_ALIASES = {
  'ap macroeconomics': 'ap micro/macroeconomics',
  'ap computer science principles': 'ap computer science prin.',
  'fashion, merchandising, retailing': 'fashion, merchandising, ret',
  'drama-musical theater': 'drama- musical theater- audition required for intermediate and advanced classes',
  'drama-acting': 'drama- acting- audition required for intermediate and advanced classes',
  band: 'band- audition required',
  chorus: 'chorus- audition required for intermediate and advanced classes',
}

function lookupDigest(name) {
  const key = digestKey(name)
  // Prefer a direct, fully-coded digest entry; only fall back to the alias target
  // when there's no direct hit (or the direct hit is a code-less name-only stub).
  const direct = courseDigest[key]
  if (direct?.code) return direct
  return courseDigest[DIGEST_ALIASES[key] ?? key] ?? direct ?? null
}

function parseTsv(raw) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const [, ...rows] = lines // skip header
  const parsed = rows.map((line) => {
    const [name, minGrade, prerequisite] = line.split('\t').map((c) => c.trim())
    // Enrich with the digest entry when its normalised name (or alias) matches.
    const digest = lookupDigest(name)
    const tsvMin = Number(minGrade)
    return {
      name,
      // courses.tsv is authoritative for minGrade; backfill from the digest grade
      // range start only when the tsv value is missing/0.
      minGrade: tsvMin || digest?.gradeMin || 0,
      // Upper grade bound — digest-only; null means "no ceiling".
      maxGrade: digest?.gradeMax ?? null,
      prerequisite: prerequisite && prerequisite.toLowerCase() !== 'none' ? prerequisite : null,
      code: digest?.code ?? null,
      category: digest?.category ?? null,
      // Soft signal: present in the current-year digest. Not an eligibility gate.
      offered: Boolean(digest),
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

// Courses that directly require `name` as their prerequisite.
export function getDirectDependents(name) {
  ensureLoaded()
  return _children.get(name) ?? []
}

// Resolves a raw/free-text course name to the canonical catalog entry.
export function matchCourseName(rawName, threshold = 0.55) {
  ensureLoaded()
  if (!rawName) return null
  const names = _catalog.map((c) => c.name)
  const result = bestFuzzyMatch(rawName, names, threshold)
  if (!result) return null
  return { course: _byName.get(result.match), similarity: result.similarity, exact: result.exact }
}

// Type-ahead suggestions for the course-list text boxes' autocomplete.
export function suggestCourseNames(query, limit = 6) {
  ensureLoaded()
  return rankByRelevance(query, _catalog.map((c) => c.name), limit)
}

// Kahn's algorithm: topologically orders the full prerequisite graph.
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

// How many forward hops `toCourseName` is from `fromCourseName` in the
// prerequisite graph (1 = direct next course, 2 = the one after that), or
// null if unreachable within maxHops. Powers the Prerequisite Override
// "track skip" allowance: completed Journalism I -> Journalism II (1 hop)
// or Journalism III (2 hops) are both in-track even without Journalism II
// formally on file (e.g. covered by an unlisted summer/transfer course).
export function trackSkipHops(fromCourseName, toCourseName, maxHops = 2) {
  ensureLoaded()
  if (!fromCourseName || !toCourseName) return null
  let frontier = [fromCourseName]
  for (let hop = 1; hop <= maxHops; hop++) {
    const next = []
    for (const course of frontier) {
      for (const child of _children.get(course) ?? []) {
        if (child === toCourseName) return hop
        next.push(child)
      }
    }
    frontier = next
  }
  return null
}

// Courses now unlocked (prerequisite satisfied) but not yet completed.
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
