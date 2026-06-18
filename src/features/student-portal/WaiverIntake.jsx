import { useState, useEffect, useCallback, useMemo } from 'react'
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

// Guided student intake: Documents -> Waiver type -> Review & submit -> Tracker.
// This component is the integration root for the student portal: it owns all
// wizard state and the runtime prop contracts of its three leaf components.
const STEPS = ['Documents', 'Waiver type', 'Review & submit']

// Waiver types where the student is naming a course to drop/replace.
const SWAP_WAIVER_IDS = new Set(['prereq-override', 'grad-substitution', 'schedule-conflict', 'late-add-drop'])

function serializeParsedTranscript(parsed) {
  return { ...parsed, completed: [...parsed.completed] }
}

function deserializeParsedTranscript(saved) {
  return { ...saved, completed: new Set(saved.completed ?? []) }
}

function WizardSteps({ current }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={[
            'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
            i === current
              ? 'bg-brand-600 text-white'
              : i < current
                ? 'bg-brand-50 text-brand-700'
                : 'bg-slate-100 text-slate-500',
          ].join(' ')}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[11px]">
            {i < current ? '✓' : i + 1}
          </span>
          {label}
        </li>
      ))}
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
            r.exact ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {r.matched}{!r.exact && ' ~'}
        </span>
      ))}
      {unrecognized.map((raw, i) => (
        <span key={`unk-${i}`} title="No catalog match found" className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">
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
      <span className="text-brand-700">Found a previous {label} — <strong>{saved[0].fileName}</strong>. Apply?</span>
      <select
        defaultValue=""
        onChange={(e) => e.target.value && onApply(saved.find((s) => s.id === e.target.value))}
        className="ml-auto rounded-md border border-brand-300 bg-white px-2 py-1 text-xs"
      >
        <option value="" disabled>Choose…</option>
        {saved.map((s) => (
          <option key={s.id} value={s.id}>{s.fileName} ({new Date(s.savedAt).toLocaleDateString()})</option>
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
  const [courseList, setCourseList] = useState([])
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
  const [courseListData, setCourseListData] = useState(null) // { courseNames, recognized, unrecognized }
  const [courseListFileName, setCourseListFileName] = useState(null)
  const [parsingCourseList, setParsingCourseList] = useState(false)
  const [savedTranscripts, setSavedTranscripts] = useState(() => getSavedTranscripts(studentId))
  const [savedCourseLists, setSavedCourseLists] = useState(() => getSavedCourseLists(studentId))
  const [swap, setSwap] = useState({ fromCourse: null, toCourse: null })

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
      saveTranscript(studentId, { fileName: file.name, rawText: text, parsed: serializeParsedTranscript(parsed) })
      setSavedTranscripts(getSavedTranscripts(studentId))
    } catch (e) {
      setError(`Could not read transcript: ${e?.message ?? 'unknown error'}`)
    } finally {
      setParsingTranscript(false)
    }
  }, [studentId])

  const handleCourseListFiles = useCallback(async (files) => {
    setCourseList(files)
    if (files.length === 0) return
    const file = files[files.length - 1]
    setParsingCourseList(true)
    setError(null)
    try {
      const text = await extractTextFromFile(file)
      const parsed = parseCourseListText(text)
      setCourseListData(parsed)
      setCourseListFileName(file.name)
      saveCourseList(studentId, { fileName: file.name, parsed })
      setSavedCourseLists(getSavedCourseLists(studentId))
    } catch (e) {
      setError(`Could not read course list: ${e?.message ?? 'unknown error'}`)
    } finally {
      setParsingCourseList(false)
    }
  }, [studentId])

  const applySavedTranscript = useCallback((saved) => {
    setTranscriptData(deserializeParsedTranscript(saved.parsed))
    setTranscriptFileName(saved.fileName)
  }, [])

  const applySavedCourseList = useCallback((saved) => {
    setCourseListData(saved.parsed)
    setCourseListFileName(saved.fileName)
  }, [])

  // Step gating: docs step needs both (an upload or an applied previous doc);
  // waiver step needs a pick, plus a from/to course pair for swap-style waivers.
  const canAdvance =
    step === 0
      ? Boolean(transcriptFileName) && Boolean(courseListFileName)
      : step === 1
        ? Boolean(selectedWaiverId) && (!needsSwap || (swap.fromCourse && swap.toCourse))
        : true

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Flatten controlled File[] lists into the plain descriptors the API reads
      // ({name, size, docType}). File objects are never mutated — docType is
      // assigned here, at the seam, from which list each file came.
      const docs = [
        ...transcript.map((f) => ({ name: f.name, size: f.size, docType: 'transcript' })),
        ...courseList.map((f) => ({ name: f.name, size: f.size, docType: 'course-list' })),
        ...supporting.map((f) => ({ name: f.name, size: f.size, docType: 'supporting' })),
      ]
      const upload = await uploadStudentDocuments(docs)
      const res = await submitWaiver({
        studentId,
        waiverTypeId: selectedWaiverId,
        uploadId: upload.uploadId,
        documents: upload.files,
        studentNote: note.trim(),
        courseList: courseListData?.courseNames ?? [],
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
  }, [transcript, courseList, supporting, selectedWaiverId, note, studentId, courseListData, swap, transcriptData])

  const reset = () => {
    setStep(0)
    setTranscript([])
    setCourseList([])
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
      <section className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Request submitted</h1>
          <p className="mt-1 text-sm text-muted">
            A confirmation email is on its way. Track your request below.
          </p>
        </div>
        <RequestTracker requestId={submittedId} />
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
        >
          Start another request
        </button>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">New waiver request</h1>
        <p className="mt-1 text-sm text-muted">
          Upload your documents, choose a waiver type, then review and submit.
        </p>
      </div>

      <WizardSteps current={step} />

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      {step === 0 && (
        <div className="space-y-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div>
            <PreviousDocSelect label="transcript" saved={savedTranscripts} onApply={applySavedTranscript} />
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
                  Recognized courses {transcriptData.studentGrade ? `· Grade ${transcriptData.studentGrade}` : ''} {transcriptData.gpa ? `· GPA ${transcriptData.gpa}` : ''}
                </p>
                <RecognizedCourseChips recognized={transcriptData.recognized} unrecognized={transcriptData.unrecognized} />
              </>
            )}
          </div>
          <div>
            <PreviousDocSelect label="course list" saved={savedCourseLists} onApply={applySavedCourseList} />
            <UploadZone
              label="Course list"
              hint="Required. PDF, CSV, TXT or pasted list of your current/planned courses."
              docType="course-list"
              accept=".pdf,.csv,.txt"
              files={courseList}
              onFilesChange={handleCourseListFiles}
            />
            {parsingCourseList && <p className="mt-2 text-xs text-muted">Reading course list…</p>}
            {courseListData && (
              <>
                <p className="mt-3 text-xs font-medium text-ink">Recognized courses</p>
                <RecognizedCourseChips recognized={courseListData.recognized} unrecognized={courseListData.unrecognized} />
              </>
            )}
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
        <div className="space-y-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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
        <div className="space-y-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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
                <dd className="font-medium text-ink">{courseListFileName ?? '—'}</dd>
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
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50 disabled:opacity-40"
        >
          Back
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={!canAdvance}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        )}
      </div>
    </section>
  )
}
