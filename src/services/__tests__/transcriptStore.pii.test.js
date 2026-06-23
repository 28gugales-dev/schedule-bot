import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Minimal localStorage shim (vitest default env is node, no jsdom installed).
class MemoryStorage {
  constructor() {
    this.store = new Map()
  }
  getItem(k) {
    return this.store.has(k) ? this.store.get(k) : null
  }
  setItem(k, v) {
    this.store.set(k, String(v))
  }
  removeItem(k) {
    this.store.delete(k)
  }
  clear() {
    this.store.clear()
  }
}

const STUDENT = 'stu-pii-1'
const hadLocalStorage = 'localStorage' in globalThis
const originalLocalStorage = globalThis.localStorage

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
  // Restore the global so this file doesn't pollute other test files that rely
  // on the absence (node default) of localStorage.
  if (hadLocalStorage) globalThis.localStorage = originalLocalStorage
  else delete globalThis.localStorage
})

describe('transcriptStore PII allowlist', () => {
  it('drops rawText, keeps parsed + fileName + label', async () => {
    const { saveTranscript, getSavedTranscripts } = await import('../transcriptStore.js')
    saveTranscript(STUDENT, {
      label: 'JohnDoe_transcript.pdf',
      fileName: 'JohnDoe_transcript.pdf',
      parsed: { gpa: 3.9, courses: [] },
      rawText: 'SECRET FULL TRANSCRIPT TEXT',
    })
    const [entry] = getSavedTranscripts(STUDENT)
    expect(entry).toBeDefined()
    expect('rawText' in entry).toBe(false)
    expect(entry.parsed).toEqual({ gpa: 3.9, courses: [] })
    expect(entry.fileName).toBe('JohnDoe_transcript.pdf')
    expect(entry.label).toBe('JohnDoe_transcript.pdf')
    expect(entry.id).toBeTruthy()
    expect(entry.savedAt).toBeTruthy()
  })

  it("VITE_PERSIST_TRANSCRIPT_PII='false' omits parsed but keeps label + fileName", async () => {
    vi.stubEnv('VITE_PERSIST_TRANSCRIPT_PII', 'false')
    const { saveTranscript, getSavedTranscripts } = await import('../transcriptStore.js')
    saveTranscript(STUDENT, {
      label: 'JohnDoe_transcript.pdf',
      fileName: 'JohnDoe_transcript.pdf',
      parsed: { gpa: 3.9 },
      rawText: 'SECRET',
    })
    const [entry] = getSavedTranscripts(STUDENT)
    expect(entry.parsed).toBeUndefined()
    expect('rawText' in entry).toBe(false)
    expect(entry.label).toBe('JohnDoe_transcript.pdf')
    expect(entry.fileName).toBe('JohnDoe_transcript.pdf')
  })

  it('default (flag unset/true) persists parsed and round-trips', async () => {
    const { saveTranscript, getSavedTranscripts } = await import('../transcriptStore.js')
    saveTranscript(STUDENT, { label: 'a.pdf', fileName: 'a.pdf', parsed: { gpa: 4.0 } })
    const [entry] = getSavedTranscripts(STUDENT)
    expect(entry.parsed).toEqual({ gpa: 4.0 })
  })

  it('course list allowlist is symmetric (only label + entries)', async () => {
    const { saveCourseList, getSavedCourseLists } = await import('../transcriptStore.js')
    saveCourseList(STUDENT, { label: 'List A', entries: [{ code: 'MATH101' }], extra: 'x' })
    const [entry] = getSavedCourseLists(STUDENT)
    expect('extra' in entry).toBe(false)
    expect(entry.label).toBe('List A')
    expect(entry.entries).toEqual([{ code: 'MATH101' }])
    expect(Object.keys(entry).sort()).toEqual(['entries', 'id', 'label', 'savedAt'])
  })
})
