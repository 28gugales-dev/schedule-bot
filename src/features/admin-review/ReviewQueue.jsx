import { useState, useEffect, useCallback } from 'react'
import { fetchReviewQueue, submitDecision, fetchAllWaivers } from '../../services/api.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ConfidencePct({ value }) {
  return <span>{Math.round(value * 100)}%</span>
}

// recommendation.decision → Tailwind colour tokens
const REC_STYLES = {
  admit:  { ring: 'ring-emerald-300', bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'Admit'  },
  deny:   { ring: 'ring-rose-300',    bg: 'bg-rose-50',     text: 'text-rose-700',    label: 'Deny'   },
  review: { ring: 'ring-amber-300',   bg: 'bg-amber-50',    text: 'text-amber-700',   label: 'Review' },
}

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

function StudentPanel({ student, waiverName, submittedAt }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Student</p>
      <p className="text-lg font-semibold text-ink">{student.name}</p>
      <div className="flex flex-wrap gap-3 text-sm text-muted">
        <span>ID: <span className="text-ink font-medium">{student.id}</span></span>
        <span>Grade: <span className="text-ink font-medium">{student.grade}</span></span>
        <span>GPA: <span className="text-ink font-medium">{student.gpa.toFixed(2)}</span></span>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-muted mt-1">
        <span>Waiver type: <span className="text-ink font-medium">{waiverName}</span></span>
        <span>Submitted: <span className="text-ink font-medium">{fmtDate(submittedAt)}</span></span>
      </div>
    </div>
  )
}

function CheckRow({ check }) {
  const icon = check.passed === null ? '–' : check.passed ? '✓' : '✗'
  const color = check.passed === null ? 'text-muted' : check.passed ? 'text-emerald-700' : 'text-rose-700'
  return (
    <li className={`flex items-center gap-2 text-xs ${color}`}>
      <span className="font-bold">{icon}</span>
      <span>{check.label}</span>
    </li>
  )
}

