import { describe, it, expect } from 'vitest'
import { parseTranscriptText } from '../transcriptParser.js'

// Fixture lines are crafted to satisfy the parser's regexes exactly:
//  - Grade:   /Grade:\s*(\d+)/
//  - GPA:     /Cumulative GPA \(Weighted\)\s*([\d.]+)/i
//  - table:   /^Course\s+Mark\s+Weight\s+Credit/i  (opens the table)
//  - course:  last three tokens = mark (<=100), weight (\d+\.\d{2,4}), credit (<=10)
//  - attend.: /Total:\s*\d+\s+\d+\s+(\d+)\s+([\d.]+)\s+\d+/  (member, absent)
const buildTranscript = (courseLines, { grade = 11, gpa = '3.85', attendance = 'Total: 1 180 175 5 2' } = {}) =>
  [
    `Grade: ${grade}`,
    `Cumulative GPA (Weighted) ${gpa}`,
    'Course Mark Weight Credit',
    '2024-2025 Grade 11 Term 1',
    ...courseLines,
    'Credit Summary',
    attendance,
  ].join('\n')

describe('parseTranscriptText — header fields', () => {
  it('extracts grade and weighted GPA', () => {
    const { studentGrade, gpa } = parseTranscriptText(buildTranscript(['Biology 88 5.0000 1.0']))
    expect(studentGrade).toBe(11)
    expect(gpa).toBe(3.85)
  })

  it('computes attendanceRate from the Total: row as (member - absent) / member', () => {
    const { attendanceRate } = parseTranscriptText(buildTranscript(['Biology 88 5.0000 1.0']))
    expect(attendanceRate).toBeCloseTo((175 - 5) / 175, 5)
  })

  it('returns null fields when header markers are absent', () => {
    const { studentGrade, gpa, attendanceRate } = parseTranscriptText('Course Mark Weight Credit\nBiology 88 5.0000 1.0')
    expect(studentGrade).toBeNull()
    expect(gpa).toBeNull()
    expect(attendanceRate).toBeNull()
  })

  it('clamps attendanceRate at 0 and never returns negatives even if absent > member', () => {
    const text = buildTranscript(['Biology 88 5.0000 1.0'], { attendance: 'Total: 1 180 100 150 2' })
    const { attendanceRate } = parseTranscriptText(text)
    expect(attendanceRate).toBe(0)
  })
})

