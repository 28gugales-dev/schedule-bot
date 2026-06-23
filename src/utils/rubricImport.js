// Rubric import — turn a counselor-authored document into a form's rubric config
// (the criteria rules + the required-doc flags). Lets a counselor build the rubric
// in Excel/Sheets (CSV) or hand off a JSON blob instead of hand-adding each rule.
//
// Output shape matches what FormBuilder's RubricEditor / RequiredDocsEditor hold:
//   criteria:     [{ id, label, type:'number'|'boolean', value, enabled }]
//   requiredDocs: ['courseList' | 'transcript' | 'supporting', ...]
//
// Two accepted shapes:
//   JSON  — an array of criteria, OR { criteria:[...], requiredDocs:[...] }
//   CSV   — header row (label,type,value,enabled); a row whose type is "doc"
//           contributes a required-doc id (from its value/label) instead of a rule.
//
// Unparseable rows are skipped and counted (never throw mid-row) so one bad line
// doesn't sink a 40-row import. A hard format error (bad JSON, empty file) returns
// { ok:false, error }.

import { makeUniqueId } from './formSchema.js'

// Canonical required-doc ids the intake wizard understands (findMissingDocs in
// api.js). Kept here so the parser can validate/normalise without importing UI.
export const REQUIRED_DOC_IDS = ['courseList', 'transcript', 'supporting']

const DOC_ALIASES = {
  courselist: 'courseList',
  'course list': 'courseList',
  courses: 'courseList',
  course: 'courseList',
  transcript: 'transcript',
  transcripts: 'transcript',
  grades: 'transcript',
  supporting: 'supporting',
  'supporting documents': 'supporting',
  'supporting docs': 'supporting',
  support: 'supporting',
  other: 'supporting',
}

const NUMBER_TYPES = new Set(['number', 'num', 'numeric', 'float', 'int', 'gpa'])
const BOOLEAN_TYPES = new Set(['boolean', 'bool', 'yesno', 'yes-no', 'yes/no', 'yn', 'checkbox', 'flag'])
const DOC_TYPES = new Set(['doc', 'docs', 'document', 'requireddoc', 'required-doc', 'required_doc', 'file'])

const TRUTHY = new Set(['true', 'yes', 'y', '1', 'required', 'on', 'enabled'])
const FALSY = new Set(['false', 'no', 'n', '0', 'optional', 'off', 'disabled'])

function normType(raw) {
  const k = String(raw ?? '').trim().toLowerCase()
  if (NUMBER_TYPES.has(k)) return 'number'
  if (BOOLEAN_TYPES.has(k)) return 'boolean'
  if (DOC_TYPES.has(k)) return 'doc'
  return null
}

// Absent (null/undefined/empty) -> caller's fallback, so a value cell can default
// false while an `enabled` cell defaults true. Numbers and bare strings handled.
function parseBool(raw, fallback = null) {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw !== 0
  if (raw == null) return fallback
  const k = String(raw).trim().toLowerCase()
  if (k === '') return fallback
  if (TRUTHY.has(k)) return true
  if (FALSY.has(k)) return false
  return fallback
}

function normDocId(raw) {
  const k = String(raw ?? '').trim()
  if (REQUIRED_DOC_IDS.includes(k)) return k // already canonical
  return DOC_ALIASES[k.toLowerCase()] ?? null
}

// Minimal RFC-4180-ish CSV: handles quoted fields, escaped "" quotes, and commas
// inside quotes. One record per line (no embedded newlines — counselor rubrics are
// flat). Trailing \r tolerated for Windows-authored files.
function parseCsv(text) {
  const rows = []
  for (const rawLine of text.split(/\r?\n/)) {
    if (rawLine.trim() === '') continue
    const cells = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < rawLine.length; i += 1) {
      const ch = rawLine[i]
      if (inQ) {
        if (ch === '"') {
          if (rawLine[i + 1] === '"') { cur += '"'; i += 1 } else inQ = false
        } else cur += ch
      } else if (ch === '"') {
        inQ = true
      } else if (ch === ',') {
        cells.push(cur); cur = ''
      } else cur += ch
    }
    cells.push(cur)
    rows.push(cells.map((c) => c.trim()))
  }
  return rows
}

