// Seed data for the mocked service layer. Stands in for Supabase tables until
// real wiring lands. Shapes here ARE the contract the UI codes against, so the
// field names match what `services/api.js` resolves with.
//
// NOTE on `recommendation`: this simulates the OUTPUT of the algorithm that
// lives (as a stub) in `utils/schedulingLogic.js`. It is canned sample data so
// the admin review panel can render a recommendation card during UI dev. It is
// NOT produced by real logic — see the boundary rule in PLANNING_SCRATCHPAD.md.

export const WAIVER_TYPES = [
  {
    id: 'prereq-override',
    name: 'Prerequisite Override',
    description: 'Skip a listed prerequisite when prior coursework or scores cover it.',
    active: true,
    requiredDocs: ['transcript', 'courseList'],
  },
  {
    id: 'schedule-conflict',
    name: 'Schedule Conflict Waiver',
    description: 'Resolve two required courses scheduled in the same block.',
    active: true,
    requiredDocs: ['courseList'],
  },
  {
    id: 'credit-recovery',
    name: 'Credit Recovery',
    description: 'Recover credit for a failed course via an alternate path.',
    active: true,
    requiredDocs: ['transcript', 'supporting'],
  },
  {
    id: 'ap-entry',
    name: 'Advanced Placement Entry',
    description: 'Enter an AP course without the standard gating sequence.',
    active: false,
    requiredDocs: ['transcript'],
  },
  {
    id: 'grad-substitution',
    name: 'Graduation Requirement Substitution',
    description: 'Substitute an equivalent course for a graduation requirement.',
    active: true,
    requiredDocs: ['transcript', 'courseList', 'supporting'],
  },
  {
    id: 'late-add-drop',
    name: 'Late Add/Drop',
    description: 'Add or drop a course after the standard registration deadline.',
    active: true,
    requiredDocs: ['courseList'],
  },
  {
    id: 'online-course',
    name: 'Online Course Approval',
    description: 'Enroll in an accredited online course for credit toward graduation.',
    active: true,
    requiredDocs: ['supporting'],
  },
  {
    id: 'pe-exemption',
    name: 'PE Exemption',
    description: 'Waive the physical education requirement due to health or athletic status.',
    active: false,
    requiredDocs: ['supporting'],
  },
]

export const RUBRIC_CRITERIA = [
  { id: 'min-gpa', label: 'Minimum cumulative GPA', type: 'number', value: 2.5, enabled: true },
  { id: 'prior-credit', label: 'Prior equivalent credit on transcript', type: 'boolean', value: true, enabled: true },
  { id: 'no-conflict', label: 'No unresolved schedule conflict', type: 'boolean', value: true, enabled: true },
  { id: 'counselor-note', label: 'Counselor note required on override', type: 'boolean', value: false, enabled: false },
  { id: 'min-attendance', label: 'Minimum attendance rate %', type: 'number', value: 85, enabled: true },
  { id: 'prereq-complete', label: 'Prerequisite course completed', type: 'boolean', value: true, enabled: true },
  { id: 'within-window', label: 'Within add/drop window', type: 'boolean', value: false, enabled: true },
]

