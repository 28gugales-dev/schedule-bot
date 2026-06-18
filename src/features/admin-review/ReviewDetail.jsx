import { useState, useMemo, useRef, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'

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
  admit:  { ring: 'ring-success-300', bg: 'bg-success-50', dot: 'bg-success-500', text: 'text-success-700 dark:text-success-300', label: 'Admit'  },
  deny:   { ring: 'ring-danger-300',  bg: 'bg-danger-50',  dot: 'bg-danger-500',  text: 'text-danger-700 dark:text-danger-300',  label: 'Deny'   },
  review: { ring: 'ring-warning-300', bg: 'bg-warning-50', dot: 'bg-warning-500', text: 'text-warning-700 dark:text-warning-300', label: 'Review' },
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

// Section eyebrow header used inside the single cockpit bubble (no card chrome —
// columns are divided by hairlines, peregryne-style).
function SectionHead({ title, badge }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5">
      <p className="eyebrow">{title}</p>
      {badge}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Evidence column blocks — submission + OneRoster (card-less; live in one bubble)
// ---------------------------------------------------------------------------

function SubmissionBlock({ request, waiverName }) {
  const { submittedAt, studentNote, documents, courseList } = request
  return (
    <div>
      <SectionHead title="Submitted by student" />
      <div className="flex flex-col gap-4 px-4 pb-4 text-sm">
        <Field label="Waiver type">{waiverName}</Field>
        <Field label="Submitted">{fmtDate(submittedAt)}</Field>

        {studentNote && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Student note</span>
            <blockquote className="border-l-4 border-hairline pl-4 italic leading-relaxed text-ink">
              "{studentNote}"
            </blockquote>
          </div>
        )}

        {documents.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Documents</span>
            <ul className="flex flex-col gap-1.5">
              {documents.map((doc, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded bg-scrim px-2 py-0.5 text-xs font-medium capitalize text-muted">
                    {doc.type}
                  </span>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">
                    {doc.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {courseList.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">Requested courses</span>
            <div className="flex flex-wrap gap-2">
              {courseList.map((c, i) => (
                <span key={i} className="rounded-full bg-scrim px-3 py-1 text-xs font-medium text-ink">{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RosterBlock({ oneRoster, loadingRoster }) {
  if (loadingRoster) {
    return (
      <div>
        <SectionHead title="OneRoster record" />
        <div className="flex animate-pulse flex-col gap-3 px-4 pb-4">
          <div className="h-4 w-40 rounded bg-scrim" />
          <div className="h-4 w-56 rounded bg-scrim" />
          <div className="h-4 w-32 rounded bg-scrim" />
        </div>
      </div>
    )
  }

  if (!oneRoster) {
    return (
      <div>
        <SectionHead title="OneRoster record" />
        <p className="px-4 pb-4 text-sm text-muted">No SIS record found.</p>
      </div>
    )
  }

  const { studentId, gpa, attendanceRate, gradeLevel, enrollmentStatus, completedCourses, currentSchedule, lastSync } = oneRoster

  return (
    <div>
      <SectionHead title="OneRoster record" />
      <div className="flex flex-col gap-4 px-4 pb-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          {studentId && <Field label="Student ID">{studentId}</Field>}
          <Field label="GPA">{gpa != null ? gpa.toFixed(2) : '—'}</Field>
          <Field label="Attendance">{attendanceRate != null ? `${attendanceRate}%` : '—'}</Field>
          <Field label="Grade level">{gradeLevel ?? '—'}</Field>
          <Field label="Enrollment status">{enrollmentStatus ?? '—'}</Field>
        </div>

        {completedCourses?.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Completed courses</span>
            {completedCourses.map((c, i) => (
              <div key={i} className="flex justify-between gap-3 text-ink">
                <span className="min-w-0 truncate">{c.name}</span>
                <span className="shrink-0 text-xs text-muted">{c.grade} · {c.term}</span>
              </div>
            ))}
          </div>
        )}

        {currentSchedule?.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Current schedule</span>
            {currentSchedule.map((s, i) => (
              <div key={i} className="flex justify-between gap-3 text-ink">
                <span className="min-w-0 truncate">{s.course}</span>
                <span className="shrink-0 text-xs text-muted">Period {s.period}</span>
              </div>
            ))}
          </div>
        )}

        {lastSync && (
          <p className="border-t border-hairline pt-2 text-xs text-muted">Synced {fmtDate(lastSync)}</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Analysis column — rubric verification (fixed head + scrolling rows)
// ---------------------------------------------------------------------------

function Chevron({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
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

  const [expanded, setExpanded] = useState(() => new Set(failedIds))
  function toggle(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const badge = (
    <span className="text-right text-xs">
      {failedCount > 0 ? (
        <span className="font-semibold text-danger-600 dark:text-danger-400">
          {failedCount} {failedCount === 1 ? 'needs attention' : 'need attention'}
        </span>
      ) : (
        <span className="font-semibold text-success-700 dark:text-success-300">All passed</span>
      )}
      <span className="text-muted"> · {passedCount}/{checks.length}</span>
    </span>
  )

  return (
    <>
      <SectionHead title="Rubric verification" badge={badge} />
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
        {ordered.map(check => {
          const isOpen = expanded.has(check.id)
          const ok = check.passed
          return (
            <div key={check.id} className={`overflow-hidden rounded-lg ring-1 ${ok ? 'ring-hairline' : 'ring-danger-200'}`}>
              <button
                type="button"
                onClick={() => toggle(check.id)}
                aria-expanded={isOpen}
                aria-label={`${ok ? 'Passed' : 'Failed'}: ${check.label}. ${isOpen ? 'Collapse' : 'Expand'} reasoning.`}
                className={[
                  'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset',
                  ok
                    ? 'bg-scrim hover:bg-scrim-strong focus-visible:ring-hairline'
                    : 'bg-danger-500/12 hover:bg-danger-500/20 focus-visible:ring-danger-300',
                ].join(' ')}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {!ok && <span className="h-2 w-2 shrink-0 rounded-full bg-danger-500" />}
                  <span className="truncate text-sm font-medium text-ink">{check.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-1 ${
                    ok
                      ? 'bg-success-50 text-success-700 ring-success-300 dark:text-success-300'
                      : 'bg-danger-100 text-danger-700 ring-danger-300 dark:text-danger-300'
                  }`}>
                    {ok ? '✓' : '✗'}
                  </span>
                  <Chevron open={isOpen} />
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-3 border-t border-hairline bg-scrim px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="eyebrow">Claimed</span>
                      <span className="font-medium text-ink">{check.claimed ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="eyebrow">Actual (SIS)</span>
                      <span className={`font-medium ${ok ? 'text-success-700 dark:text-success-300' : 'text-danger-700 dark:text-danger-300'}`}>
                        {check.actual ?? '—'}
                      </span>
                    </div>
                  </div>
                  <p className="leading-relaxed text-muted">{check.reasoning}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main export — exact prop contract; no service imports
// ---------------------------------------------------------------------------

const ACTIONS = [
  { decision: 'admit', label: 'Admit', icon: '✓', tone: 'text-success-600 dark:text-success-400', hover: 'hover:border-success-300 hover:bg-success-50' },
  { decision: 'flag',  label: 'Flag',  icon: '⚑', tone: 'text-warning-600 dark:text-warning-400', hover: 'hover:border-warning-300 hover:bg-warning-50' },
  { decision: 'deny',  label: 'Deny',  icon: '✗', tone: 'text-danger-600 dark:text-danger-400',  hover: 'hover:border-danger-300 hover:bg-danger-50' },
]

export function ReviewDetail({ request, waiverName, oneRoster, loadingRoster, submitting, onBack, onDecision }) {
  const [note, setNote] = useState('')

  // Fill the viewport: the cockpit bubble is locked to the measured available
  // height so its columns scroll on their own and the page never scrolls. The
  // offset (top bar + paddings) is MEASURED, not guessed, so "no page scroll"
  // holds at any viewport height / zoom / font size. Only engages at lg.
  const sectionRef = useRef(null)
  const [lockedHeight, setLockedHeight] = useState(null)
  useLayoutEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const lg = window.matchMedia('(min-width: 1024px)')
    const BOTTOM_GAP = 16
    const measure = () => {
      if (!lg.matches) { setLockedHeight(null); return }
      const top = el.getBoundingClientRect().top
      setLockedHeight(Math.max(420, Math.round(window.innerHeight - top - BOTTOM_GAP)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const rec = request.recommendation
  const rs = REC_STYLES[rec?.decision] ?? REC_STYLES.review
  const pct = rec?.confidence != null ? `${Math.round(rec.confidence * 100)}%` : ''

  return (
    <section
      ref={sectionRef}
      style={lockedHeight ? { height: lockedHeight } : undefined}
      className="fade-in flex flex-col gap-2 lg:overflow-hidden"
    >

      {/* Header — compact: back · identity · AI recommendation chip */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={onBack}
          className="glass-input shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
        >
          ← Back
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h2 className="truncate font-display text-lg font-semibold text-ink">{request.student.name}</h2>
          <div className="flex flex-wrap items-baseline gap-x-3 text-xs text-muted">
            <span>ID <span className="font-medium text-ink">{request.student.id}</span></span>
            <span>Grade <span className="font-medium text-ink">{request.student.grade}</span></span>
            <span>GPA <span className="font-medium text-ink">{request.student.gpa?.toFixed(2)}</span></span>
            <Link
              to={`/admin/audit?student=${encodeURIComponent(request.student.id)}`}
              className="font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-300"
            >
              History →
            </Link>
          </div>
        </div>

        {rec && (
          <div
            title={rec.reason || rs.label}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 ring-1 ${rs.ring} ${rs.bg} max-w-full`}
          >
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${rs.text}`}>AI</span>
            <span className={`h-2 w-2 shrink-0 rounded-full ${rs.dot}`} aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">{rs.label}</span>
            {pct && <span className="text-xs font-medium text-muted">{pct}</span>}
            {rec.reason && <span className={`hidden min-w-0 truncate text-xs xl:inline ${rs.text}`}>· {rec.reason}</span>}
          </div>
        )}
      </div>

      {/* One bubble, three columns split by hairlines:
          1) Submitted by student   2) OneRoster record   3) Rubric + decision.
          Each column scrolls on its own; on phones they stack and the page flows. */}
      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden p-0 lg:flex-row">

        {/* Col 1 — Submitted by student */}
        <div className="flex min-h-0 flex-col border-hairline lg:flex-1 lg:min-w-0 lg:border-r">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            <SubmissionBlock request={request} waiverName={waiverName} />
          </div>
        </div>

        {/* Col 2 — OneRoster record */}
        <div className="flex min-h-0 flex-col border-t border-hairline lg:flex-1 lg:min-w-0 lg:border-t-0 lg:border-r">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            <RosterBlock oneRoster={oneRoster} loadingRoster={loadingRoster} />
          </div>
        </div>

        {/* Col 3 — Rubric verification (fills + scrolls) + decision pinned below */}
        <div className="flex min-h-0 flex-col border-t border-hairline lg:flex-[1.8] lg:min-w-0 lg:border-t-0">
          {request.checks?.length > 0 ? (
            <VerificationSection key={request.id} checks={request.checks} />
          ) : (
            <>
              <SectionHead title="Rubric verification" />
              <p className="flex-1 px-4 pb-4 text-sm text-muted">No rubric checks for this request.</p>
            </>
          )}

          {/* Decision — note + the three triage actions */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-hairline p-3">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional note (shown to student)…"
              disabled={submitting}
              className="glass-input w-full px-3 py-1.5 text-sm text-ink placeholder:text-muted disabled:opacity-50"
            />
            <div className="flex gap-2">
              {ACTIONS.map(a => (
                <button
                  key={a.decision}
                  onClick={() => onDecision(a.decision, note.trim())}
                  disabled={submitting}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border border-hairline px-3 py-2 text-sm font-medium text-ink transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 ${a.hover}`}
                >
                  <span className={`text-base ${a.tone}`}>{a.icon}</span>
                  {submitting ? 'Saving…' : a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