// Build a {label, type, value, enabled} accumulator -> normalised criterion or null.
function coerceCriterion(label, type, value, enabledRaw, takenIds) {
  const lbl = String(label ?? '').trim()
  if (!lbl) return null
  const t = type === 'boolean' ? 'boolean' : 'number'
  const v = t === 'number'
    ? (Number.isFinite(Number(value)) ? Number(value) : 0)
    : (parseBool(value, false) === true)
  const enabled = parseBool(enabledRaw, true) !== false
  const id = makeUniqueId(lbl, takenIds)
  takenIds.push(id)
  return { id, label: lbl, type: t, value: v, enabled }
}

function fromRecords(records) {
  const criteria = []
  const requiredDocs = []
  const takenIds = []
  let skipped = 0

  for (const rec of records) {
    const type = normType(rec.type)
    if (type === 'doc') {
      const docId = normDocId(rec.value ?? rec.label ?? rec.id)
      if (docId && !requiredDocs.includes(docId)) requiredDocs.push(docId)
      else if (!docId) skipped += 1
      continue
    }
    if (type === null && rec.type != null && String(rec.type).trim() !== '') {
      skipped += 1 // an explicit but unrecognised type
      continue
    }
    // type omitted -> default number (a bare "label,threshold" rubric)
    const crit = coerceCriterion(rec.label ?? rec.id, type ?? 'number', rec.value, rec.enabled, takenIds)
    if (crit) criteria.push(crit)
    else skipped += 1
  }
  return { ok: true, criteria, requiredDocs, skipped }
}

function looksLikeJson(text, fileName) {
  if (/\.json$/i.test(fileName ?? '')) return true
  const t = text.trim()
  return t.startsWith('{') || t.startsWith('[')
}

function parseJson(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }
  let rawCriteria = []
  let rawDocs = []
  if (Array.isArray(data)) {
    rawCriteria = data
  } else if (data && typeof data === 'object') {
    rawCriteria = Array.isArray(data.criteria) ? data.criteria : []
    rawDocs = Array.isArray(data.requiredDocs)
      ? data.requiredDocs
      : Array.isArray(data.required_docs) ? data.required_docs : []
  } else {
    return { ok: false, error: 'JSON must be an array of rules or an object with a "criteria" array.' }
  }

  const records = rawCriteria.map((c) => ({
    label: c?.label ?? c?.name ?? c?.id,
    type: c?.type,
    value: c?.value ?? c?.threshold,
    enabled: c?.enabled,
  }))
  const result = fromRecords(records)

  // Docs declared at the top level are validated/normalised here (CSV docs flow
  // through fromRecords via type:"doc" rows instead).
  for (const d of rawDocs) {
    const docId = normDocId(d)
    if (docId && !result.requiredDocs.includes(docId)) result.requiredDocs.push(docId)
    else if (!docId) result.skipped += 1
  }
  return result
}

function parseCsvText(text) {
  const rows = parseCsv(text)
  if (rows.length === 0) return { ok: false, error: 'File is empty.' }

  // Header detection: a first row mentioning a known column name. Otherwise treat
  // every row as positional [label, type, value, enabled].
  const first = rows[0].map((c) => c.toLowerCase())
  const hasHeader = first.some((c) => ['label', 'rule', 'name', 'type', 'value', 'threshold', 'enabled'].includes(c))
  const headerIdx = hasHeader
    ? {
        label: first.findIndex((c) => ['label', 'rule', 'name'].includes(c)),
        type: first.indexOf('type'),
        value: first.findIndex((c) => ['value', 'threshold'].includes(c)),
        enabled: first.indexOf('enabled'),
      }
    : { label: 0, type: 1, value: 2, enabled: 3 }

  const body = hasHeader ? rows.slice(1) : rows
  const at = (cells, i) => (i >= 0 && i < cells.length ? cells[i] : undefined)
  const records = body.map((cells) => ({
    label: at(cells, headerIdx.label),
    type: at(cells, headerIdx.type),
    value: at(cells, headerIdx.value),
    enabled: at(cells, headerIdx.enabled),
  }))
  return fromRecords(records)
}

/**
 * Parse a rubric document into { ok, criteria, requiredDocs, skipped } or
 * { ok:false, error }. `fileName` only steers format detection (JSON vs CSV).
 */
export function parseRubricImport(text, fileName = '') {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'File is empty.' }
  }
  const result = looksLikeJson(text, fileName) ? parseJson(text) : parseCsvText(text)
  if (result.ok && result.criteria.length === 0 && result.requiredDocs.length === 0) {
    return { ok: false, error: 'No rules or required documents found in the file.' }
  }
  return result
}
