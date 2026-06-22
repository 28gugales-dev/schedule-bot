import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { fetchAvailableWaivers, uploadStudentDocuments, submitWaiver } from '../../services/api.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { extractTextFromFile } from '../../utils/pdfText.js'
import { parseTranscriptData } from '../../utils/schedulingLogic.js'
import { parseCourseListText } from '../../utils/courseListParser.js'
import { saveTranscript, getSavedTranscripts, saveCourseList, getSavedCourseLists } from '../../services/transcriptStore.js'
import { UploadZone } from './UploadZone.jsx'
import { WaiverSelectGrid } from './WaiverSelectGrid.jsx'
import { RequestTracker } from './RequestTracker.jsx'
import { CourseSwapPanel } from './CourseSwapPanel.jsx'
import { CourseListEntry } from './CourseListEntry.jsx'

const EMPTY_COURSE_BOXES = Array(7).fill('')

// Guided student intake: Documents -> Waiver type -> Review & submit -> Tracker.
const STEPS = ['Documents', 'Waiver type', 'Review & submit']

// Waiver types where the student is naming a course to drop/replace.
const SWAP_WAIVER_IDS = new Set(['prereq-override', 'grad-substitution', 'schedule-conflict', 'late-add-drop'])

function serializeParsedTranscript(parsed) {
  return { ...parsed, completed: [...parsed.completed] }
}

function deserializeParsedTranscript(saved) {
  return { ...saved, completed: new Set(saved.completed ?? []) }
}

