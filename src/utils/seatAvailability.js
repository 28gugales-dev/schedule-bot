// PLACEHOLDER DATA: there is no real period/seat-roster feed yet, so seat
// counts here are deterministically generated per course name (not random
// per render) purely to demonstrate the constraint-satisfaction check this
// will eventually run against real Infinite Campus section data.
//
// Modeled as a tiny CSP: variables = periods (1-7), domain = seats left,
// constraint = capacity > enrolled. "Solving" is just picking the first
// period whose constraint is satisfied (a one-variable-at-a-time
// backtracking search degenerates to a linear scan here, but the shape -
// try a period, check the constraint, backtrack to the next - is the same
// one a multi-period/teacher-conflict version would use).

import { fnv1aHash } from './dedupeHash.js'

const PERIODS = [1, 2, 3, 4, 5, 6, 7]
const CAPACITY = 30

function seatsEnrolledForPeriod(courseName, period) {
  const h = parseInt(fnv1aHash(`${courseName}|${period}`).slice(0, 4), 16)
  return h % (CAPACITY + 6) // occasionally over capacity -> that period is full
}

/**
 * @returns {{ available: boolean, period: number | null, seatsLeft: number }}
 */
export function checkSeatAvailability(courseName) {
  for (const period of PERIODS) {
    const enrolled = seatsEnrolledForPeriod(courseName, period)
    if (enrolled < CAPACITY) {
      return { available: true, period, seatsLeft: CAPACITY - enrolled }
    }
  }
  return { available: false, period: null, seatsLeft: 0 }
}