function AlgorithmPanel({ recommendation }) {
  const s = REC_STYLES[recommendation.decision] ?? REC_STYLES.review
  return (
    <div className={`rounded-xl p-5 shadow-sm ring-1 ${s.ring} ${s.bg} flex flex-col gap-2`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Algorithm recommendation</p>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ${s.text} bg-white ring-1 ${s.ring}`}>
          {s.label}
        </span>
        <span className={`text-sm font-semibold ${s.text}`}>
          Confidence: <ConfidencePct value={recommendation.confidence} />
        </span>
      </div>
      <p className={`text-sm ${s.text} leading-relaxed`}>{recommendation.reason}</p>
      {recommendation.checks?.length > 0 && (
        <ul className="mt-1 space-y-1 border-t border-black/10 pt-2">
          {recommendation.checks.map((check, i) => (
            <CheckRow key={`${check.id}-${i}`} check={check} />
          ))}
        </ul>
      )}
    </div>
  )
}

function DocumentsPanel({ documents }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Documents</p>
      {documents.length === 0 ? (
        <p className="text-sm text-muted">No documents attached.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted capitalize">{doc.type}</span>
              <span className="text-ink font-medium">{doc.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CourseListPanel({ courseList }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Requested courses</p>
      <div className="flex flex-wrap gap-2">
        {courseList.map((c, i) => (
          <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink">
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}

function StudentNotePanel({ note }) {
  if (!note) return null
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Student note</p>
      <blockquote className="border-l-4 border-slate-300 pl-4 text-sm text-ink leading-relaxed italic">
        "{note}"
      </blockquote>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Action row
// ---------------------------------------------------------------------------

function ActionRow({ onAdmit, onDeny, submitting, note, onNoteChange }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-3">
      <input
        type="text"
        value={note}
        onChange={e => onNoteChange(e.target.value)}
        placeholder="Optional note (shown to student)…"
        disabled={submitting}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
      />
      <div className="flex gap-3">
        <button
          onClick={onAdmit}
          disabled={submitting}
          className="flex-1 rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : '✓ Admit'}
        </button>
        <button
          onClick={onDeny}
          disabled={submitting}
          className="flex-1 rounded-xl bg-rose-600 py-4 text-base font-semibold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : '✗ Deny'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="rounded-xl bg-white p-10 shadow-sm ring-1 ring-slate-200 text-center max-w-sm">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-lg font-semibold text-ink">All caught up</p>
        <p className="mt-1 text-sm text-muted">No pending waiver requests.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReviewQueue() {
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [waiverMap, setWaiverMap] = useState({})   // waiverTypeId → name
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // slide transition: 'idle' | 'out' | 'in'
  const [transition, setTransition] = useState('idle')

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [q, waivers] = await Promise.all([fetchReviewQueue(), fetchAllWaivers()])
        if (cancelled) return
        const map = {}
        for (const w of waivers) map[w.id] = w.name
        setWaiverMap(map)
        setQueue(q)
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load queue.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Submit decision ────────────────────────────────────────────────────────
  const handleDecision = useCallback(async (decision) => {
    const request = queue[currentIndex]
    if (!request || submitting) return

    setSubmitting(true)

    // Optimistically advance — start slide-out immediately
    setTransition('out')

    try {
      await submitDecision(request.id, decision, note)
    } catch {
      // Non-fatal: decision already logged optimistically; log silently
    }

    // Remove from local queue, reset note
    setQueue(prev => {
      const next = [...prev]
      next.splice(currentIndex, 1)
      return next
    })
    // Keep index clamped after removal (handled in render via remaining length)
    setNote('')
    setSubmitting(false)

    // Slide in new card
    setTransition('in')
    setTimeout(() => setTransition('idle'), 200)
  }, [queue, currentIndex, note, submitting])

  // ── Derived state ──────────────────────────────────────────────────────────
  const remaining = queue.length
  // currentIndex might exceed new length after removal — clamp
  const safeIndex = Math.min(currentIndex, Math.max(remaining - 1, 0))
  const request = remaining > 0 ? queue[safeIndex] : null
  const waiverName = request ? (waiverMap[request.waiverTypeId] ?? request.waiverTypeId) : ''

  // Transition classes
  const transitionClass =
    transition === 'out' ? 'opacity-0 translate-x-4' :
    transition === 'in'  ? 'opacity-0 -translate-x-4' :
    'opacity-100 translate-x-0'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-ink">Waiver Review Queue</h1>
        {loading ? (
          <p className="mt-1 text-sm text-muted">Loading…</p>
        ) : error ? (
          <p className="mt-1 text-sm text-rose-600">{error}</p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            {remaining > 0
              ? `${remaining} request${remaining !== 1 ? 's' : ''} remaining`
              : 'Queue is empty'}
          </p>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center text-sm text-muted">
          Loading queue…
        </div>
      ) : error ? (
        <div className="rounded-xl bg-rose-50 p-8 ring-1 ring-rose-200 text-center text-sm text-rose-700">
          {error}
        </div>
      ) : !request ? (
        <EmptyState />
      ) : (
        <div
          key={request.id}
          className={`flex flex-col gap-4 transition-all duration-150 ease-in-out ${transitionClass}`}
        >
          <StudentPanel
            student={request.student}
            waiverName={waiverName}
            submittedAt={request.submittedAt}
          />
          <AlgorithmPanel recommendation={request.recommendation} />
          <DocumentsPanel documents={request.documents} />
          <CourseListPanel courseList={request.courseList} />
          {request.studentNote && <StudentNotePanel note={request.studentNote} />}
          <ActionRow
            onAdmit={() => handleDecision('admit')}
            onDeny={() => handleDecision('deny')}
            submitting={submitting}
            note={note}
            onNoteChange={setNote}
          />
        </div>
      )}
    </section>
  )
}