// Pending review requests. Each carries everything the Unified Info Panel needs
// on a single screen: student, docs, course list, notes, algo recommendation.
export const REVIEW_QUEUE = [
  {
    id: 'req-1001',
    student: { name: 'Ava Thompson', id: 'S-48213', grade: 11, gpa: 3.42 },
    waiverTypeId: 'prereq-override',
    submittedAt: '2026-06-15T14:20:00Z',
    documents: [
      { type: 'transcript', name: 'ava_transcript.pdf', url: '/mock/ava_transcript.pdf' },
      { type: 'courseList', name: 'ava_courses.pdf', url: '/mock/ava_courses.pdf' },
    ],
    courseList: ['Algebra II', 'Chemistry', 'AP US History', 'Spanish III', 'PE'],
    studentNote: 'Took Honors Geometry over summer at community college — covers the missing prereq.',
    recommendation: { decision: 'admit', confidence: 0.86, reason: 'Prior equivalent credit found; GPA above threshold.' },
  },
  {
    id: 'req-1002',
    student: { name: 'Liam Park', id: 'S-50127', grade: 12, gpa: 2.18 },
    waiverTypeId: 'credit-recovery',
    submittedAt: '2026-06-15T16:05:00Z',
    documents: [
      { type: 'transcript', name: 'liam_transcript.pdf', url: '/mock/liam_transcript.pdf' },
      { type: 'supporting', name: 'liam_appeal.pdf', url: '/mock/liam_appeal.pdf' },
    ],
    courseList: ['English 12', 'Pre-Calculus', 'Biology', 'World History'],
    studentNote: 'Need to recover English 11 credit to stay on track for graduation.',
    recommendation: { decision: 'review', confidence: 0.41, reason: 'GPA below minimum; recovery path not confirmed on transcript.' },
  },
  {
    id: 'req-1003',
    student: { name: 'Maya Rodriguez', id: 'S-47788', grade: 10, gpa: 3.91 },
    waiverTypeId: 'schedule-conflict',
    submittedAt: '2026-06-16T09:30:00Z',
    documents: [
      { type: 'courseList', name: 'maya_courses.pdf', url: '/mock/maya_courses.pdf' },
    ],
    courseList: ['AP Biology', 'Honors English', 'Geometry', 'Band', 'French II'],
    studentNote: 'AP Bio and Band both in 4th period — requesting Band move to 6th.',
    recommendation: { decision: 'admit', confidence: 0.78, reason: 'Conflict verified; alternate block available.' },
  },
  {
    id: 'req-1004',
    student: { name: 'Jordan Kim', id: 'S-51834', grade: 12, gpa: 3.67 },
    waiverTypeId: 'grad-substitution',
    submittedAt: '2026-06-14T10:15:00Z',
    documents: [
      { type: 'transcript', name: 'jordan_transcript.pdf', url: '/mock/jordan_transcript.pdf' },
      { type: 'courseList', name: 'jordan_courses.pdf', url: '/mock/jordan_courses.pdf' },
      { type: 'supporting', name: 'jordan_memo.pdf', url: '/mock/jordan_memo.pdf' },
    ],
    courseList: ['AP Computer Science', 'Calculus AB', 'Physics', 'English 12', 'History'],
    studentNote: 'AP CS course covers required math science credit; already passed with 5 on exam.',
    recommendation: { decision: 'admit', confidence: 0.92, reason: 'Course equivalency confirmed; exam score validates mastery.' },
  },
  {
    id: 'req-1005',
    student: { name: 'Sophia Martinez', id: 'S-49276', grade: 9, gpa: 2.81 },
    waiverTypeId: 'online-course',
    submittedAt: '2026-06-16T13:45:00Z',
    documents: [
      { type: 'supporting', name: 'sophia_coursedesc.pdf', url: '/mock/sophia_coursedesc.pdf' },
    ],
    courseList: ['Algebra I', 'World Cultures', 'English 9', 'Physical Science', 'Art'],
    studentNote: 'Taking accredited summer photography course online to fulfill arts requirement.',
    recommendation: { decision: 'admit', confidence: 0.75, reason: 'Course meets requirements; provider recognized by state.' },
  },
  {
    id: 'req-1006',
    student: { name: 'Marcus Chen', id: 'S-52051', grade: 11, gpa: 3.28 },
    waiverTypeId: 'late-add-drop',
    submittedAt: '2026-06-15T11:20:00Z',
    documents: [
      { type: 'courseList', name: 'marcus_courses.pdf', url: '/mock/marcus_courses.pdf' },
    ],
    courseList: ['AP Statistics', 'Chemistry II', 'English 11', 'US History', 'PE'],
    studentNote: 'Need to drop Study Hall and add AP Stats before semester starts.',
    recommendation: { decision: 'deny', confidence: 0.68, reason: 'Deadline passed; recommend discussion with advisor for special circumstances.' },
  },
  {
    id: 'req-1007',
    student: { name: 'Isabella Fontaine', id: 'S-48962', grade: 10, gpa: 3.85 },
    waiverTypeId: 'ap-entry',
    submittedAt: '2026-06-14T15:30:00Z',
    documents: [
      { type: 'transcript', name: 'isabella_transcript.pdf', url: '/mock/isabella_transcript.pdf' },
    ],
    courseList: ['AP English Language', 'Honors Biology', 'Algebra II', 'World History', 'Spanish II'],
    studentNote: 'Completed 9th-grade English with A; ready for AP challenge in 10th grade.',
    recommendation: { decision: 'deny', confidence: 0.55, reason: 'AP course not currently accepting 10th-grade entries per department policy.' },
  },
  {
    id: 'req-1008',
    student: { name: 'Tyler Jackson', id: 'S-49847', grade: 11, gpa: 2.94 },
    waiverTypeId: 'credit-recovery',
    submittedAt: '2026-06-16T08:00:00Z',
    documents: [
      { type: 'transcript', name: 'tyler_transcript.pdf', url: '/mock/tyler_transcript.pdf' },
      { type: 'supporting', name: 'tyler_summer_plan.pdf', url: '/mock/tyler_summer_plan.pdf' },
    ],
    courseList: ['Precalc', 'Chemistry', 'English 11', 'AP US History', 'Weight Training'],
    studentNote: 'Failed Geometry freshman year; retaking online this summer to graduate on time.',
    recommendation: { decision: 'review', confidence: 0.52, reason: 'Timeline tight; depends on summer completion confirmation.' },
  },
  {
    id: 'req-1009',
    student: { name: 'Piper Okonkwo', id: 'S-50683', grade: 9, gpa: 3.73 },
    waiverTypeId: 'pe-exemption',
    submittedAt: '2026-06-15T14:50:00Z',
    documents: [
      { type: 'supporting', name: 'piper_doctor_note.pdf', url: '/mock/piper_doctor_note.pdf' },
    ],
    courseList: ['Algebra I', 'English 9', 'Biology', 'World Cultures', 'Spanish I'],
    studentNote: 'Recovering from knee surgery; physician recommends deferring PE to sophomore year.',
    recommendation: { decision: 'admit', confidence: 0.88, reason: 'Medical documentation provided; deferral appropriate for first-year student.' },
  },
  {
    id: 'req-1010',
    student: { name: 'Asher Wells', id: 'S-51205', grade: 12, gpa: 3.15 },
    waiverTypeId: 'schedule-conflict',
    submittedAt: '2026-06-14T12:10:00Z',
    documents: [
      { type: 'courseList', name: 'asher_courses.pdf', url: '/mock/asher_courses.pdf' },
    ],
    courseList: ['AP Calculus AB', 'English 12', 'Chemistry II', 'World History', 'Orchestra'],
    studentNote: 'Calc AB and Orchestra both scheduled period 3; need orchestra moved to period 5.',
    recommendation: { decision: 'deny', confidence: 0.71, reason: 'Period 5 full for Orchestra; recommend switching to fall elective.' },
  },
  {
    id: 'req-1011',
    student: { name: 'Hannah Rodriguez', id: 'S-52304', grade: 10, gpa: 3.56 },
    waiverTypeId: 'prereq-override',
    submittedAt: '2026-06-16T10:25:00Z',
    documents: [
      { type: 'transcript', name: 'hannah_transcript.pdf', url: '/mock/hannah_transcript.pdf' },
      { type: 'courseList', name: 'hannah_courses.pdf', url: '/mock/hannah_courses.pdf' },
    ],
    courseList: ['Honors Chemistry', 'Geometry', 'English 10', 'World History', 'French II'],
    studentNote: 'Strong math student; completed Algebra II honors summer before entering high school.',
    recommendation: { decision: 'admit', confidence: 0.81, reason: 'Honors track record supports readiness; prior credit confirmed.' },
  },
  {
    id: 'req-1012',
    student: { name: 'Zachary Brown', id: 'S-50456', grade: 11, gpa: 2.42 },
    waiverTypeId: 'online-course',
    submittedAt: '2026-06-15T09:40:00Z',
    documents: [
      { type: 'supporting', name: 'zachary_provider.pdf', url: '/mock/zachary_provider.pdf' },
    ],
    courseList: ['Precalculus', 'English 11', 'Chemistry', 'US History', 'PE'],
    studentNote: 'Enrolling in accredited online Business elective to balance course load.',
    recommendation: { decision: 'review', confidence: 0.48, reason: 'Provider approved; needs curriculum review to confirm credit equivalency.' },
  },
]

