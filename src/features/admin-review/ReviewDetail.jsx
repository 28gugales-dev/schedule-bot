import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'

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

// Two-state segmented control matching the shell's role switcher. Lets the
// counselor flip the submission panel between the curated summary and the
// uncurated "as submitted" record.
function ViewToggle({ value, onChange }) {
  const opts = [
    { id: 'summary', label: 'Summary' },
    { id: 'raw', label: 'As submitted' },
  ]
  return (
    <div className="flex gap-0.5 rounded-lg bg-scrim p-0.5">
      {opts.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            value === o.id ? 'bg-elevated text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SubmissionBlock({ request, waiverName }) {
  const { submittedAt, studentNote, documents, courseList } = request
  // 'summary' = the curated reviewer view; 'raw' = the submission verbatim, as
  // the student actually entered it (no injected quotes, no truncation, exact
  // whitespace). Default to summary — counselors skim that first.
  const [view, setView] = useState('summary')

  return (
    <div>
      <SectionHead title="Submitted by student" badge={<ViewToggle value={view} onChange={setView} />} />

      {view === 'summary' ? (
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
      ) : (
        <RawSubmission request={request} waiverName={waiverName} />
      )}
    </div>
  )
}

// The submission exactly as the student entered it — no reviewer reframing.
// Only the note is free-typed text; the rest are selections/uploads, labelled
// truthfully so nothing reads as "typed" that wasn't.
function RawSubmission({ request, waiverName }) {
  const { submittedAt, studentNote, documents, courseList } = request
  return (
    <div className="flex flex-col gap-4 px-4 pb-4 text-sm">
      <Field label="Waiver type — selected">{waiverName}</Field>
      <Field label="Submitted">{fmtDate(submittedAt)}</Field>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">Note to counselor — as typed</span>
        {studentNote ? (
          <p className="whitespace-pre-wrap rounded-lg bg-scrim px-3 py-2 font-mono text-[13px] leading-relaxed text-ink">
            {studentNote}
          </p>
        ) : (
          <p className="italic text-muted">(left blank)</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Documents — uploaded</span>
        {documents.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {documents.map((doc, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 font-mono text-[13px]">
                <a href={doc.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-ink underline-offset-2 hover:underline">
                  {doc.name}
                </a>
                <span className="shrink-0 capitalize text-muted">{doc.type}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="italic text-muted">(none)</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Course list — from upload</span>
        {courseList.length > 0 ? (
          <ol className="flex list-inside list-decimal flex-col gap-0.5 font-mono text-[13px] text-ink">
            {courseList.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        ) : (
          <p className="italic text-muted">(none)</p>
        )}
      </div>
    </div>
  )
}

// Coursework, grouped by the grade-year each class was taken. A counselor reads
// one year at a time, so completed courses are bucketed by `gradeYear` and the
// in-progress `currentSchedule` is filed under the student's current grade.
const GRADE_LABELS = { 9: 'Gr 9', 10: 'Gr 10', 11: 'Gr 11', 12: 'Gr 12' }

function isFailing(grade) {
  return typeof grade === 'string' && /^F/i.test(grade.trim())
}

function CourseRow({ name, meta, failing }) {
  return (
    <div className={`flex justify-between gap-3 rounded px-1.5 py-1 ${failing ? 'bg-danger-500/10' : ''}`}>
      <span className={`min-w-0 truncate ${failing ? 'text-danger-700 dark:text-danger-300' : 'text-ink'}`}>{name}</span>
      <span className={`shrink-0 text-xs ${failing ? 'font-semibold text-danger-600 dark:text-danger-400' : 'text-muted'}`}>{meta}</span>
    </div>
  )
}

function YearTabs({ years, activeYear, onSelect, counts, currentGrade }) {
  function onKeyDown(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const idx = years.indexOf(activeYear)
    const step = e.key === 'ArrowRight' ? 1 : -1
    onSelect(years[(idx + step + years.length) % years.length])
  }
  return (
    <div role="tablist" aria-label="Coursework by grade year" onKeyDown={onKeyDown} className="flex flex-wrap gap-1.5">
      {years.map(y => {
        const active = y === activeYear
        return (
          <button
            key={y}
            role="tab"
            id={`coursework-tab-${y}`}
            aria-selected={active}
            aria-controls={`coursework-panel-${y}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(y)}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
              active
                ? 'bg-brand-500/15 text-brand-700 ring-1 ring-brand-300 dark:text-brand-300'
                : 'bg-scrim text-muted hover:bg-scrim-strong',
            ].join(' ')}
          >
            {GRADE_LABELS[y] ?? `Gr ${y}`}{y === currentGrade ? ' · now' : ''}
            <span className="ml-1 opacity-60">{counts[y]}</span>
          </button>
        )
      })}
    </div>
  )
}

function YearPanel({ bucket, year }) {
  return (
    <div
      role="tabpanel"
      id={`coursework-panel-${year}`}
      aria-labelledby={`coursework-tab-${year}`}
      className="flex flex-col gap-0.5"
    >
      {bucket.completed.map((c, i) => (
        <CourseRow key={`c-${i}`} name={c.name} meta={`${c.grade} · ${c.term}`} failing={isFailing(c.grade)} />
      ))}
      {bucket.current.map((s, i) => (
        <CourseRow key={`s-${i}`} name={s.course} meta={`Period ${s.period} · in progress`} />
      ))}
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

  // Bucket coursework by grade-year: completed courses by their `gradeYear`,
  // the in-progress schedule under the student's current grade.
  const { years, buckets, counts } = useMemo(() => {
    const b = new Map()
    const ensure = y => {
      if (!b.has(y)) b.set(y, { completed: [], current: [] })
      return b.get(y)
    }
    ;(completedCourses ?? []).forEach(c => {
      if (c.gradeYear != null) ensure(c.gradeYear).completed.push(c)
    })
    if (gradeLevel != null && currentSchedule?.length) ensure(gradeLevel).current = currentSchedule
    const ys = [...b.keys()].sort((a, z) => a - z)
    const cnt = Object.fromEntries(ys.map(y => [y, b.get(y).completed.length + b.get(y).current.length]))
    return { years: ys, buckets: b, counts: cnt }
  }, [completedCourses, currentSchedule, gradeLevel])

  // Open on the current grade — what a counselor reads first. Component is keyed
  // by studentId in the parent, so this initial value is correct per student.
  const defaultYear = years.includes(gradeLevel) ? gradeLevel : years[years.length - 1]
  const [activeYear, setActiveYear] = useState(defaultYear)
  const year = buckets.has(activeYear) ? activeYear : defaultYear

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

        {years.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">Academic transcript · from OneRoster</span>
            {years.length > 1 && (
              <YearTabs
                years={years}
                activeYear={year}
                onSelect={setActiveYear}
                counts={counts}
                currentGrade={gradeLevel}
              />
            )}
            <YearPanel bucket={buckets.get(year)} year={year} />
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
  // Deny is the one irreversible negative outcome — gate it behind a confirm.
  // Admit/Flag stay one-click (the brief wants rapid triage).
  const [denyOpen, setDenyOpen] = useState(false)

  // Auto-advance review flow: when a new request mounts here (first open OR after
  // a decision advances to the next), move keyboard/SR focus to the heading so
  // the user follows the slide-in. Keyed on request.id so it fires per request.
  const headingRef = useRef(null)
  useEffect(() => { headingRef.current?.focus() }, [request.id])

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

      {/* Header — compact: back · identity (AI recommendation now lives atop col 3) */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={onBack}
          className="glass-input shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
        >
          ← Back
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="truncate font-display text-lg font-semibold text-ink focus:outline-none"
          >
            {request.student.name}
          </h2>
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

      </div>

      {/* One bubble, three columns split by hairlines:
          1) Submitted by student   2) OneRoster record   3) Rubric + decision.
          Each column scrolls on its own; on phones they stack and the page flows. */}
      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden p-0 lg:flex-row">

        {/* Col 1 — Submitted by student */}
        <div className="flex min-h-0 flex-col border-hairline lg:flex-[1.5] lg:min-w-0 lg:border-r">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            <SubmissionBlock request={request} waiverName={waiverName} />
          </div>
        </div>

        {/* Col 2 — OneRoster record */}
        <div className="flex min-h-0 flex-col border-t border-hairline lg:flex-[1.5] lg:min-w-0 lg:border-t-0 lg:border-r">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            <RosterBlock key={oneRoster?.studentId ?? 'none'} oneRoster={oneRoster} loadingRoster={loadingRoster} />
          </div>
        </div>

        {/* Col 3 — AI recommendation (pinned) → rubric verification (fills + scrolls) → decision pinned below */}
        <div className="flex min-h-0 flex-col border-t border-hairline lg:flex-1 lg:min-w-0 lg:border-t-0">
          {rec && (
            <div className="shrink-0 px-4 pt-3">
              <div
                title={rec.reason || rs.label}
                className={`flex flex-col gap-1.5 rounded-lg px-3 py-2.5 ring-1 ${rs.ring} ${rs.bg}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${rs.text}`}>AI</span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${rs.dot}`} aria-hidden="true" />
                  <span className="text-sm font-semibold text-ink">{rs.label}</span>
                  {pct && <span className="text-xs font-medium text-muted">{pct}</span>}
                </div>
                {rec.reason && <p className={`text-xs leading-relaxed ${rs.text}`}>{rec.reason}</p>}
              </div>
            </div>
          )}

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
                  onClick={() =>
                    a.decision === 'deny'
                      ? setDenyOpen(true)
                      : onDecision(a.decision, note.trim())
                  }
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

      <ConfirmDialog
        open={denyOpen}
        tone="danger"
        title="Deny this request?"
        message="The student will be notified."
        confirmLabel="Deny"
        cancelLabel="Cancel"
        onCancel={() => setDenyOpen(false)}
        onConfirm={() => { setDenyOpen(false); onDecision('deny', note.trim()) }}
      />
    </section>
  )
}
