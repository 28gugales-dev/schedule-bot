// Classic Levenshtein edit-distance + a "best match against a candidate list"
// helper. Used to fuzzy-match free-text course names (from a parsed
// transcript/course-list) against the canonical names in courses.tsv.

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

/**
 * Find the best-matching candidate string for `input`.
 * @param {string} input
 * @param {string[]} candidates
 * @param {number} threshold - minimum similarity (0..1) to count as a match
 * @returns {{ match: string, similarity: number, exact: boolean } | null}
 */
export function bestFuzzyMatch(input, candidates, threshold = 0.55) {
  const needle = input.trim()
  if (!needle) return null

  // Exact (case-insensitive) match short-circuits the fuzzy scan.
  const exact = candidates.find((c) => c.toLowerCase() === needle.toLowerCase())
  if (exact) return { match: exact, similarity: 1, exact: true }

  let best = null
  for (const candidate of candidates) {
    const score = similarity(needle, candidate)
    if (!best || score > best.similarity) {
      best = { match: candidate, similarity: score, exact: false }
    }
  }
  if (!best || best.similarity < threshold) return null
  return best
}