// Approved waivers waiting for the next Infinite Campus push (Batch Sync board).
export const BATCH_SYNC_QUEUE = [
  { id: 'req-0991', student: 'Noah Kim', waiver: 'Prerequisite Override', approvedAt: '2026-06-16T11:00:00Z', synced: false },
  { id: 'req-0994', student: 'Olivia Chen', waiver: 'Graduation Requirement Substitution', approvedAt: '2026-06-16T11:42:00Z', synced: false },
  { id: 'req-0997', student: 'Ethan Brooks', waiver: 'Schedule Conflict Waiver', approvedAt: '2026-06-16T12:15:00Z', synced: false },
  { id: 'req-0998', student: 'Grace Lee', waiver: 'Credit Recovery', approvedAt: '2026-06-15T14:30:00Z', synced: true },
  { id: 'req-0999', student: 'James Patterson', waiver: 'Late Add/Drop', approvedAt: '2026-06-14T16:20:00Z', synced: false },
  { id: 'req-1000', student: 'Sofia Gonzalez', waiver: 'Online Course Approval', approvedAt: '2026-06-13T10:50:00Z', synced: true },
  { id: 'req-1010', student: 'Amelia Taylor', waiver: 'PE Exemption', approvedAt: '2026-06-16T09:15:00Z', synced: false },
  { id: 'req-1011', student: 'David Martinez', waiver: 'Prerequisite Override', approvedAt: '2026-06-12T13:45:00Z', synced: true },
]

