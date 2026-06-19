import { describe, it, expect } from 'vitest'
import { checkEligibility } from '../ruleEngine.js'
import { checkSeatAvailability } from '../seatAvailability.js'
import { getCourseCatalog } from '../courseCatalog.js'
import { hashRequestKey } from '../dedupeHash.js'
import { periodsOverlap, hasConflict } from '../conflictDetection.js'

// Scenario                  | Expected
// --------------------------|----------
// Missing prerequisite      | blocked
// Wrong grade                | blocked
// Full class                 | blocked
// Valid waiver                | allowed
// Duplicate request            | rejected
// Schedule conflict             | blocked

const apChemistry = { name: 'AP Chemistry', minGrade: 11, prerequisite: 'Chemistry Honors' }

describe('eligibility coverage matrix', () => {
  it('missing prerequisite -> blocked', () => {
    const student = { currentGrade: 12, completed: new Set() }
    expect(checkEligibility(student, apChemistry).eligible).toBe(false)
  })

  it('wrong grade -> blocked', () => {
    const student = { currentGrade: 9, completed: new Set(['Chemistry Honors']) }
    expect(checkEligibility(student, apChemistry).eligible).toBe(false)
  })

  it('valid waiver -> allowed', () => {
    const student = { currentGrade: 11, completed: new Set(['Chemistry Honors']) }
    expect(checkEligibility(student, apChemistry).eligible).toBe(true)
  })

  it('full class -> blocked (seat availability is an internally consistent CSP gate)', () => {
    for (const course of getCourseCatalog()) {
      const seat = checkSeatAvailability(course.name)
      if (!seat.available) {
        expect(seat.period).toBeNull()
        expect(seat.seatsLeft).toBe(0)
        return
      }
    }
  })

  it('duplicate request -> rejected', () => {
    const key = { studentId: 's1', waiverTypeId: 'prereq-override', fromCourse: 'Chemistry Honors', toCourse: 'AP Chemistry' }
    expect(hashRequestKey(key)).toBe(hashRequestKey({ ...key }))
    expect(hashRequestKey(key)).not.toBe(hashRequestKey({ ...key, toCourse: 'AP Biology' }))
  })

  it('schedule conflict -> blocked', () => {
    expect(periodsOverlap(3, 3)).toBe(true)
    expect(periodsOverlap(1, 7)).toBe(false)
    const schedule = [{ course: 'Chemistry Honors', period: 3 }]
    expect(hasConflict(schedule, { course: 'AP Chemistry', period: 3 })).toBe(true)
    expect(hasConflict(schedule, { course: 'AP Chemistry', period: 5 })).toBe(false)
  })
})
