// ============================================================================
// ALGORITHM BOUNDARY — INTENTIONALLY UNIMPLEMENTED
// ============================================================================
// Per the project boundary rule (see PLANNING_SCRATCHPAD.md §1), the core
// scheduling/evaluation algorithm is OUT OF SCOPE for this scaffold. These two
// functions are the single seam where that logic will live. The rest of the
// app is built so that filling these in — and pointing the API at them — is
// the only change needed to go from mock recommendations to real ones.
//
// Until then: the mock API (services/api.js) serves canned recommendation data
// so the admin review panel renders. Do NOT replicate real logic elsewhere.
// ============================================================================

class NotImplementedError extends Error {
  constructor(fn) {
    super(`${fn} is an intentional stub — algorithm logic is out of scope for this scaffold.`)
    this.name = 'NotImplementedError'
    this.code = 'NOT_IMPLEMENTED'
  }
}

/**
 * Parse a student's transcript document into structured course/grade data.
 *
 * NOTE: transcripts are no longer student-uploaded — academic history now comes
 * structured straight from the district SIS via fetchOneRosterRecord()
 * (`completedCourses` + `gpa`). This PDF-parsing path is therefore only needed
 * for out-of-district / transfer transcripts the SIS doesn't hold; for in-SIS
 * students, feed the OneRoster record into evaluateAgainstRubric() directly.
 *
 * Expected (future) return shape:
 *   {
 *     gpa: number,
 *     courses: Array<{ name: string, grade: string, credits: number, term: string }>,
 *     totalCredits: number,
 *   }
 *
 * Implementation notes for whoever builds this:
 *   - Input is a file URL (Supabase Storage signed URL or path).
 *   - Likely path: fetch PDF -> OCR/text-extract -> normalize -> structure.
 *   - Keep all extraction + normalization inside this module.
 *
 * @param {string} fileUrl - location of the uploaded transcript document
 * @returns {Promise<object>} structured transcript data
 */
export async function parseTranscriptData(fileUrl) {
  void fileUrl
  throw new NotImplementedError('parseTranscriptData')
}

/**
 * Evaluate parsed student data against the active rubric criteria and return a
 * recommendation. This is what the admin "algorithm recommendation" card shows
 * in production (mock API supplies sample output of this shape today).
 *
 * Expected (future) return shape:
 *   {
 *     decision: 'admit' | 'deny' | 'review',
 *     confidence: number,   // 0..1
 *     reason: string,
 *     checks: Array<{ id: string, label: string, passed: boolean }>,
 *   }
 *
 * Implementation notes:
 *   - `studentData` is the output of parseTranscriptData + the request payload.
 *   - `criteria` is the active rubric from fetchRubricCriteria().
 *   - Cross-check schedule conflicts and prerequisite coverage here.
 *
 * @param {object} studentData - parsed transcript + request context
 * @param {Array<object>} criteria - active rubric criteria
 * @returns {Promise<object>} recommendation object
 */
export async function evaluateAgainstRubric(studentData, criteria) {
  void studentData
  void criteria
  throw new NotImplementedError('evaluateAgainstRubric')
}