// Student-submitted waiver requests at various workflow stages for the student portal tracker.
export const SEED_SUBMISSIONS = [
  {
    id: 'req-2001',
    waiverTypeId: 'prereq-override',
    status: 'submitted',
    submittedAt: '2026-06-16T15:20:00Z',
    studentNote: 'Completed Statistics at community college last summer; ready for AP Bio.',
    documents: [
      { name: 'stats_transcript.pdf', type: 'transcript', size: 284512, url: '/mock/stats_transcript.pdf' },
    ],
  },
  {
    id: 'req-2002',
    waiverTypeId: 'schedule-conflict',
    status: 'automated-review',
    submittedAt: '2026-06-15T11:45:00Z',
    studentNote: 'Orchestra and Honors Chemistry both in Period 2; need conflict resolution.',
    documents: [
      { name: 'course_schedule.pdf', type: 'courseList', size: 156890, url: '/mock/course_schedule.pdf' },
    ],
  },
  {
    id: 'req-2003',
    waiverTypeId: 'credit-recovery',
    status: 'counselor-review',
    submittedAt: '2026-06-14T13:10:00Z',
    studentNote: 'Failed English 10 freshman year; retaking online and ready to submit proof.',
    documents: [
      { name: 'recovery_plan.pdf', type: 'supporting', size: 342105, url: '/mock/recovery_plan.pdf' },
      { name: 'transcript.pdf', type: 'transcript', size: 295671, url: '/mock/transcript.pdf' },
    ],
  },
  {
    id: 'req-2004',
    waiverTypeId: 'grad-substitution',
    status: 'approved',
    submittedAt: '2026-06-10T09:20:00Z',
    studentNote: 'AP Statistics fulfills senior math requirement; exam score validates mastery.',
    documents: [
      { name: 'ap_exam_score.pdf', type: 'supporting', size: 178234, url: '/mock/ap_exam_score.pdf' },
    ],
  },
  {
    id: 'req-2005',
    waiverTypeId: 'online-course',
    status: 'denied',
    submittedAt: '2026-06-12T14:55:00Z',
    studentNote: 'Trying to enroll in unaccredited online photography course.',
    documents: [
      { name: 'course_description.pdf', type: 'supporting', size: 121456, url: '/mock/course_description.pdf' },
    ],
  },
  {
    id: 'req-2006',
    waiverTypeId: 'late-add-drop',
    status: 'submitted',
    submittedAt: '2026-06-16T16:30:00Z',
    studentNote: 'Need to add AP Computer Science before summer session starts next week.',
    documents: [
      { name: 'add_request.pdf', type: 'courseList', size: 98765, url: '/mock/add_request.pdf' },
    ],
  },
]

