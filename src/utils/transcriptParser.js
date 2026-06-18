// Heuristic line-based parser for transcript text (handles wrapped course-name lines).
import { matchCourseName } from './courseCatalog.js'

const TERM_LINE = /^\d{4}-\d{4}\s+Grade\s+\d+\s+Term\s+\d+/i
const CREDIT_LINE = /^Credit:\s*[\d.]+\s*GPA:\s*[\d.]+/i
const SCHOOL_HEADER = /^#\S/
const TABLE_HEADER = /^Course\s+Mark\s+Weight\s+Credit/i
const SECTION_END = /^(Credit Summary|Comments|GPA Summary|Attendance|Enrollment Summary)/i
const MAX_WRAP_LINES = 4

function splitLastThreeNumbers(tokens) {
  if (tokens.length < 4) return null
  const len = tokens.length
  const markTok = tokens[len - 3]
  const weightTok = tokens[len - 2]
  const creditTok = tokens[len - 1]
  const markOk = /^\d{1,3}$/.test(markTok) && Number(markTok) <= 100
  const weightOk = /^\d+\.\d{2,4}$/.test(weightTok)
  const creditOk = /^\d+(\.\d+)?$/.test(creditTok) && Number(creditTok) <= 10
  if (!markOk || !weightOk || !creditOk) return null
  return {
    nameTokens: tokens.slice(0, len - 3),
    mark: Number(markTok),
    weight: Number(weightTok),
    credit: Number(creditTok),
  }
}

function stripCourseCode(nameTokens) {
  if (nameTokens.length <= 1) return nameTokens.join(' ')
  const [first, ...rest] = nameTokens
  const looksLikeCode = /^\d+[a-z]*$/i.test(first)
  return (looksLikeCode ? rest : nameTokens).join(' ')
}

export function parseTranscriptText(rawText) {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  const gradeMatch = rawText.match(/Grade:\s*(\d+)/)
  const gpaMatch = rawText.match(/Cumulative GPA\s*\(Weighted\)\s*([\d.]+)/i)
  const studentGrade = gradeMatch ? Number(gradeMatch[1]) : null
  const gpa = gpaMatch ? Number(gpaMatch[1]) : null

  // Attendance "Total:" row: Years | Calendar Days | Member Days | Absent Days | Tardy.
  const attendanceMatch = rawText.match(/Total:\s*\d+\s+\d+\s+(\d+)\s+([\d.]+)\s+\d+/)
  let attendanceRate = null
  if (attendanceMatch) {
    const memberDays = Number(attendanceMatch[1])
    const absentDays = Number(attendanceMatch[2])
    if (memberDays > 0) attendanceRate = Math.max(0, (memberDays - absentDays) / memberDays)
  }

  let inTable = false
  let currentTerm = null
  let buffer = []

  const completedCourses = new Map() // canonicalName -> { mark, credit, term, raw }
  const recognized = []
  const unrecognized = []

  function flushAsNoise() {
    buffer = []
  }

  function tryEmit() {
    const joined = buffer.join(' ')
    const tokens = joined.split(/\s+/).filter(Boolean)
    const parsed = splitLastThreeNumbers(tokens)
    if (!parsed) return false
    const rawName = stripCourseCode(parsed.nameTokens)
    buffer = []

    const result = matchCourseName(rawName)
    if (result) {
      completedCourses.set(result.course.name, {
        mark: parsed.mark,
        credit: parsed.credit,
        term: currentTerm,
        raw: rawName,
      })
      recognized.push({ raw: rawName, matched: result.course.name, similarity: result.similarity, exact: result.exact })
    } else {
      unrecognized.push(rawName)
    }
    return true
  }

  for (const line of lines) {
    if (SECTION_END.test(line)) {
      inTable = false
      flushAsNoise()
      continue
    }
    if (TABLE_HEADER.test(line)) {
      inTable = true
      flushAsNoise()
      continue
    }
    if (!inTable) continue

    if (SCHOOL_HEADER.test(line)) {
      flushAsNoise()
      continue
    }
    if (TERM_LINE.test(line)) {
      currentTerm = line
      flushAsNoise()
      continue
    }
    if (CREDIT_LINE.test(line)) {
      flushAsNoise()
      continue
    }

    buffer.push(line)
    if (!tryEmit() && buffer.length > MAX_WRAP_LINES) flushAsNoise()
  }

  return { studentGrade, gpa, attendanceRate, completedCourses, recognized, unrecognized }
}
