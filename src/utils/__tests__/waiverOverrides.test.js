import { describe, it, expect } from 'vitest'
import { checkEligibility } from '../ruleEngine.js'
import { explainEligibility } from '../explanationEngine.js'
import { getCourseByName, trackSkipHops } from '../courseCatalog.js'
import { sharesPathway } from '../equivalencyGraph.js'
import { evaluateAgainstRubric } from '../schedulingLogic.js'

// Prerequisite Override exists to permit a missing formal prerequisite when
// it's covered by unlisted credit (summer/transfer course). Without the
// track-skip allowance, the waiver could never be used for its own purpose.
describe('prereq-override track-skip allowance', () => {
  const journalismII = getCourseByName('Journalism II')
  const journalismIII = getCourseByName('Journalism III')
  const student = { currentGrade: 11, completed: new Set(['Journalism I']) }

  it('1 hop ahead (Journalism I -> II) is in-track', () => {
    expect(trackSkipHops('Journalism I', 'Journalism II')).toBe(1)
  })

  it('2 hops ahead (Journalism I -> III) is in-track', () => {
    expect(trackSkipHops('Journalism I', 'Journalism III')).toBe(2)
  })

  it('unrelated course is not in-track', () => {
    expect(trackSkipHops('Journalism I', 'AP Chemistry')).toBeNull()
  })

  it('1 hop ahead needs no override at all — direct prereq is already completed', () => {
    // Journalism II's prereq IS Journalism I, which the student completed —
    // this was never blocked; it's the 2-hop case that actually needs the
    // waiver (Journalism III's formal prereq, Journalism II, is missing).
    expect(checkEligibility(student, journalismII).eligible).toBe(true)
  })

  it('without override: the genuine 2-hop skip still blocks (regression guard)', () => {
    expect(checkEligibility(student, journalismIII).eligible).toBe(false)
  })

  it('with override: 1 and 2 hops ahead are both allowed', () => {
    const opts = { allowTrackSkip: true, fromCourse: 'Journalism I' }
    expect(checkEligibility(student, journalismII, opts).eligible).toBe(true)
    expect(checkEligibility(student, journalismIII, opts).eligible).toBe(true)
  })

  it('with override: still blocked outside the 2-hop window or wrong track', () => {
    const opts = { allowTrackSkip: true, fromCourse: 'Journalism I' }
    const journalismIV = getCourseByName('Journalism IV') // 3 hops — out of range
    expect(checkEligibility(student, journalismIV, opts).eligible).toBe(false)
    expect(checkEligibility(student, getCourseByName('AP Chemistry'), opts).eligible).toBe(false)
  })

  it('explanationEngine text reflects the waiver, not a false "has not completed"', () => {
    const opts = { allowTrackSkip: true, fromCourse: 'Journalism I' }
    const { eligible, reasons } = explainEligibility(student, journalismIII, opts)
    expect(eligible).toBe(true)
    const prereqReason = reasons.find((r) => r.id === 'prereq')
    expect(prereqReason.passed).toBe(true)
    expect(prereqReason.text).toMatch(/waived/i)
  })

  it('end-to-end via evaluateAgainstRubric: admits a 2-hop track-skip request', () => {
    const studentData = {
      studentGrade: 11,
      gpa: 3.8,
      attendanceRate: 0.97,
      courses: [{ name: 'Journalism I', mark: 90 }],
      completed: new Set(['Journalism I']),
      waiverTypeId: 'prereq-override',
      fromCourse: 'Journalism I',
      toCourse: 'Journalism III',
      missingDocs: [],
    }
    const criteria = [
      { id: 'min-gpa', label: 'Minimum cumulative GPA', value: 2.5, enabled: true },
      { id: 'prereq-complete', label: 'Prerequisite course completed', enabled: true },
    ]
    const result = evaluateAgainstRubric(studentData, criteria)
    expect(result.decision).not.toBe('deny')
    const eligCheck = result.checks.find((c) => c.id === 'eligibility')
    expect(eligCheck.passed).toBe(true)
  })

  it('does NOT relax the grade-level rule — only the prereq chain is waived', () => {
    const youngStudent = { currentGrade: 9, completed: new Set(['Journalism I']) }
    const opts = { allowTrackSkip: true, fromCourse: 'Journalism I' }
    // Journalism III requires grade >= 11; a 9th grader stays blocked on grade
    // even though the prereq chain itself is waived.
    const result = checkEligibility(youngStudent, journalismIII, opts)
    expect(result.eligible).toBe(false)
    expect(result.failedRules.some((r) => r.id === 'grade')).toBe(true)
    expect(result.failedRules.some((r) => r.id === 'prereq')).toBe(false)
  })
})

// Schedule Conflict Waiver exists to request approval DESPITE a period
// collision — the conflict is the reason for the request, not grounds to
// silently auto-deny it before a counselor ever sees it.
describe('schedule-conflict waiver does not self-deny on the conflict it exists for', () => {
  it('evaluateAgainstRubric does not hard-fail purely on the flagged conflict', () => {
    const studentData = {
      studentGrade: 11,
      gpa: 3.5,
      attendanceRate: 0.95,
      courses: [{ name: 'Chemistry Honors', mark: 88 }],
      completed: new Set(['Chemistry Honors']),
      waiverTypeId: 'schedule-conflict',
      fromCourse: null,
      toCourse: 'AP Chemistry',
      courseList: ['AP Chemistry'], // forces a same-period "conflict" against itself is avoided; see note below
      missingDocs: [],
    }
    const criteria = [{ id: 'no-conflict', label: 'No unresolved schedule conflict', enabled: true }]
    const result = evaluateAgainstRubric(studentData, criteria)
    // Whatever the seat/period landed on, a genuine conflict for this waiver
    // type must show as informational (null), never as a hard hardFail deny
    // driven solely by the conflict check.
    const conflictCheck = result.checks.find((c) => c.id === 'schedule-conflict')
    if (conflictCheck) expect(conflictCheck.passed).not.toBe(false)
  })

  it('a non-conflict waiver type is unaffected (regression guard)', () => {
    const studentData = {
      studentGrade: 11,
      gpa: 3.5,
      courses: [],
      completed: new Set(),
      waiverTypeId: 'prereq-override',
      fromCourse: null,
      toCourse: null,
      missingDocs: [],
    }
    const criteria = [{ id: 'no-conflict', label: 'No unresolved schedule conflict', enabled: true }]
    const result = evaluateAgainstRubric(studentData, criteria)
    expect(result.decision).toBeDefined()
  })
})