// ============================================================================
// ONE ROSTER — authoritative SIS data (mock)
// ============================================================================
// Simulates the records a counselor would pull from the OneRoster API for a
// student during review: GPA, attendance, completed coursework, and current
// schedule straight from the system of record. Keyed by student id (the same
// `student.id` carried on each REVIEW_QUEUE entry). The review detail view
// shows this on the RIGHT — the authoritative truth the student's form claims
// (on the LEFT) get checked against.
//
// In production this is a server-side fetch against the district OneRoster
// endpoint; here it is canned. The per-criterion verification (REVIEW_CHECKS
// below) is the OUTPUT of `evaluateAgainstRubric` — served as data so the
// algorithm seam in utils/schedulingLogic.js stays an intentional stub.
export const ONE_ROSTER = {
  'S-48213': {
    studentId: 'S-48213', gpa: 3.42, attendanceRate: 96, gradeLevel: 11,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'Honors Geometry (Mercer Community College)', grade: 'A', term: 'Summer 2025' },
      { name: 'Algebra I', grade: 'A-', term: 'Fall 2024' },
      { name: 'English 10', grade: 'B+', term: 'Spring 2025' },
    ],
    currentSchedule: [
      { course: 'Algebra II', period: 2 }, { course: 'Chemistry', period: 3 },
      { course: 'AP US History', period: 4 }, { course: 'Spanish III', period: 5 },
      { course: 'PE', period: 6 },
    ],
  },
  'S-50127': {
    studentId: 'S-50127', gpa: 2.18, attendanceRate: 79, gradeLevel: 12,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'English 11', grade: 'F', term: 'Spring 2025' },
      { name: 'Algebra II', grade: 'C-', term: 'Fall 2024' },
    ],
    currentSchedule: [
      { course: 'English 12', period: 1 }, { course: 'Pre-Calculus', period: 3 },
      { course: 'Biology', period: 4 }, { course: 'World History', period: 5 },
    ],
  },
  'S-47788': {
    studentId: 'S-47788', gpa: 3.91, attendanceRate: 98, gradeLevel: 10,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'Honors Biology', grade: 'A', term: 'Spring 2025' },
      { name: 'Geometry', grade: 'A', term: 'Fall 2024' },
    ],
    currentSchedule: [
      { course: 'AP Biology', period: 4 }, { course: 'Band', period: 4 },
      { course: 'Honors English', period: 2 }, { course: 'Geometry', period: 1 },
      { course: 'French II', period: 5 },
    ],
  },
  'S-51834': {
    studentId: 'S-51834', gpa: 3.67, attendanceRate: 94, gradeLevel: 12,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'AP Computer Science A', grade: 'A', term: 'Spring 2025' },
      { name: 'Calculus AB', grade: 'B+', term: 'Fall 2024' },
    ],
    currentSchedule: [
      { course: 'AP Computer Science', period: 1 }, { course: 'Calculus AB', period: 2 },
      { course: 'Physics', period: 3 }, { course: 'English 12', period: 4 },
      { course: 'History', period: 5 },
    ],
  },
  'S-49276': {
    studentId: 'S-49276', gpa: 2.81, attendanceRate: 91, gradeLevel: 9,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'Art Foundations', grade: 'B', term: 'Fall 2025' },
    ],
    currentSchedule: [
      { course: 'Algebra I', period: 1 }, { course: 'World Cultures', period: 2 },
      { course: 'English 9', period: 3 }, { course: 'Physical Science', period: 4 },
      { course: 'Art', period: 5 },
    ],
  },
  'S-52051': {
    studentId: 'S-52051', gpa: 3.28, attendanceRate: 95, gradeLevel: 11,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'Algebra II', grade: 'A-', term: 'Spring 2025' },
      { name: 'Geometry', grade: 'B+', term: 'Fall 2024' },
    ],
    currentSchedule: [
      { course: 'AP Statistics', period: 2 }, { course: 'Chemistry II', period: 3 },
      { course: 'English 11', period: 4 }, { course: 'US History', period: 5 },
      { course: 'Study Hall', period: 6 },
    ],
  },
  'S-48962': {
    studentId: 'S-48962', gpa: 3.85, attendanceRate: 97, gradeLevel: 10,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'English 9 (Honors)', grade: 'A', term: 'Spring 2025' },
    ],
    currentSchedule: [
      { course: 'AP English Language', period: 1 }, { course: 'Honors Biology', period: 2 },
      { course: 'Algebra II', period: 3 }, { course: 'World History', period: 4 },
      { course: 'Spanish II', period: 5 },
    ],
  },
  'S-49847': {
    studentId: 'S-49847', gpa: 2.94, attendanceRate: 88, gradeLevel: 11,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'Geometry', grade: 'F', term: 'Spring 2024' },
      { name: 'Algebra I', grade: 'C', term: 'Fall 2023' },
    ],
    currentSchedule: [
      { course: 'Precalc', period: 2 }, { course: 'Chemistry', period: 3 },
      { course: 'English 11', period: 4 }, { course: 'AP US History', period: 5 },
      { course: 'Weight Training', period: 6 },
    ],
  },
  'S-50683': {
    studentId: 'S-50683', gpa: 3.73, attendanceRate: 93, gradeLevel: 9,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [],
    currentSchedule: [
      { course: 'Algebra I', period: 1 }, { course: 'English 9', period: 2 },
      { course: 'Biology', period: 3 }, { course: 'World Cultures', period: 4 },
      { course: 'Spanish I', period: 5 },
    ],
  },
  'S-51205': {
    studentId: 'S-51205', gpa: 3.15, attendanceRate: 90, gradeLevel: 12,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'Pre-Calculus', grade: 'B', term: 'Spring 2025' },
    ],
    currentSchedule: [
      { course: 'AP Calculus AB', period: 3 }, { course: 'Orchestra', period: 3 },
      { course: 'English 12', period: 1 }, { course: 'Chemistry II', period: 2 },
      { course: 'World History', period: 4 },
    ],
  },
  'S-52304': {
    studentId: 'S-52304', gpa: 3.56, attendanceRate: 96, gradeLevel: 10,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'Algebra II Honors', grade: 'A', term: 'Summer 2024 (pre-enrollment)' },
      { name: 'Geometry', grade: 'A-', term: 'Spring 2024' },
    ],
    currentSchedule: [
      { course: 'Honors Chemistry', period: 1 }, { course: 'Geometry', period: 2 },
      { course: 'English 10', period: 3 }, { course: 'World History', period: 4 },
      { course: 'French II', period: 5 },
    ],
  },
  'S-50456': {
    studentId: 'S-50456', gpa: 2.42, attendanceRate: 82, gradeLevel: 11,
    enrollmentStatus: 'Active', lastSync: '2026-06-17T06:00:00Z',
    completedCourses: [
      { name: 'Algebra II', grade: 'C', term: 'Spring 2025' },
    ],
    currentSchedule: [
      { course: 'Precalculus', period: 2 }, { course: 'English 11', period: 3 },
      { course: 'Chemistry', period: 4 }, { course: 'US History', period: 5 },
      { course: 'PE', period: 6 },
    ],
  },
}