function WizardSteps({ current, onStepClick }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((label, i) => {
        const done = i < current
        const isCurrent = i === current
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => done && onStepClick(i)}
              disabled={!done}
              aria-current={isCurrent ? 'step' : undefined}
              className={[
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition',
                isCurrent
                  ? 'bg-brand-600 text-white'
                  : done
                    ? 'cursor-pointer bg-brand-50 text-brand-700 hover:bg-brand-100 dark:text-brand-300'
                    : 'cursor-default bg-black/[0.04] text-muted',
              ].join(' ')}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[11px]">
                {done ? '✓' : i + 1}
              </span>
              {label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function RecognizedCourseChips({ recognized = [], unrecognized = [] }) {
  if (recognized.length === 0 && unrecognized.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {recognized.map((r, i) => (
        <span
          key={`${r.matched}-${i}`}
          title={r.exact ? 'Exact match' : `Closest match (${Math.round(r.similarity * 100)}% similar)`}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            r.exact ? 'bg-success-50 text-success-700 dark:text-success-300' : 'bg-warning-50 text-warning-700 dark:text-warning-300'
          }`}
        >
          {r.matched}{!r.exact && ' ~'}
        </span>
      ))}
      {unrecognized.map((raw, i) => (
        <span key={`unk-${i}`} title="No catalog match found" className="rounded-full bg-elevated px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-border">
          {raw} ?
        </span>
      ))}
    </div>
  )
}

function PreviousDocSelect({ label, saved, onApply }) {
  if (!saved.length) return null
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm">
      <span className="text-brand-700 dark:text-brand-300">Found a previous {label} — <strong>{saved[0].label}</strong>. Apply?</span>
      <select
        defaultValue=""
        onChange={(e) => e.target.value && onApply(saved.find((s) => s.id === e.target.value))}
        className="glass-input ml-auto rounded-md px-2 py-1 text-xs"
      >
        <option value="" disabled>Choose…</option>
        {saved.map((s) => (
          <option key={s.id} value={s.id}>{s.label} ({new Date(s.savedAt).toLocaleDateString()})</option>
        ))}
      </select>
    </div>
  )
}

export function WaiverIntake() {
  const { user } = useAuth()
  const studentId = user?.id ?? 'demo-student'

  const [step, setStep] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [courseListEntries, setCourseListEntries] = useState(EMPTY_COURSE_BOXES)
  const [supporting, setSupporting] = useState([])
  const [waivers, setWaivers] = useState([])
  const [waiversLoading, setWaiversLoading] = useState(true)
  const [selectedWaiverId, setSelectedWaiverId] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [error, setError] = useState(null)

  // Parsed-document state (transcriptParser / courseListParser output).
  const [transcriptData, setTranscriptData] = useState(null) // { gpa, studentGrade, completed: Set, recognized, unrecognized }
  const [transcriptFileName, setTranscriptFileName] = useState(null)
  const [parsingTranscript, setParsingTranscript] = useState(false)
  const [savedTranscripts, setSavedTranscripts] = useState(() => getSavedTranscripts(studentId))
  const [savedCourseLists, setSavedCourseLists] = useState(() => getSavedCourseLists(studentId))
  const [swap, setSwap] = useState({ fromCourse: null, toCourse: null })

  // The "Found a previous …" banner should only offer documents saved in an
  // EARLIER session — not the file the student just uploaded this session (which
  // saveTranscript/persistCourseList append immediately). Snapshot the ids that
  // existed at mount and only surface those in the banner.
  const priorTranscriptIds = useRef(null)
  if (priorTranscriptIds.current === null) priorTranscriptIds.current = new Set(savedTranscripts.map((s) => s.id))
  const priorCourseListIds = useRef(null)
  if (priorCourseListIds.current === null) priorCourseListIds.current = new Set(savedCourseLists.map((s) => s.id))
  const priorTranscripts = useMemo(
    () => savedTranscripts.filter((s) => priorTranscriptIds.current.has(s.id)),
    [savedTranscripts],
  )
  const priorCourseLists = useMemo(
    () => savedCourseLists.filter((s) => priorCourseListIds.current.has(s.id)),
    [savedCourseLists],
  )

  useEffect(() => {
    let cancelled = false
    fetchAvailableWaivers()
      .then((w) => {
        if (cancelled) return
        setWaivers(w)
        setWaiversLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.message ?? 'Failed to load waiver types')
        setWaiversLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const selectedWaiver = useMemo(
    () => waivers.find((w) => w.id === selectedWaiverId) ?? null,
    [waivers, selectedWaiverId],
  )
  const needsSwap = selectedWaiverId && SWAP_WAIVER_IDS.has(selectedWaiverId)

  // Re-derived live from the text boxes — exact-then-Levenshtein matched
  // against the catalog (see CourseListEntry for the per-box version).
  const courseListData = useMemo(
    () => parseCourseListText(courseListEntries.filter((e) => e.trim()).join('\n')),
    [courseListEntries],
  )

  const handleTranscriptFiles = useCallback(async (files) => {
    setTranscript(files)
    if (files.length === 0) return
    const file = files[files.length - 1]
    setParsingTranscript(true)
    setError(null)
    try {
      const text = await extractTextFromFile(file)
      const parsed = parseTranscriptData(text)
      setTranscriptData(parsed)
      setTranscriptFileName(file.name)
      saveTranscript(studentId, { label: file.name, fileName: file.name, rawText: text, parsed: serializeParsedTranscript(parsed) })
      setSavedTranscripts(getSavedTranscripts(studentId))
    } catch (e) {
      setError(`Could not read transcript: ${e?.message ?? 'unknown error'}`)
    } finally {
      setParsingTranscript(false)
    }
  }, [studentId])

  const applySavedTranscript = useCallback((saved) => {
    setTranscriptData(deserializeParsedTranscript(saved.parsed))
    setTranscriptFileName(saved.fileName)
  }, [])

  const applySavedCourseList = useCallback((saved) => {
    setCourseListEntries(saved.entries?.length ? saved.entries : EMPTY_COURSE_BOXES)
  }, [])

  // Persist the typed course list once the student moves past it, rather
  // than on every keystroke (which would spam the "previous course list" list).
  const persistCourseList = useCallback(() => {
    const nonEmpty = courseListEntries.filter((e) => e.trim())
    if (nonEmpty.length === 0) return
    saveCourseList(studentId, { label: nonEmpty.join(', ').slice(0, 80), entries: courseListEntries })
    setSavedCourseLists(getSavedCourseLists(studentId))
  }, [studentId, courseListEntries])

  // Step gating: docs step needs a transcript (uploaded or applied previous)
  // plus at least one recognized course; waiver step needs a pick, plus a
  // from/to course pair for swap-style waivers.
  const canAdvance =
    step === 0
      ? Boolean(transcriptFileName) && courseListData.courseNames.length > 0
      : step === 1
        ? Boolean(selectedWaiverId) && (!needsSwap || (swap.fromCourse && swap.toCourse))
        : true

  // Why "Continue" is disabled — surfaced to the user instead of a dead button.
  const advanceHint =
    step === 0
      ? 'Upload your transcript and enter your course list to continue.'
      : step === 1
        ? needsSwap
          ? 'Select a waiver type and a course swap to continue.'
          : 'Select a waiver type to continue.'
        : ''

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Flatten controlled File[] lists into the plain descriptors the API reads
      // ({name, size, docType}). File objects are never mutated — docType is
      // assigned here, at the seam, from which list each file came.
      const docs = [
        ...transcript.map((f) => ({ name: f.name, size: f.size, docType: 'transcript' })),
        ...supporting.map((f) => ({ name: f.name, size: f.size, docType: 'supporting' })),
      ]
      const upload = await uploadStudentDocuments(docs)
      const res = await submitWaiver({
        studentId,
        waiverTypeId: selectedWaiverId,
        uploadId: upload.uploadId,
        documents: upload.files,
        studentNote: note.trim(),
        courseList: courseListData.courseNames,
        fromCourse: swap.fromCourse,
        toCourse: swap.toCourse,
        transcriptData,
      })
      setSubmittedId(res.requestId)
    } catch (e) {
      setError(e?.message ?? 'Submission failed — please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [transcript, supporting, selectedWaiverId, note, studentId, courseListData, swap, transcriptData])

  const reset = () => {
    setStep(0)
    setTranscript([])
    setTranscriptData(null)
    setTranscriptFileName(null)
    setCourseListEntries(EMPTY_COURSE_BOXES)
    setSupporting([])
    setSelectedWaiverId(null)
    setNote('')
    setSubmittedId(null)
    setError(null)
    setSwap({ fromCourse: null, toCourse: null })
  }

  // Post-submit: confirmation + live tracker.
  if (submittedId) {
    return (
      <section className="fade-up space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Request submitted</h1>
          <p className="mt-1 text-sm text-muted">
            A confirmation email is on its way. Track your request below.
          </p>
        </div>
        <RequestTracker requestId={submittedId} />
        <button
          type="button"
          onClick={reset}
          className="glass-input rounded-xl px-4 py-2 text-sm font-medium text-ink transition hover:bg-glass-hover"
        >
          Start another request
        </button>
      </section>
    )
  }

  return (
    <section className="fade-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">New waiver request</h1>
        <p className="mt-1 text-sm text-muted">
          Upload your documents, choose a waiver type, then review and submit.
        </p>
      </div>

      <WizardSteps current={step} onStepClick={setStep} />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-50 px-3 py-2.5 text-sm text-danger-700 dark:text-danger-300 ring-1 ring-danger-100"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="mt-0.5 shrink-0" aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="glass-card space-y-6 p-5">
          <div>
            <PreviousDocSelect label="transcript" saved={priorTranscripts} onApply={applySavedTranscript} />
            <UploadZone
              label="Transcript (PDF)"
              hint="Required. Your official or unofficial transcript."
              docType="transcript"
              accept=".pdf,.txt"
              files={transcript}
              onFilesChange={handleTranscriptFiles}
            />
            {parsingTranscript && <p className="mt-2 text-xs text-muted">Reading transcript…</p>}
            {transcriptData && (
              <>
                <p className="mt-3 text-xs font-medium text-ink">
                  {transcriptData.recognized?.length > 0 ? 'Recognized courses' : 'Transcript read'}
                  {transcriptData.studentGrade ? ` · Grade ${transcriptData.studentGrade}` : ''}
                  {transcriptData.gpa ? ` · GPA ${transcriptData.gpa}` : ''}
                </p>
                <RecognizedCourseChips recognized={transcriptData.recognized} unrecognized={transcriptData.unrecognized} />
              </>
            )}
          </div>
          <div>
            <PreviousDocSelect label="course list" saved={priorCourseLists} onApply={applySavedCourseList} />
            <p className="text-sm font-medium text-ink mb-1">Course list</p>
            <p className="text-xs text-muted mb-3">
              Required. Type each current/planned course — one box per period. Add more for special cases.
            </p>
            <CourseListEntry values={courseListEntries} onChange={setCourseListEntries} />
          </div>
          <UploadZone
            label="Supporting documents"
            hint="Optional. Add any extra files to support your request."
            docType="supporting"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            files={supporting}
            onFilesChange={setSupporting}
          />
        </div>
      )}

      {step === 1 && (
        <div className="glass-card space-y-5 p-5">
          {waiversLoading ? (
            <p className="text-sm text-muted">Loading waiver types…</p>
          ) : (
            <WaiverSelectGrid
              waivers={waivers}
              selectedId={selectedWaiverId}
              onSelect={setSelectedWaiverId}
            />
          )}
          {needsSwap && (
            <div>
              <p className="text-sm font-medium text-ink mb-2">Course swap</p>
              <CourseSwapPanel
                courseListNames={courseListData?.courseNames ?? []}
                student={{ currentGrade: transcriptData?.studentGrade ?? 9, completed: transcriptData?.completed ?? new Set() }}
                value={swap}
                onChange={setSwap}
              />
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="glass-card space-y-5 p-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Review</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Waiver type</dt>
                <dd className="font-medium text-ink">{selectedWaiver?.name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Transcript</dt>
                <dd className="font-medium text-ink">{transcriptFileName ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Course list</dt>
                <dd className="font-medium text-ink text-right">{courseListData.courseNames.join(', ') || '—'}</dd>
              </div>
              {needsSwap && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Course swap</dt>
                  <dd className="font-medium text-ink">{swap.fromCourse} → {swap.toCourse}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Supporting docs</dt>
                <dd className="font-medium text-ink">{supporting.length} file{supporting.length === 1 ? '' : 's'}</dd>
              </div>
            </dl>
          </div>
          <div>
            <label htmlFor="student-note" className="text-sm font-medium text-ink">
              Note to counselor <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="student-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any context for your reviewer…"
              className="glass-input mt-2 w-full px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="glass-input rounded-xl px-4 py-2 text-sm font-medium text-ink transition hover:bg-glass-hover disabled:opacity-40"
        >
          Back
        </button>

        {step < 2 ? (
          <div className="flex items-center gap-3">
            {!canAdvance && advanceHint && (
              <span className="hidden text-xs text-muted sm:inline">{advanceHint}</span>
            )}
            <button
              type="button"
              onClick={() => {
                if (step === 0) persistCourseList()
                setStep((s) => Math.min(STEPS.length - 1, s + 1))
              }}
              disabled={!canAdvance}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        )}
      </div>
    </section>
  )
}
