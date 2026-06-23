import { describe, it, expect } from 'vitest'
import { parseTranscriptData, evaluateAgainstRubric } from '../schedulingLogic.js'
import { checkSeatAvailability } from '../seatAvailability.js'

// Rubric criteria mirror the shape evaluateAgainstRubric consumes ({ id, label,
// value, enabled }). We drive deterministic decisions through the no-swap path:
// with no toCourse, the prereq/no-conflict/within-window checks all report
// passed: null and drop out of the confidence ratio, leaving only the numeric
// (gpa/attendance) and prior-credit rules — all of which we control directly.
const gpaRule = { id: 'min-gpa', label: 'Minimum GPA 2.5', value: 2.5, enabled: true }
const attendanceRule = { id: 'min-attendance', label: 'Attendance >= 90%', value: 90, enabled: true }

describe('evaluateAgainstRubric — no-swap (rubric-only) path', () => {
  it('admits when every verifiable numeric rule passes (confidence 1.0)', () => {
    const studentData = { gpa: 3.8, attendanceRate: 0.95, studentGrade: 11, courses: [] }
    const result = evaluateAgainstRubric(studentData, [gpaRule, attendanceRule])
    expect(result.decision).toBe('admit')
    expect(result.confidence).toBe(1)
    expect(result.reason).toBe('All checked requirements are satisfied.')
    expect(result.checks.find((c) => c.id === 'min-gpa').passed).toBe(true)
    expect(result.checks.find((c) => c.id === 'min-attendance').passed).toBe(true)
  })

  it('denies when most verifiable rules fail (confidence < 0.5)', () => {
    const studentData = { gpa: 1.0, attendanceRate: 0.4, studentGrade: 9, courses: [] }
    const result = evaluateAgainstRubric(studentData, [gpaRule, attendanceRule])
    expect(result.decision).toBe('deny')
    expect(result.confidence).toBe(0)
    expect(result.reason).toBe('Most requirements are unmet.')
  })

  it('routes to review when confidence lands in [0.5, 0.8)', () => {
    // One of two numeric rules passes -> 0.5 -> review.
    const studentData = { gpa: 3.8, attendanceRate: 0.4, studentGrade: 11, courses: [] }
    const result = evaluateAgainstRubric(studentData, [gpaRule, attendanceRule])
    expect(result.confidence).toBe(0.5)
    expect(result.decision).toBe('review')
    expect(result.reason).toMatch(/unverifiable from the transcript alone/)
  })

  it('formats numeric labels with the actual value and the >=/< comparator', () => {
    const studentData = { gpa: 3.2, attendanceRate: 0.72, studentGrade: 10, courses: [] }
    const result = evaluateAgainstRubric(studentData, [gpaRule, attendanceRule])
    const gpaCheck = result.checks.find((c) => c.id === 'min-gpa')
    const attCheck = result.checks.find((c) => c.id === 'min-attendance')
    expect(gpaCheck.label).toBe('Minimum GPA 2.5 (3.2 >= 2.5)')
    // attendanceRate * 100 is rounded before comparison: 72% < 90.
    expect(attCheck.label).toBe('Attendance >= 90% (72% < 90%)')
  })
})

