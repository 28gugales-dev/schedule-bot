import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchAvailableWaivers, uploadStudentDocuments, submitWaiver } from '../../services/api.js'
import { UploadZone } from './UploadZone.jsx'
import { WaiverSelectGrid } from './WaiverSelectGrid.jsx'
import { RequestTracker } from './RequestTracker.jsx'

// Guided student intake: Documents -> Waiver type -> Review & submit -> Tracker.
// This component is the integration root for the student portal: it owns all
// wizard state and the runtime prop contracts of its three leaf components.
const STEPS = ['Documents', 'Waiver type', 'Review & submit']

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

export function WaiverIntake() {
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

  // Step gating: docs step needs both required uploads; waiver step needs a pick.
  const canAdvance =
    step === 0
      ? transcript.length > 0 && courseList.length > 0
      : step === 1
        ? Boolean(selectedWaiverId)
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
        waiverTypeId: selectedWaiverId,
        uploadId: upload.uploadId,
        documents: upload.files,
        studentNote: note.trim(),
      })
      setSubmittedId(res.requestId)
    } catch (e) {
      setError(e?.message ?? 'Submission failed — please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [transcript, courseList, supporting, selectedWaiverId, note])

  const reset = () => {
    setStep(0)
    setTranscript([])
    setCourseList([])
    setSupporting([])
    setSelectedWaiverId(null)
    setNote('')
    setSubmittedId(null)
    setError(null)
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
          <UploadZone
            label="Transcript (PDF)"
            hint="Required. Your official or unofficial transcript."
            docType="transcript"
            accept=".pdf"
            files={transcript}
            onFilesChange={setTranscript}
          />
          <UploadZone
            label="Course list"
            hint="Required. PDF, CSV or XLSX of your current/planned courses."
            docType="course-list"
            accept=".pdf,.csv,.xlsx"
            files={courseList}
            onFilesChange={setCourseList}
          />
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
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          {waiversLoading ? (
            <p className="text-sm text-muted">Loading waiver types…</p>
          ) : (
            <WaiverSelectGrid
              waivers={waivers}
              selectedId={selectedWaiverId}
              onSelect={setSelectedWaiverId}
            />
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
                <dd className="font-medium text-ink">{transcript.length ? transcript[0].name : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Course list</dt>
                <dd className="font-medium text-ink">{courseList.length ? courseList[0].name : '—'}</dd>
              </div>
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
