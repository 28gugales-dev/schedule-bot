import { useState, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const REC_STYLES = {
  admit:  { ring: 'ring-emerald-300', bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'ADMIT'  },
  deny:   { ring: 'ring-rose-300',    bg: 'bg-rose-50',     text: 'text-rose-700',    label: 'DENY'   },
  review: { ring: 'ring-amber-300',   bg: 'bg-amber-50',    text: 'text-amber-700',   label: 'REVIEW' },
}

// Small labelled field
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-medium text-ink">{children}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Left card — student submission
// ---------------------------------------------------------------------------

function SubmissionCard({ request, waiverName }) {
  const { submittedAt, studentNote, documents, courseList } = request
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Submitted by student</p>

      <Field label="Waiver type">{waiverName}</Field>
      <Field label="Submitted">{fmtDate(submittedAt)}</Field>

      {studentNote && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted">Student note</span>
          <blockquote className="border-l-4 border-slate-300 pl-4 text-ink leading-relaxed italic">
            "{studentNote}"
          </blockquote>
        </div>
      )}

      {documents.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs text-muted">Documents</span>
          <ul className="flex flex-col gap-1.5">
            {documents.map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted capitalize">
                  {doc.type}
                </span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline-offset-2 hover:underline"
                >
                  {doc.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {courseList.length > 0 && (
        <div className="flex flex-col gap-2 text-sm">
          <span className="text-xs text-muted">Requested courses</span>
          <div className="flex flex-wrap gap-2">
            {courseList.map((c, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Right card — OneRoster authoritative record
// ---------------------------------------------------------------------------

function RosterCard({ oneRoster, loadingRoster }) {
  if (loadingRoster) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-3 animate-pulse">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">OneRoster record</p>
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="h-4 w-56 rounded bg-slate-200" />
        <div className="h-4 w-32 rounded bg-slate-200" />
        <p className="text-sm text-muted pt-1">Loading SIS record…</p>
      </div>
    )
  }

  if (!oneRoster) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">OneRoster record</p>
        <p className="text-sm text-muted">No SIS record found.</p>
      </div>
    )
  }

  const { studentId, gpa, attendanceRate, gradeLevel, enrollmentStatus, completedCourses, currentSchedule, lastSync } = oneRoster

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">OneRoster record</p>

      <div className="grid grid-cols-2 gap-3">
        {studentId && <Field label="Student ID">{studentId}</Field>}
        <Field label="GPA">{gpa != null ? gpa.toFixed(2) : '—'}</Field>
        <Field label="Attendance">{attendanceRate != null ? `${attendanceRate}%` : '—'}</Field>
        <Field label="Grade level">{gradeLevel ?? '—'}</Field>
        <Field label="Enrollment status">{enrollmentStatus ?? '—'}</Field>
      </div>

      {completedCourses?.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs text-muted font-medium">Completed courses</span>
          {completedCourses.map((c, i) => (
            <div key={i} className="flex justify-between text-ink">
              <span>{c.name}</span>
              <span className="text-muted text-xs">{c.grade} · {c.term}</span>
            </div>
          ))}
        </div>
      )}

      {currentSchedule?.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs text-muted font-medium">Current schedule</span>
          {currentSchedule.map((s, i) => (
            <div key={i} className="flex justify-between text-ink">
              <span>{s.course}</span>
              <span className="text-muted text-xs">Period {s.period}</span>
            </div>
          ))}
        </div>
      )}

      {lastSync && (
        <p className="text-xs text-muted border-t border-slate-100 pt-2">
          Synced {fmtDate(lastSync)}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rubric verification (full width, below the columns)
// ---------------------------------------------------------------------------

// Chevron that rotates when its row is open
function Chevron({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="4 6 8 10 12 6" />
    </svg>
  )
}

function VerificationSection({ checks }) {
  // A counselor scans for what FAILED. Surface failures first and open them by
  // default; passing checks collapse to a green ✓ they can skim past.
  const ordered = useMemo(
    () => [...checks].sort((a, b) => Number(a.passed) - Number(b.passed)),
    [checks],
  )
  const failedIds = useMemo(() => checks.filter(c => !c.passed).map(c => c.id), [checks])
  const failedCount = failedIds.length
  const passedCount = checks.length - failedCount

  // Multi-open accordion: failed rows start expanded so reasoning is visible at a glance.
  const [expanded, setExpanded] = useState(() => new Set(failedIds))
  function toggle(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rubric verification</p>
        <span className="text-sm">
          {failedCount > 0 ? (
            <span className="font-semibold text-rose-600">
              {failedCount} {failedCount === 1 ? 'check needs' : 'checks need'} attention
            </span>
          ) : (
            <span className="font-semibold text-emerald-600">All {checks.length} checks passed</span>
          )}
          <span className="text-muted"> · {passedCount}/{checks.length} passed</span>
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {ordered.map(check => {
          const isOpen = expanded.has(check.id)
          const ok = check.passed

          return (
            <li
              key={check.id}
              className={`rounded-lg ring-1 overflow-hidden ${ok ? 'ring-slate-200' : 'ring-rose-200'}`}
            >
              {/* Whole row toggles — large hit target, status shown by badge + tint */}
              <button
                type="button"
                onClick={() => toggle(check.id)}
                aria-expanded={isOpen}
                aria-label={`${ok ? 'Passed' : 'Failed'}: ${check.label}. ${isOpen ? 'Collapse' : 'Expand'} reasoning.`}
                className={[
                  'w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset',
                  ok
                    ? 'bg-white hover:bg-slate-50 focus-visible:ring-slate-300'
                    : 'bg-rose-50/70 hover:bg-rose-50 focus-visible:ring-rose-300',
                ].join(' ')}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {!ok && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                  <span className="truncate text-sm font-medium text-ink">{check.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <span
                    className={`flex w-7 h-7 items-center justify-center rounded-full text-sm font-bold ring-1 ${
                      ok
                        ? 'bg-emerald-50 ring-emerald-300 text-emerald-700'
                        : 'bg-rose-100 ring-rose-300 text-rose-700'
                    }`}
                  >
                    {ok ? '✓' : '✗'}
                  </span>
                  <Chevron open={isOpen} />
                </span>
              </button>

              {/* Expanded reasoning: claimed (form) vs actual (SIS) + counselor note */}
              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 flex flex-col gap-3 text-sm">
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Claimed</span>
                      <span className="text-ink font-medium">{check.claimed ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Actual (SIS)</span>
                      <span className={`font-medium ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {check.actual ?? '—'}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted leading-relaxed">{check.reasoning}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export — exact prop contract; no service imports
// ---------------------------------------------------------------------------

export function ReviewDetail({ request, waiverName, oneRoster, loadingRoster, submitting, onBack, onDecision }) {
  const [note, setNote] = useState('')

  const rec = request.recommendation
  const rs = REC_STYLES[rec?.decision] ?? REC_STYLES.review
  const pct = rec?.confidence != null ? `${Math.round(rec.confidence * 100)}%` : ''

  return (
    <section className="flex flex-col gap-5 max-w-5xl mx-auto">

      {/* 1. Header row */}
      <div className="flex flex-wrap items-start gap-4">
        <button
          onClick={onBack}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-slate-200 bg-white hover:bg-slate-50 transition self-center"
        >
          ← Back to queue
        </button>

        {/* Student identity */}
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-ink">{request.student.name}</p>
          <div className="flex flex-wrap gap-3 text-sm text-muted mt-0.5">
            <span>ID: <span className="text-ink font-medium">{request.student.id}</span></span>
            <span>Grade: <span className="text-ink font-medium">{request.student.grade}</span></span>
            <span>GPA: <span className="text-ink font-medium">{request.student.gpa?.toFixed(2)}</span></span>
          </div>
        </div>

        {/* Algorithm recommendation pill */}
        {rec && (
          <div className={`rounded-xl px-4 py-2.5 ring-1 ${rs.ring} ${rs.bg} flex flex-col gap-1 max-w-xs shrink-0`}>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${rs.text} bg-white ring-1 ${rs.ring}`}>
                {rs.label}{pct ? ` · ${pct}` : ''}
              </span>
            </div>
            {rec.reason && (
              <p className={`text-xs ${rs.text} leading-snug`}>{rec.reason}</p>
            )}
          </div>
        )}
      </div>

      {/* 2. Two-column grid: submission (left) + OneRoster (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SubmissionCard request={request} waiverName={waiverName} />
        <RosterCard oneRoster={oneRoster} loadingRoster={loadingRoster} />
      </div>

      {/* 3. Rubric verification (full width) */}
      {request.checks?.length > 0 && (
        <VerificationSection key={request.id} checks={request.checks} />
      )}

      {/* 4. Action row */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex flex-col gap-3">
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional note (shown to student)…"
          disabled={submitting}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        />
        <div className="flex gap-3">
          <button
            onClick={() => onDecision('admit', note.trim())}
            disabled={submitting}
            className="flex-1 rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : '✓ Admit'}
          </button>
          <button
            onClick={() => onDecision('deny', note.trim())}
            disabled={submitting}
            className="flex-1 rounded-xl bg-rose-600 py-4 text-base font-semibold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : '✗ Deny'}
          </button>
        </div>
      </div>

    </section>
  )
}