describe('evaluateAgainstRubric — missing / unverifiable data', () => {
  it('treats missing gpa & attendance as unverifiable (passed: null), excluded from confidence', () => {
    const studentData = { gpa: null, attendanceRate: null, studentGrade: 11, courses: [] }
    const result = evaluateAgainstRubric(studentData, [gpaRule, attendanceRule])
    const gpaCheck = result.checks.find((c) => c.id === 'min-gpa')
    const attCheck = result.checks.find((c) => c.id === 'min-attendance')
    expect(gpaCheck.passed).toBeNull()
    expect(gpaCheck.label).toBe('Minimum GPA 2.5 (no data on file)')
    expect(attCheck.passed).toBeNull()
    // No verifiable checks at all -> confidence defaults to 0.5 -> review.
    expect(result.confidence).toBe(0.5)
    expect(result.decision).toBe('review')
  })

  it('handles entirely empty studentData (no fields) without throwing', () => {
    const result = evaluateAgainstRubric({}, [gpaRule, attendanceRule])
    expect(result.decision).toBe('review')
    expect(result.confidence).toBe(0.5)
    expect(Array.isArray(result.checks)).toBe(true)
  })

  it('handles an empty criteria list — defaults to 0.5 confidence / review', () => {
    const result = evaluateAgainstRubric({ gpa: 3.9, attendanceRate: 0.99 }, [])
    expect(result.checks).toEqual([])
    expect(result.confidence).toBe(0.5)
    expect(result.decision).toBe('review')
  })

  it('ignores disabled rules entirely', () => {
    const studentData = { gpa: 1.0, attendanceRate: 0.99, studentGrade: 11, courses: [] }
    const disabledGpa = { ...gpaRule, enabled: false }
    const result = evaluateAgainstRubric(studentData, [disabledGpa, attendanceRule])
    // Failing GPA rule is disabled, so only attendance (passing) is evaluated.
    expect(result.checks.find((c) => c.id === 'min-gpa')).toBeUndefined()
    expect(result.confidence).toBe(1)
    expect(result.decision).toBe('admit')
  })
})

describe('evaluateAgainstRubric — prior-credit & within-window special rules', () => {
  const priorCreditRule = { id: 'prior-credit', label: 'Prior credit earned', value: 1, enabled: true }
  const windowRule = { id: 'within-window', label: 'Within deadline window', value: 1, enabled: true }

  it('passes prior-credit when any transcript course mark >= 70 (no swap requested)', () => {
    const studentData = { gpa: 3.9, courses: [{ name: 'Biology', mark: 88 }], studentGrade: 11 }
    const result = evaluateAgainstRubric(studentData, [priorCreditRule])
    expect(result.checks.find((c) => c.id === 'prior-credit').passed).toBe(true)
  })

  it('fails prior-credit when all transcript marks are below 70', () => {
    const studentData = { gpa: 1.0, courses: [{ name: 'Biology', mark: 50 }], studentGrade: 11 }
    const result = evaluateAgainstRubric(studentData, [priorCreditRule])
    expect(result.checks.find((c) => c.id === 'prior-credit').passed).toBe(false)
  })

  it('reports prior-credit as unverifiable (null) when there is no transcript on file', () => {
    const studentData = { gpa: 3.9, courses: [], studentGrade: 11 }
    const result = evaluateAgainstRubric(studentData, [priorCreditRule])
    const check = result.checks.find((c) => c.id === 'prior-credit')
    expect(check.passed).toBeNull()
    expect(check.label).toBe('Prior credit earned (no transcript on file)')
  })

  it('always reports within-window as unverifiable (no deadline data)', () => {
    const result = evaluateAgainstRubric({ gpa: 3.9, courses: [] }, [windowRule])
    const check = result.checks.find((c) => c.id === 'within-window')
    expect(check.passed).toBeNull()
    expect(check.label).toBe('Within deadline window (no deadline data on file)')
  })

  it('ignores unknown rule ids (e.g. counselor-note) without producing a check', () => {
    const note = { id: 'counselor-note', label: 'Counselor note attached', value: 1, enabled: true }
    const result = evaluateAgainstRubric({ gpa: 3.9, courses: [] }, [note])
    expect(result.checks).toEqual([])
  })
})

describe('evaluateAgainstRubric — missing documents gate', () => {
  it('routes to review with a missing-docs reason even when rubric would admit', () => {
    const studentData = { gpa: 3.9, attendanceRate: 0.99, studentGrade: 11, courses: [], missingDocs: ['Transcript', 'ID'] }
    const result = evaluateAgainstRubric(studentData, [gpaRule, attendanceRule])
    expect(result.decision).toBe('review')
    expect(result.reason).toBe('Missing required document(s): Transcript, ID.')
  })
})

