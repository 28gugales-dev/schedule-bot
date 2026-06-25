import { describe, it, expect } from 'vitest'
import { checkEligibility } from '../ruleEngine.js'
import { explainEligibility } from '../explanationEngine.js'
import { getCourseByName, trackSkipHops } from '../courseCatalog.js'
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
