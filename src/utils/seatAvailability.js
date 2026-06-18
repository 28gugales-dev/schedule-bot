// PLACEHOLDER DATA (no real seat-roster feed yet): CSP-style seat check —
// variables = periods, constraint = capacity > enrolled.
import { fnv1aHash } from './dedupeHash.js'

const PERIODS = [1, 2, 3, 4, 5, 6, 7]
const CAPACITY = 30

function seatsEnrolledForPeriod(courseName, period) {
  const h = parseInt(fnv1aHash(`${courseName}|${period}`).slice(0, 4), 16)
  return h % (CAPACITY + 6) // occasionally over capacity -> that period is full
}

export function checkSeatAvailability(courseName) {
  for (const period of PERIODS) {
    const enrolled = seatsEnrolledForPeriod(courseName, period)
    if (enrolled < CAPACITY) {
      return { available: true, period, seatsLeft: CAPACITY - enrolled }
    }
  }
  return { available: false, period: null, seatsLeft: 0 }
}