describe('evaluateAgainstRubric — swap path (course requested)', () => {
  it('denies an ineligible swap (missing prereq) via a hard eligibility fail', () => {
    // AP Chemistry requires Chemistry Honors + grade 11; student has neither.
    const studentData = {
      gpa: 3.9,
      attendanceRate: 0.99,
      studentGrade: 9,
      completed: new Set(),
      courses: [],
      toCourse: 'AP Chemistry',
      courseList: [],
    }
    const result = evaluateAgainstRubric(studentData, [gpaRule])
    expect(result.decision).toBe('deny')
    // Eligibility check is appended and failed; this is robust regardless of the
    // hash-determined seat outcome.
    const eligibility = result.checks.find((c) => c.id === 'eligibility')
    expect(eligibility).toBeDefined()
    expect(eligibility.passed).toBe(false)
  })

  it("skips the swap machinery when toCourse is the sentinel 'None'", () => {
    const studentData = { gpa: 3.9, attendanceRate: 0.99, studentGrade: 11, courses: [], toCourse: 'None' }
    const result = evaluateAgainstRubric(studentData, [gpaRule, attendanceRule])
    expect(result.checks.find((c) => c.id === 'eligibility')).toBeUndefined()
    expect(result.decision).toBe('admit')
  })

  it('emits a seat or conflict check consistent with checkSeatAvailability for an eligible swap', () => {
    // Biology: minGrade 9, no prerequisite -> any 9th+ grader is eligible.
    const toCourse = 'Biology'
    const seat = checkSeatAvailability(toCourse) // deterministic, computed in-test
    const studentData = {
      gpa: 3.9,
      attendanceRate: 0.99,
      studentGrade: 11,
      completed: new Set(),
      courses: [],
      toCourse,
      courseList: [],
    }
    const result = evaluateAgainstRubric(studentData, [gpaRule])
    const eligibility = result.checks.find((c) => c.id === 'eligibility')
    expect(eligibility.passed).toBe(true)
    if (!seat.available) {
      // Seat full -> hard fail with a seat check + deny.
      expect(result.checks.find((c) => c.id === 'seat').passed).toBe(false)
      expect(result.decision).toBe('deny')
    } else {
      // Seat available -> no 'seat' fail check is appended.
      expect(result.checks.find((c) => c.id === 'seat')).toBeUndefined()
    }
  })

  it('appends an informational dependency-impact note (passed: null) when dropping a prerequisite course', () => {
    // Dropping Biology blocks many downstream courses (Chemistry, Biology II, ...).
    const studentData = {
      gpa: 3.9,
      attendanceRate: 0.99,
      studentGrade: 11,
      courses: [],
      fromCourse: 'Biology',
    }
    const result = evaluateAgainstRubric(studentData, [gpaRule])
    const impact = result.checks.find((c) => c.id === 'dependency-impact')
    expect(impact).toBeDefined()
    expect(impact.passed).toBeNull()
    expect(impact.label).toMatch(/Dropping "Biology" blocks:/)
  })
})

describe('parseTranscriptData', () => {
  const sample = [
    'Grade: 11',
    'Cumulative GPA (Weighted) 3.85',
    'Course Mark Weight Credit',
    '2024-2025 Grade 11 Term 1',
    'Biology 88 5.0000 1.0',
    'Credit Summary',
    'Total: 1 180 175 5 2',
  ].join('\n')

  it('returns structured gpa / grade / attendance / courses with a completed Set', () => {
    const data = parseTranscriptData(sample)
    expect(data.gpa).toBe(3.85)
    expect(data.studentGrade).toBe(11)
    expect(data.attendanceRate).toBeCloseTo((175 - 5) / 175, 5)
    expect(data.completed).toBeInstanceOf(Set)
    expect(data.completed.has('Biology')).toBe(true)
    const bio = data.courses.find((c) => c.name === 'Biology')
    expect(bio.mark).toBe(88)
    expect(bio.credit).toBe(1)
  })

  it('returns empty/null fields for an empty transcript without throwing', () => {
    const data = parseTranscriptData('')
    expect(data.gpa).toBeNull()
    expect(data.studentGrade).toBeNull()
    expect(data.attendanceRate).toBeNull()
    expect(data.courses).toEqual([])
    expect(data.completed.size).toBe(0)
  })
})
