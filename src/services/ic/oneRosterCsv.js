// OneRoster CSV (1EdTech) artifact builder for pushing schedule changes to
// Infinite Campus. Emits a DELTA package: enrollments.csv carrying one row per
// placement change (status=active to add, status=tobedeleted to drop) plus the
// REQUIRED manifest.csv declaring which files are delta vs absent.
//
// Verified against the 1EdTech CSV binding (Phase-1 research, high confidence):
//   - enrollments.csv ordered headers (delta): sourcedId, status, dateLastModified,
//     classSourcedId, schoolSourcedId, userSourcedId, role, primary, beginDate, endDate
//   - status/dateLastModified are REQUIRED in delta, FORBIDDEN in bulk
//   - sourcedId charset: 0-9 a-z A-Z . - _ / @  (<256 chars); suggested enrollment
//     sourcedId = userSourcedId + classSourcedId
//   - every referenced sourcedId must resolve within the district's own SIS keys
//   - list fields RFC4180-quoted inside one cell
//
// This builder is PURE and deterministic (timestamp injected) so the stress test
// can assert byte-for-byte output. It REFUSES to emit a row whose IC sourcedIds
// are missing (the demo / unmapped-district case) and reports those as `skipped`
// so the caller routes them to the manual_ui_export path instead of shipping a
// malformed row.

export const ENROLLMENTS_HEADER_DELTA = Object.freeze([
  'sourcedId', 'status', 'dateLastModified', 'classSourcedId', 'schoolSourcedId',
  'userSourcedId', 'role', 'primary', 'beginDate', 'endDate',
])

const SOURCED_ID_OK = /[^0-9a-zA-Z._\-/@]/g

// Build a delta package from placement-change records.
//   records: [{ idempotencyKey, action: 'add'|'drop',
//               userSourcedId, classSourcedId, schoolSourcedId,
//               beginDate?, endDate? }]
//   opts:    { now: ISO8601 string (required for determinism), version: '1.1'|'1.2' }
// Returns { files: { 'enrollments.csv', 'manifest.csv' }, recordRefs, skipped }.
export function buildOneRosterDeltaPackage(records, opts = {}) {
  const now = opts.now ?? new Date().toISOString()
  const version = opts.version ?? '1.1'

  const rows = []
  const recordRefs = []
  const skipped = []

  for (const r of records ?? []) {
    const missing = missingKeys(r)
    if (missing.length) {
      skipped.push({ idempotencyKey: r?.idempotencyKey ?? null, reason: `missing IC keys: ${missing.join(', ')}` })
      continue
    }
    const sourcedId = enrollmentSourcedId(r.userSourcedId, r.classSourcedId)
    const status = r.action === 'drop' ? 'tobedeleted' : 'active'
    rows.push([
      sourcedId,
      status,
      now,
      sanitizeSourcedId(r.classSourcedId),
      sanitizeSourcedId(r.schoolSourcedId),
      sanitizeSourcedId(r.userSourcedId),
      'student',
      '',                          // primary — only meaningful for teachers
      r.beginDate ?? '',
      r.endDate ?? '',
    ])
    recordRefs.push({ idempotencyKey: r.idempotencyKey ?? null, sourcedId, status })
  }

  const enrollmentsCsv = toCsv([ENROLLMENTS_HEADER_DELTA, ...rows])
  const manifestCsv = buildManifestCsv(version)

  return {
    files: { 'enrollments.csv': enrollmentsCsv, 'manifest.csv': manifestCsv },
    recordRefs,
    skipped,
  }
}

// manifest.csv — REQUIRED. Declares processing mode per file. We ship enrollments
// as delta; the rest are absent (the district already holds users/classes/courses).
export function buildManifestCsv(version = '1.1') {
  const rows = [
    ['propertyName', 'value'],
    ['manifest.version', '1.0'],
    ['oneroster.version', version],
    ['file.academicSessions', 'absent'],
    ['file.orgs', 'absent'],
    ['file.courses', 'absent'],
    ['file.classes', 'absent'],
    ['file.users', 'absent'],
    ['file.enrollments', 'delta'],
  ]
  return toCsv(rows)
}

export function enrollmentSourcedId(userSourcedId, classSourcedId) {
  // Spec's suggested convention, sanitized to the legal charset.
  return sanitizeSourcedId(`${userSourcedId}_${classSourcedId}`).slice(0, 255)
}

export function sanitizeSourcedId(value) {
  return String(value ?? '').replace(SOURCED_ID_OK, '')
}

function missingKeys(r) {
  const out = []
  if (!r?.userSourcedId) out.push('userSourcedId')
  if (!r?.classSourcedId) out.push('classSourcedId')
  if (!r?.schoolSourcedId) out.push('schoolSourcedId')
  return out
}

// Human worklist for the manual_ui_export path (the safe default when inbound CSV
// ingest is unconfirmed for a district). A registrar reads this and applies each
// placement via Requests and Rosters. Unlike the OneRoster delta, it needs NO IC
// sourcedIds — so it makes forward progress for the demo / unmapped-district case.
// It carries only student name + course names (minimal PII for the human task).
export function buildManualWorklist(records, opts = {}) {
  const now = opts.now ?? new Date().toISOString()
  const header = ['requestId', 'student', 'dropCourse', 'addCourse', 'queuedAt']
  const rows = []
  const recordRefs = []
  for (const r of records ?? []) {
    rows.push([r.idempotencyKey ?? '', r.studentName ?? '', r.fromCourse ?? '', r.toCourse ?? '', now])
    recordRefs.push({ idempotencyKey: r.idempotencyKey ?? null, sourcedId: null })
  }
  return { files: { 'worklist.csv': toCsv([header, ...rows]) }, recordRefs, skipped: [] }
}

// ── RFC4180 + formula-injection neutralization ───────────────────────────────
function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n'
}

// Quote per RFC4180, AND neutralize spreadsheet formula injection: a cell a
// registrar opens in Excel/Sheets that begins with = + - @ (or tab/CR) is treated
// as a formula. Prefix a single quote so it renders as literal text. sourcedId
// cells are already charset-sanitized; this protects any free-text column
// (student name, course name in the worklist) from a crafted value.
function csvEscape(value) {
  let s = value === undefined || value === null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