// ============================================================================
// REVIEW CHECKS — per-request rubric verification (mock)
// ============================================================================
// The OUTPUT of evaluateAgainstRubric(studentData, criteria): for each active
// rubric criterion, the student's CLAIM (from their waiver form / note) vs the
// ACTUAL OneRoster value, a pass/fail, and counselor-facing reasoning shown
// when the check's ✓/✗ is clicked. Keyed by request id; `id` aligns with
// RUBRIC_CRITERIA ids where a criterion maps cleanly.
//
// NOT computed here at runtime — these are canned to keep the algorithm seam
// (utils/schedulingLogic.js) an intentional stub. Shape per check:
//   { id, label, claimed, actual, passed, reasoning }
export const REVIEW_CHECKS = {
  'req-1001': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'GPA 3.42', actual: '3.42', passed: true,
      reasoning: 'OneRoster cumulative GPA of 3.42 clears the 2.5 minimum with margin.' },
    { id: 'prior-credit', label: 'Prior equivalent credit on transcript', claimed: 'Honors Geometry over summer at community college covers the missing prereq', actual: 'Honors Geometry (Mercer CC), A, Summer 2025', passed: true,
      reasoning: 'Transfer course "Honors Geometry" (grade A, Summer 2025) is present in the OneRoster transcript and matches the claimed prerequisite coverage.' },
    { id: 'prereq-complete', label: 'Prerequisite course completed', claimed: 'Prereq satisfied via summer course', actual: 'Geometry prerequisite chain complete', passed: true,
      reasoning: 'The prerequisite chain for the requested course is satisfied by the transferred Honors Geometry credit.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '96%', passed: true,
      reasoning: 'Attendance of 96% is well above the 85% threshold.' },
  ],
  'req-1002': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '2.18', passed: false,
      reasoning: 'OneRoster cumulative GPA of 2.18 falls below the 2.5 minimum.' },
    { id: 'prior-credit', label: 'Recovery path confirmed on transcript', claimed: 'Recovering English 11 credit to stay on track', actual: 'English 11 recorded as F; no approved recovery section enrolled', passed: false,
      reasoning: 'English 11 shows a failing grade and no recovery enrollment is recorded in OneRoster, so the recovery path is not yet confirmed.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '79%', passed: false,
      reasoning: 'Attendance of 79% is below the 85% threshold and may itself jeopardize credit recovery.' },
  ],
  'req-1003': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.91', passed: true,
      reasoning: 'GPA of 3.91 clears the 2.5 minimum.' },
    { id: 'no-conflict', label: 'Schedule conflict resolvable', claimed: 'AP Bio and Band both in 4th period — requesting Band move to 6th', actual: 'AP Biology and Band both in Period 4; Period 6 Band section open (8 seats)', passed: true,
      reasoning: 'OneRoster confirms the Period 4 collision; an alternate Period 6 Band section has open seats, so the conflict is resolvable.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '98%', passed: true,
      reasoning: 'Attendance of 98% is well above the 85% threshold.' },
  ],
  'req-1004': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.67', passed: true,
      reasoning: 'GPA of 3.67 clears the 2.5 minimum.' },
    { id: 'prior-credit', label: 'Course equivalency confirmed', claimed: 'AP CS covers required math/science credit; passed with 5 on exam', actual: 'AP Computer Science A, grade A; College Board exam score 5 on file', passed: true,
      reasoning: 'AP Computer Science A (grade A) is on the transcript and the exam score of 5 validates mastery — the substitution equivalency holds.' },
    { id: 'prereq-complete', label: 'Graduation requirement coverage', claimed: 'Substitutes for senior math/science requirement', actual: 'Equivalency approved in course catalog', passed: true,
      reasoning: 'The course catalog flags AP CS A as an approved equivalent for the graduation requirement.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '94%', passed: true,
      reasoning: 'Attendance of 94% is above the 85% threshold.' },
  ],
  'req-1005': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '2.81', passed: true,
      reasoning: 'GPA of 2.81 clears the 2.5 minimum.' },
    { id: 'prereq-complete', label: 'Provider / course requirements met', claimed: 'Accredited summer photography course fulfills arts requirement', actual: 'Provider on state-recognized accredited list; arts credit eligible', passed: true,
      reasoning: 'The online provider is on the state-recognized accredited list and the course maps to the arts credit requirement.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '91%', passed: true,
      reasoning: 'Attendance of 91% is above the 85% threshold.' },
  ],
  'req-1006': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.28', passed: true,
      reasoning: 'GPA of 3.28 clears the 2.5 minimum.' },
    { id: 'within-window', label: 'Within add/drop window', claimed: 'Need to add AP Stats before semester starts', actual: 'Add/drop window closed Jun 10, 2026; request submitted Jun 15, 2026', passed: false,
      reasoning: 'The add/drop window closed on Jun 10; this request was submitted Jun 15, outside the window — requires special-circumstance approval.' },
    { id: 'no-conflict', label: 'No unresolved schedule conflict', claimed: 'Drop Study Hall, add AP Statistics', actual: 'AP Statistics Period 2 open; no collision', passed: true,
      reasoning: 'The proposed swap creates no period collision in the OneRoster schedule.' },
  ],
  'req-1007': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.85', passed: true,
      reasoning: 'GPA of 3.85 clears the 2.5 minimum.' },
    { id: 'prereq-complete', label: 'Grade-level / department policy', claimed: 'Completed 9th-grade English with A; ready for AP in 10th', actual: 'AP English Language restricted to grades 11–12 per department policy; student is grade 10', passed: false,
      reasoning: 'Although coursework is strong, department policy limits AP English Language to grades 11–12, and OneRoster lists the student as grade 10.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '97%', passed: true,
      reasoning: 'Attendance of 97% is above the 85% threshold.' },
  ],
  'req-1008': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '2.94', passed: true,
      reasoning: 'GPA of 2.94 clears the 2.5 minimum.' },
    { id: 'prior-credit', label: 'Recovery path confirmed on transcript', claimed: 'Failed Geometry freshman year; retaking online this summer', actual: 'Geometry recorded as F; summer recovery enrollment shows "pending"', passed: false,
      reasoning: 'OneRoster confirms the Geometry failure, but the summer recovery section is marked pending — completion is not yet verified.' },
    { id: 'within-window', label: 'Within submission window', claimed: 'Retaking this summer to graduate on time', actual: 'Submitted within summer review window', passed: true,
      reasoning: 'The request falls inside the active summer review window.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '88%', passed: true,
      reasoning: 'Attendance of 88% is above the 85% threshold.' },
  ],
  'req-1009': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.73', passed: true,
      reasoning: 'GPA of 3.73 clears the 2.5 minimum.' },
    { id: 'prereq-complete', label: 'Supporting documentation valid', claimed: 'Recovering from knee surgery; physician recommends deferring PE', actual: 'Physician note attached; medical deferral category recognized', passed: true,
      reasoning: 'A physician note is attached and the medical PE-deferral category is valid for a first-year student.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '93%', passed: true,
      reasoning: 'Attendance of 93% is above the 85% threshold.' },
  ],
  'req-1010': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.15', passed: true,
      reasoning: 'GPA of 3.15 clears the 2.5 minimum.' },
    { id: 'no-conflict', label: 'Schedule conflict resolvable', claimed: 'Calc AB and Orchestra both Period 3 — move Orchestra to Period 5', actual: 'Collision confirmed (both Period 3); Period 5 Orchestra section full (30/30)', passed: false,
      reasoning: 'OneRoster confirms the Period 3 collision, but the requested Period 5 Orchestra section is full — no alternate block is available.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '90%', passed: true,
      reasoning: 'Attendance of 90% is above the 85% threshold.' },
  ],
  'req-1011': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '3.56', passed: true,
      reasoning: 'GPA of 3.56 clears the 2.5 minimum.' },
    { id: 'prior-credit', label: 'Prior equivalent credit on transcript', claimed: 'Completed Algebra II honors summer before entering high school', actual: 'Algebra II Honors, grade A, Summer 2024 (pre-enrollment)', passed: true,
      reasoning: 'Algebra II Honors (grade A) is recorded prior to enrollment — prerequisite coverage is confirmed.' },
    { id: 'prereq-complete', label: 'Prerequisite course completed', claimed: 'Strong math track record', actual: 'Honors math sequence complete through Algebra II', passed: true,
      reasoning: 'The honors math sequence is complete through Algebra II, supporting readiness for the requested course.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '96%', passed: true,
      reasoning: 'Attendance of 96% is above the 85% threshold.' },
  ],
  'req-1012': [
    { id: 'min-gpa', label: 'Minimum cumulative GPA (≥ 2.5)', claimed: 'Not stated', actual: '2.42', passed: false,
      reasoning: 'OneRoster cumulative GPA of 2.42 falls below the 2.5 minimum.' },
    { id: 'prereq-complete', label: 'Credit equivalency confirmed', claimed: 'Accredited online Business elective to balance course load', actual: 'Provider accredited; credit equivalency review pending in course catalog', passed: false,
      reasoning: 'The provider is accredited, but the credit equivalency review for the Business elective is still pending in the course catalog.' },
    { id: 'min-attendance', label: 'Minimum attendance rate (≥ 85%)', claimed: 'Not stated', actual: '82%', passed: false,
      reasoning: 'Attendance of 82% is below the 85% threshold.' },
  ],
}
