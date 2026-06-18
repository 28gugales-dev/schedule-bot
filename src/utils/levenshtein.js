// Levenshtein edit-distance + word/relevance scoring for fuzzy course matching.
export function levenshteinDistance(a, b) {
  const s = a.toLowerCase()
  const t = b.toLowerCase()
  const m = s.length
  const n = t.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

// Normalized similarity in [0, 1]; 1 = identical, 0 = completely different.
export function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

export function tokenize(str) {
  return str.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}

// Jaccard-ish word overlap — catches reordered/abbreviated names that fool plain edit distance.
export function wordOverlapScore(a, b) {
  const ta = new Set(tokenize(a))
  const tb = new Set(tokenize(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let common = 0
  for (const t of ta) if (tb.has(t)) common++
  return common / Math.max(ta.size, tb.size)
}

const WORD_WEIGHT = 0.7
const CHAR_WEIGHT = 0.3

function combinedScore(a, b) {
  return wordOverlapScore(a, b) * WORD_WEIGHT + similarity(a, b) * CHAR_WEIGHT
}

// Finds the best-matching candidate string for `input` (null if below threshold).
export function bestFuzzyMatch(input, candidates, threshold = 0.55) {
  const needle = input.trim()
  if (!needle) return null

  // Exact (case-insensitive) match short-circuits the fuzzy scan.
  const exact = candidates.find((c) => c.toLowerCase() === needle.toLowerCase())
  if (exact) return { match: exact, similarity: 1, exact: true }

  let best = null
  for (const candidate of candidates) {
    const score = combinedScore(needle, candidate)
    if (!best || score > best.similarity) {
      best = { match: candidate, similarity: score, exact: false }
    }
  }
  if (!best || best.similarity < threshold) return null
  return best
}

// Ranks catalog names by relevance to a partial, in-progress query (type-ahead).
export function rankByRelevance(query, candidates, limit = 6) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored = candidates.map((name) => {
    const lower = name.toLowerCase()
    const substringBoost = lower.includes(q) ? 1 : 0
    const score = substringBoost + combinedScore(q, name) * 0.5
    return { name, score }
  })
  return scored
    .filter((s) => s.score > 0.3)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((s) => s.name)
}
