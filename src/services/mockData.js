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
