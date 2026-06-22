import { describe, it, expect } from 'vitest'
import {
  intervalsOverlap,
  periodsOverlap,
  overlapsLunch,
  hasConflict,
  findScheduleConflicts,
} from '../conflictDetection.js'

// eligibility.test.js already covers the basic periodsOverlap(3,3)/hasConflict
// happy path; this file targets the untested intervalsOverlap / overlapsLunch /
// findScheduleConflicts plus the null/unknown-period edge cases.

describe('intervalsOverlap', () => {
  it('detects overlapping intervals (half-open: start < end)', () => {
    expect(intervalsOverlap(480, 530, 500, 560)).toBe(true)
  })

  it('treats touching endpoints as non-overlapping', () => {
    // [480,530) then [530,580): they touch at 530 but do not overlap.
    expect(intervalsOverlap(480, 530, 530, 580)).toBe(false)
  })

  it('returns false for fully disjoint intervals', () => {
    expect(intervalsOverlap(480, 530, 600, 650)).toBe(false)
  })

  it('detects full containment', () => {
    expect(intervalsOverlap(480, 600, 500, 520)).toBe(true)
  })
})

describe('periodsOverlap', () => {
  it('returns true for identical periods', () => {
    expect(periodsOverlap(3, 3)).toBe(true)
  })

  it('returns false for distinct non-adjacent periods', () => {
    expect(periodsOverlap(1, 7)).toBe(false)
    expect(periodsOverlap(2, 3)).toBe(false)
  })

  it('returns false when either period is null/undefined', () => {
    expect(periodsOverlap(null, 3)).toBe(false)
    expect(periodsOverlap(3, null)).toBe(false)
    expect(periodsOverlap(null, null)).toBe(false)
    expect(periodsOverlap(undefined, 3)).toBe(false)
  })

  it('returns false for an unknown period number not in the time table', () => {
    expect(periodsOverlap(99, 3)).toBe(false)
    expect(periodsOverlap(3, 0)).toBe(false)
  })
})

describe('overlapsLunch', () => {
  it('flags a period whose interval crosses the fixed lunch block [695,725)', () => {
    // Period 5 starts at 700, inside the lunch block -> overlaps.
    expect(overlapsLunch(5)).toBe(true)
  })

  it('returns false for a period clear of the lunch window', () => {
    // Period 1 [480,530) is well before lunch [695,725).
    expect(overlapsLunch(1)).toBe(false)
  })

  it('returns false for an unknown period', () => {
    expect(overlapsLunch(99)).toBe(false)
    expect(overlapsLunch(null)).toBe(false)
  })
})

describe('hasConflict', () => {
  it('flags a new entry that collides with an existing same-period course', () => {
    const schedule = [{ course: 'Chemistry Honors', period: 3 }]
    expect(hasConflict(schedule, { course: 'AP Chemistry', period: 3 })).toBe(true)
  })

  it('allows a new entry in a free period', () => {
    const schedule = [{ course: 'Chemistry Honors', period: 3 }]
    expect(hasConflict(schedule, { course: 'AP Chemistry', period: 5 })).toBe(false)
  })

  it('returns false against an empty schedule', () => {
    expect(hasConflict([], { course: 'Biology', period: 1 })).toBe(false)
  })

  it('ignores existing entries with a null period (free-period placeholders)', () => {
    const schedule = [{ course: 'Study Hall', period: null }]
    expect(hasConflict(schedule, { course: 'Biology', period: 1 })).toBe(false)
  })
})

describe('findScheduleConflicts', () => {
  it('returns every pairwise same-period conflict', () => {
    const schedule = [
      { course: 'A', period: 1 },
      { course: 'B', period: 1 },
      { course: 'C', period: 2 },
    ]
    const conflicts = findScheduleConflicts(schedule)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({ courseA: 'A', courseB: 'B', period: 1 })
  })

  it('finds multiple distinct conflicting pairs', () => {
    // Three courses all in period 1 -> C(3,2) = 3 conflicting pairs.
    const schedule = [
      { course: 'A', period: 1 },
      { course: 'B', period: 1 },
      { course: 'C', period: 1 },
    ]
    expect(findScheduleConflicts(schedule)).toHaveLength(3)
  })

  it('returns an empty array for a conflict-free schedule', () => {
    const schedule = [
      { course: 'A', period: 1 },
      { course: 'B', period: 2 },
      { course: 'C', period: 3 },
    ]
    expect(findScheduleConflicts(schedule)).toEqual([])
  })

  it('returns an empty array for an empty or single-course schedule', () => {
    expect(findScheduleConflicts([])).toEqual([])
    expect(findScheduleConflicts([{ course: 'A', period: 1 }])).toEqual([])
  })
})
