// Interval-overlap conflict detection over fixed class periods (startA < endB AND startB < endA).
const PERIOD_TIMES = {
  1: [480, 530], // 8:00-8:50
  2: [535, 585],
  3: [590, 640],
  4: [645, 695],
  5: [700, 750],
  6: [755, 805],
  7: [810, 860],
}

// A fixed lunch wave that bridges the end of period 4 / start of period 5.
const LUNCH_BLOCK = [695, 725]

export function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA
}

export function periodsOverlap(periodA, periodB) {
  if (periodA == null || periodB == null) return false
  if (periodA === periodB) return true
  const a = PERIOD_TIMES[periodA]
  const b = PERIOD_TIMES[periodB]
  if (!a || !b) return false
  return intervalsOverlap(a[0], a[1], b[0], b[1])
}

export function overlapsLunch(period) {
  const a = PERIOD_TIMES[period]
  if (!a) return false
  return intervalsOverlap(a[0], a[1], LUNCH_BLOCK[0], LUNCH_BLOCK[1])
}

// Would adding `entry` ({course, period}) to `schedule` create a conflict?
export function hasConflict(schedule, entry) {
  return schedule.some((existing) => periodsOverlap(existing.period, entry.period))
}

// Every pairwise conflict across a full schedule ([{course, period}]).
export function findScheduleConflicts(schedule) {
  const conflicts = []
  for (let i = 0; i < schedule.length; i++) {
    for (let j = i + 1; j < schedule.length; j++) {
      if (periodsOverlap(schedule[i].period, schedule[j].period)) {
        conflicts.push({ courseA: schedule[i].course, courseB: schedule[j].course, period: schedule[i].period })
      }
    }
  }
  return conflicts
}
