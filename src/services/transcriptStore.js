// localStorage-backed persistence for previously uploaded transcripts/course lists.
const KEY_PREFIX = 'waiver_docs_v1'

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
  const next = [{ id: `${kind}-${Date.now()}`, savedAt: new Date().toISOString(), ...entry }, ...list].slice(0, 10)
  writeList(studentId, kind, next)
  return next[0]
}

export const saveTranscript = (studentId, entry) => saveEntry(studentId, 'transcript', entry)
export const getSavedTranscripts = (studentId) => readList(studentId, 'transcript')

export const saveCourseList = (studentId, entry) => saveEntry(studentId, 'courseList', entry)
export const getSavedCourseLists = (studentId) => readList(studentId, 'courseList')
