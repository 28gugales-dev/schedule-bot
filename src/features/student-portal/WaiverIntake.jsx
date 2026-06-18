import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchAvailableWaivers, uploadStudentDocuments, submitWaiver } from '../../services/api.js'
import { UploadZone } from './UploadZone.jsx'
import { WaiverSelectGrid } from './WaiverSelectGrid.jsx'
import { RequestTracker } from './RequestTracker.jsx'

// Guided student intake: Documents -> Waiver type -> Review & submit -> Tracker.
// This component is the integration root for the student portal: it owns all
// wizard state and the runtime prop contracts of its three leaf components.
const STEPS = ['Documents', 'Waiver type', 'Review & submit']

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
                    ? 'cursor-pointer bg-brand-50 text-brand-700 hover:bg-brand-100'
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

  // Why "Continue" is disabled — surfaced to the user instead of a dead button.
  const advanceHint =
    step === 0
      ? 'Upload your transcript and course list to continue.'
      : step === 1
        ? 'Select a waiver type to continue.'
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
          className="glass-input rounded-xl px-4 py-2 text-sm font-medium text-ink transition hover:bg-white/80"
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
          className="flex items-start gap-2 rounded-lg bg-danger-50 px-3 py-2.5 text-sm text-danger-700 ring-1 ring-danger-100"
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
          <div className="grid gap-6 lg:grid-cols-2">
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
        <div className="glass-card p-5">
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
          className="glass-input rounded-xl px-4 py-2 text-sm font-medium text-ink transition hover:bg-white/80 disabled:opacity-40"
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
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
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
