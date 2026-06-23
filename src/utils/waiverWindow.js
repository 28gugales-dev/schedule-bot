// Pure waiver open/close-window logic. A waiver type carries optional `openAt`
// and `closeAt` 'YYYY-MM-DD' date strings (a null/empty bound = unbounded). The
// window is date-inclusive and compared by calendar day. 'YYYY-MM-DD' strings
// sort lexically in chronological order, so plain string comparison is correct
// and avoids any timezone math. No DOM, no React — unit-testable.

// Local calendar day as 'YYYY-MM-DD' (matches <input type="date"> + a Postgres
// `date` column). Local, not UTC, so "closes today" lines up with the operator's
// wall clock rather than flipping a few hours early/late.
export function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'inactive' | 'scheduled' (not open yet) | 'closed' (past close) | 'open'.
export function waiverWindowStatus(waiver, today = todayStr()) {
  if (!waiver?.active) return 'inactive'
  if (waiver.openAt && today < waiver.openAt) return 'scheduled'
  if (waiver.closeAt && today > waiver.closeAt) return 'closed'
  return 'open'
}

// True only when a student may submit against this form right now.
export function isWaiverOpen(waiver, today = todayStr()) {
  return waiverWindowStatus(waiver, today) === 'open'
}

// Short human label for a status (UI badges + closed-reason messages).
export function windowStatusLabel(status) {
  return { open: 'Open', scheduled: 'Opens later', closed: 'Closed', inactive: 'Inactive' }[status] ?? status
}
