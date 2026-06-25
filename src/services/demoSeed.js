// Permanent demo record — Avery Mitchell, grade 11, real transcript data
// (see demo/avery-mitchell-transcript.pdf). Requesting a Prerequisite
// Override to skip from Journalism I to Journalism III ("Will take the
// course over summer through FVA.").
//
// Deliberately hardcoded HERE, not in Supabase: api.js overlays this record
// into the review queue regardless of backend mode (real or local), and
// "deciding" it never writes anywhere — admitting/denying it only flips an
// in-memory flag for the current session, so she's always back, fresh and
// pending, the next time anyone logs in. No real database rows involved.
export const AVERY_STUDENT_ID = 'demo-avery-mitchell'
export const AVERY_REQUEST_ID = 'demo-req-avery-mitchell'

const COMPLETED_COURSES = [
  { name: 'Literature & Composition I Honors', mark: 96, credit: 1, term: '2024-2025 Grade 09 Term 2' },
  { name: 'Biology Honors', mark: 94, credit: 1, term: '2024-2025 Grade 09 Term 2' },
  { name: 'Geometry: Concepts & Connections Honors', mark: 98, credit: 1, term: '2024-2025 Grade 09 Term 2' },
  { name: 'Intro to Software Technology', mark: 100, credit: 1, term: '2024-2025 Grade 09 Term 2' },
  { name: 'AP Human Geography', mark: 92, credit: 1, term: '2024-2025 Grade 09 Term 2' },
  { name: 'French I', mark: 95, credit: 1, term: '2024-2025 Grade 09 Term 2' },
  { name: 'Visual Arts I', mark: 98, credit: 1, term: '2024-2025 Grade 09 Term 2' },
  { name: 'Literature & Composition II Honors', mark: 93, credit: 1, term: '2025-2026 Grade 10 Term 1' },
  { name: 'Chemistry Honors', mark: 95, credit: 1, term: '2025-2026 Grade 10 Term 1' },
  { name: 'Advanced Algebra: Concepts & Connections Honors', mark: 97, credit: 1, term: '2025-2026 Grade 10 Term 1' },
  { name: 'AP World History', mark: 90, credit: 1, term: '2025-2026 Grade 10 Term 1' },
  { name: 'AP Computer Science Principles', mark: 98, credit: 1, term: '2025-2026 Grade 10 Term 1' },
  { name: 'French II', mark: 94, credit: 1, term: '2025-2026 Grade 10 Term 1' },
  { name: 'AP Psychology', mark: 96, credit: 1, term: '2025-2026 Grade 10 Term 1' },
  { name: 'AP Environmental Science', mark: 95, credit: 1, term: '2025-2026 Grade 10 Term 2' },
  { name: 'AP Statistics', mark: 97, credit: 1, term: '2025-2026 Grade 10 Term 2' },
  { name: 'AP Pre-Calculus', mark: 92, credit: 1, term: '2025-2026 Grade 10 Term 2' },
  { name: 'World Geography/ US History in Film', mark: 99, credit: 1, term: '2025-2026 Grade 10 Term 2' },
  { name: 'Journalism I', mark: 100, credit: 1, term: '2025-2026 Grade 10 Term 2' },
  { name: 'General PE II', mark: 100, credit: 1, term: '2025-2026 Grade 10 Term 2' },
  { name: 'Personal Financial Literacy', mark: 98, credit: 1, term: '2025-2026 Grade 10 Term 2' },
]

const COURSE_LIST = ['Journalism I', 'Adv. Weight Training', 'AP Biology', 'AP Calculus AB', 'AP World History', 'AP Psychology', 'French III']

const RECOMMENDATION = {
  decision: 'admit',
  confidence: 1,
  reason: 'All checked requirements are satisfied.',
  checks: [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (4.53 >= 2.5)', passed: true },
    { id: 'min-attendance', label: 'Minimum attendance rate % (99 >= 85)', passed: true },
    { id: 'prereq-complete', label: 'Prerequisite course completed', passed: true },
    { id: 'prior-credit', label: 'Prior equivalent credit on transcript', passed: true },
    { id: 'no-conflict', label: 'No unresolved schedule conflict', passed: true },
    { id: 'eligibility', label: 'Eligible for "Journalism III"', passed: true },
    { id: 'reason-prereq', label: 'Prerequisite waived — 2 steps ahead of "Journalism I" in this track', passed: true },
    { id: 'reason-grade', label: 'Grade level 11 meets the requirement (>= 11)', passed: true },
  ],
}

export const AVERY_REQUEST = {
  id: AVERY_REQUEST_ID,
  student: { name: 'Avery Mitchell', id: AVERY_STUDENT_ID, grade: 11, gpa: 4.53 },
  waiverTypeId: 'prereq-override',
  submittedAt: new Date().toISOString(),
  documents: [],
  courseList: COURSE_LIST,
  fromCourse: 'Journalism I',
  toCourse: 'Journalism III',
  studentNote: 'Will take the course over summer through FVA.',
  formAnswers: {
    'prereq-name': 'Journalism II',
    coverage: 'Will take the course over summer through FVA.',
    'evidence-type': 'summer-program',
  },
  formSchemaSnapshot: [
    { id: 'prereq-header', type: 'sectionHeader', label: 'Prerequisite details', content: 'Tell us which prerequisite you want to skip and how it is already covered.' },
    { id: 'prereq-name', type: 'shortText', label: 'Which prerequisite are you requesting to skip?', required: true, helpText: 'Use the course name as it appears in the catalog.', placeholder: 'e.g. Algebra II', maxLength: 120 },
    { id: 'coverage', type: 'longText', label: 'How is the prerequisite already covered?', required: true, helpText: 'Prior course, test score, or relevant experience.', placeholder: '' },
    { id: 'evidence-type', type: 'select', label: 'Type of evidence', required: true, options: [
      { value: 'prior-course', label: 'Prior course / transfer credit' },
      { value: 'test-score', label: 'Standardized test score' },
      { value: 'summer-program', label: 'Summer / community-college program' },
      { value: 'other', label: 'Other' },
    ] },
    { id: 'evidence-file', type: 'file', label: 'Supporting evidence (optional)', required: false, helpText: 'Transcript excerpt, score report, or certificate.', accept: '.pdf,.png,.jpg,.jpeg', multiple: false },
  ],
  recommendation: RECOMMENDATION,
  ruleVersion: 'graduation_2026_demo',
}

export const AVERY_ONE_ROSTER = {
  studentId: AVERY_STUDENT_ID,
  gpa: 4.53,
  attendanceRate: 99,
  gradeLevel: 11,
  enrollmentStatus: 'Active',
  lastSync: new Date().toISOString(),
  completedCourses: COMPLETED_COURSES.map((c) => ({
    name: c.name,
    grade: c.mark >= 93 ? 'A' : c.mark >= 90 ? 'A-' : c.mark >= 87 ? 'B+' : 'B',
    gradeYear: c.term.includes('Grade 09') ? 9 : 10,
    term: c.term.includes('Grade 09') ? '2024–25' : '2025–26',
  })),
  currentSchedule: COURSE_LIST.map((course, i) => ({ course, period: i + 1 })),
}
