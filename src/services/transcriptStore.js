// localStorage-backed persistence for previously uploaded transcripts/course lists.
const KEY_PREFIX = 'waiver_docs_v1'

// PII minimization: persist only an allowlist of fields per kind. rawText (the
// full transcript text) is deliberately excluded — it is PII with no read path
// (applySavedTranscript reads only parsed + fileName). VITE_PERSIST_TRANSCRIPT_PII
// ='false' additionally drops the parsed GPA/grade payload for zero-PII-at-rest.
const PERSIST_PARSED = import.meta.env.VITE_PERSIST_TRANSCRIPT_PII !== 'false'
const ALLOWED = { transcript: ['label', 'fileName', 'parsed'], courseList: ['label', 'entries'] }

function storageKey(studentId, kind) {
  return `${KEY_PREFIX}:${kind}:${studentId}`
}

function readList(studentId, kind) {
  try {
    const raw = localStorage.getItem(storageKey(studentId, kind))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeList(studentId, kind, list) {
  try {
    localStorage.setItem(storageKey(studentId, kind), JSON.stringify(list))
  } catch {
    /* storage unavailable (private mode) — silently skip persistence */
  }
}

function saveEntry(studentId, kind, entry) {
  const list = readList(studentId, kind)
  const persisted = { id: `${kind}-${Date.now()}`, savedAt: new Date().toISOString() }
  for (const key of ALLOWED[kind] ?? []) {
    if (kind === 'transcript' && key === 'parsed' && !PERSIST_PARSED) continue
    if (key in entry) persisted[key] = entry[key]
  }
  const next = [persisted, ...list].slice(0, 10)
  writeList(studentId, kind, next)
  return next[0]
}

export const saveTranscript = (studentId, entry) => saveEntry(studentId, 'transcript', entry)
export const getSavedTranscripts = (studentId) => readList(studentId, 'transcript')

export const saveCourseList = (studentId, entry) => saveEntry(studentId, 'courseList', entry)
export const getSavedCourseLists = (studentId) => readList(studentId, 'courseList')