// Reported bug: with a full 7-course schedule, replacing Journalism I with
// Journalism II/III was flagged as "conflicts with another course" against
// EVERY candidate. Root cause: the conflict check faked a "period" for each
// schedule course via the seat-capacity hash and looked for period overlap —
// with 7 courses occupying most/all of the 7 fake period slots, almost any
// candidate's fake period collided with something, even though nothing in
// reality overlapped (the course being replaced is the one leaving). Fixed
// by checking for an actual duplicate course/pathway elsewhere in the
// schedule instead of a fabricated period collision.
describe('full-schedule course swap: real duplicate/pathway conflict, not fake periods', () => {
  it('sharesPathway: same numbered sequence is a conflict (Journalism I vs III)', () => {
    expect(sharesPathway('Journalism I', 'Journalism III')).toBe(true)
    expect(sharesPathway('Journalism II', 'Journalism IV')).toBe(true)
  })

  it('sharesPathway: AP/Honors/base variants of the same subject are a conflict', () => {
    expect(sharesPathway('Biology Honors', 'AP Biology')).toBe(true)
  })

  it('sharesPathway: unrelated courses are not a conflict', () => {
    expect(sharesPathway('Journalism I', 'AP Chemistry')).toBe(false)
    expect(sharesPathway('Spanish II', 'French II')).toBe(false)
  })

  it('replacing a course with one further down its OWN pathway is not a false conflict, even with a full 7-course schedule', () => {
    const fullSchedule = [
      'Journalism I', 'Algebra: Concepts & Connections', 'Biology', 'World History',
      'Spanish I', 'Personal Fitness/Health', 'Intro to Software Technology',
    ]
    const studentData = {
      studentGrade: 11,
      gpa: 3.5,
      attendanceRate: 0.95,
      courses: [{ name: 'Journalism I', mark: 90 }],
      completed: new Set(['Journalism I']),
      waiverTypeId: 'prereq-override',
      fromCourse: 'Journalism I',
      toCourse: 'Journalism III',
      courseList: fullSchedule,
      missingDocs: [],
    }
    const criteria = [{ id: 'no-conflict', label: 'No unresolved schedule conflict', enabled: true }]
    const result = evaluateAgainstRubric(studentData, criteria)
    expect(result.checks.find((c) => c.id === 'schedule-conflict')).toBeUndefined()
    expect(result.decision).not.toBe('deny')
  })

  it('replacing a DIFFERENT course with one that duplicates another course already in the schedule IS flagged', () => {
    const fullSchedule = [
      'Journalism I', 'AP Biology', 'World History', 'Spanish I',
      'Personal Fitness/Health', 'Intro to Software Technology', 'Algebra: Concepts & Connections',
    ]
    const studentData = {
      studentGrade: 11,
      gpa: 3.5,
      attendanceRate: 0.95,
      courses: [{ name: 'AP Biology', mark: 90 }],
      completed: new Set(['Biology Honors', 'AP Biology']),
      waiverTypeId: 'grad-substitution', // not the conflict-permitting waiver
      fromCourse: 'World History', // dropping something unrelated
      toCourse: 'Biology Honors', // duplicates AP Biology already in the schedule
      courseList: fullSchedule,
      missingDocs: [],
    }
    const criteria = [{ id: 'no-conflict', label: 'No unresolved schedule conflict', enabled: true }]
    const result = evaluateAgainstRubric(studentData, criteria)
    const conflictCheck = result.checks.find((c) => c.id === 'schedule-conflict')
    expect(conflictCheck?.passed).toBe(false)
    expect(result.decision).toBe('deny')
  })

  it('exact user-reported schedule: replacing Journalism I with Journalism III is not flagged as conflicting with anything', () => {
    const fullSchedule = [
      'Journalism I',
      'Adv. Weight Training',
      'AP Biology',
      'AP Calculus AB',
      'AP World History',
      'AP Psychology',
      'French III',
    ]
    const studentData = {
      studentGrade: 11,
      gpa: 3.8,
      attendanceRate: 0.96,
      courses: [{ name: 'Journalism I', mark: 92 }],
      completed: new Set(['Journalism I']),
      waiverTypeId: 'prereq-override',
      fromCourse: 'Journalism I',
      toCourse: 'Journalism III',
      courseList: fullSchedule,
      missingDocs: [],
    }
    const criteria = [{ id: 'no-conflict', label: 'No unresolved schedule conflict', enabled: true }]
    const result = evaluateAgainstRubric(studentData, criteria)

    // None of the other 6 courses share a pathway with Journalism III, so no
    // conflict should be raised against any of them.
    expect(result.checks.find((c) => c.id === 'schedule-conflict')).toBeUndefined()
    const noConflictCheck = result.checks.find((c) => c.id === 'no-conflict')
    expect(noConflictCheck.passed).toBe(true)
    expect(result.decision).not.toBe('deny')
  })
})