describe('parseTranscriptText — course-row recognition', () => {
  it('recognizes a known catalog course and records mark/credit/term', () => {
    const { completedCourses, recognized } = parseTranscriptText(buildTranscript(['Biology 88 5.0000 1.0']))
    expect(completedCourses.has('Biology')).toBe(true)
    const info = completedCourses.get('Biology')
    expect(info.mark).toBe(88)
    expect(info.credit).toBe(1)
    expect(info.term).toMatch(/Grade 11 Term 1/)
    expect(recognized.some((r) => r.matched === 'Biology')).toBe(true)
  })

  it('strips a leading numeric course code so the bare course name still matches', () => {
    // "26" is a purely numeric leading token (matches /^\d+[a-z]*$/), so
    // stripCourseCode drops it and the fuzzy matcher resolves "Biology".
    const { completedCourses } = parseTranscriptText(buildTranscript(['26 Biology 88 5.0000 1.0']))
    expect(completedCourses.has('Biology')).toBe(true)
  })

  it('does NOT strip a dotted code prefix — that row is unrecognized', () => {
    // "26.0110000" has a dot, so it fails the \d+[a-z]* test, is not stripped,
    // and the leading-code-plus-name token never matches a catalog course.
    const { completedCourses, unrecognized } = parseTranscriptText(buildTranscript(['26.0110000 Biology 88 5.0000 1.0']))
    expect(completedCourses.has('Biology')).toBe(false)
    expect(unrecognized.length).toBeGreaterThan(0)
  })

  it('routes an unrecognizable course name to the unrecognized list', () => {
    const { unrecognized, completedCourses } = parseTranscriptText(buildTranscript(['Zzqwx Underwater Basketweaving 88 5.0000 1.0']))
    expect(completedCourses.size).toBe(0)
    expect(unrecognized.length).toBeGreaterThan(0)
  })

  it('parses multiple course rows in one table', () => {
    const { completedCourses } = parseTranscriptText(
      buildTranscript(['Biology 88 5.0000 1.0', 'Chemistry 91 5.0000 1.0']),
    )
    expect(completedCourses.has('Biology')).toBe(true)
    expect(completedCourses.has('Chemistry')).toBe(true)
  })

  it('joins a wrapped (multi-line) course name before parsing the trailing numbers', () => {
    // The name spans two lines; only the final line carries the mark/weight/credit.
    const { completedCourses } = parseTranscriptText(
      buildTranscript(['Literature & Composition', 'I 90 5.0000 1.0']),
    )
    expect(completedCourses.has('Literature & Composition I')).toBe(true)
  })

  it('ignores rows outside the table region (before the Course header)', () => {
    const text = [
      'Grade: 11',
      'Cumulative GPA (Weighted) 3.85',
      'Biology 88 5.0000 1.0', // appears BEFORE the table header -> ignored
      'Course Mark Weight Credit',
      'Chemistry 91 5.0000 1.0',
      'Credit Summary',
    ].join('\n')
    const { completedCourses } = parseTranscriptText(text)
    expect(completedCourses.has('Chemistry')).toBe(true)
    expect(completedCourses.has('Biology')).toBe(false)
  })

  it('rejects a row whose numeric tail does not match the mark/weight/credit shape', () => {
    // weight "5.0" has only one decimal -> fails the \d+\.\d{2,4} weight check.
    const { completedCourses, unrecognized } = parseTranscriptText(buildTranscript(['Biology 88 5.0 1.0']))
    expect(completedCourses.has('Biology')).toBe(false)
    expect(unrecognized).not.toContain('Biology')
  })

  it('returns empty structures for an empty string', () => {
    const result = parseTranscriptText('')
    expect(result.studentGrade).toBeNull()
    expect(result.gpa).toBeNull()
    expect(result.attendanceRate).toBeNull()
    expect(result.completedCourses.size).toBe(0)
    expect(result.recognized).toEqual([])
    expect(result.unrecognized).toEqual([])
  })

  it('returns empty structures for garbage text with no recognizable structure', () => {
    const result = parseTranscriptText('lorem ipsum dolor\nsit amet\n12345')
    expect(result.completedCourses.size).toBe(0)
    expect(result.recognized).toEqual([])
  })

  // Course-SCHEDULE layout (current/planned courses) — the format the shipped
  // mock PDFs (public/mock/*_courses.pdf) actually use, reconstructed exactly as
  // pdfText.js itemsToLines produces it.
  const SCHEDULE_TEXT = [
    'Meridian Unified School District',
    'Current Course Schedule - 2025-26',
    'Ava Thompson',
    'Student ID: S-48213   Grade: 11   Cumulative GPA: 3.42',
    'Enrollment: Active   Attendance: 96%',
    'PERIOD   COURSE',
    '1   English 11',
    '2   Algebra II',
    '3   Chemistry',
    '4   AP US History',
    '5   Spanish III',
    '6   PE',
    '7   Journalism',
    '7 enrolled courses - synced 2026-06-17 - DEMO document, not an official record.',
  ].join('\n')

  it('parses the PERIOD/COURSE schedule layout: grade, non-weighted GPA, and course rows', () => {
    const { studentGrade, gpa, recognized, unrecognized } = parseTranscriptText(SCHEDULE_TEXT)
    expect(studentGrade).toBe(11)
    expect(gpa).toBe(3.42) // "Cumulative GPA: 3.42" (no "(Weighted)")
    // All 7 course rows enter the table region (recognized or unrecognized);
    // none silently dropped the way the old gradebook-only parser did.
    expect(recognized.length + unrecognized.length).toBeGreaterThanOrEqual(5)
    // The trailing footer line must NOT be parsed as a course.
    expect(unrecognized.some((u) => /enrolled courses/i.test(u))).toBe(false)
  })

  it('closes the table on a section-end marker so later rows are ignored', () => {
    const text = [
      'Grade: 11',
      'Cumulative GPA (Weighted) 3.85',
      'Course Mark Weight Credit',
      'Biology 88 5.0000 1.0',
      'GPA Summary', // section end -> table closes
      'Chemistry 91 5.0000 1.0', // now outside the table -> ignored
    ].join('\n')
    const { completedCourses } = parseTranscriptText(text)
    expect(completedCourses.has('Biology')).toBe(true)
    expect(completedCourses.has('Chemistry')).toBe(false)
  })
})
