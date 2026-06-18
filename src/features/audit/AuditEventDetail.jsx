import { useEffect } from 'react'
import { actionMeta } from '../../services/audit.schema.js'
import {
  fmtDateTime,
  ActionPill,
  OverrideFlag,
  ActorAvatar,
  roleLabel,
  DecisionPill,
} from './auditShared.jsx'

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="eyebrow">{label}</span>
      <span className="text-sm font-medium text-ink">{children}</span>
    </div>
  )
}

function fmtCell(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  if (v == null || v === '') return '—'
  return String(v)
}

// Field-level diff for config edits (rubric / waiver toggles).
function DiffTable({ diff }) {
  return (
    <div className="flex flex-col gap-2">
      {diff.map((d, i) => (
        <div key={i} className="rounded-lg bg-scrim p-3 ring-1 ring-hairline">
          <p className="text-xs font-medium text-ink">{d.entity}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{d.field}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded bg-danger-50 px-2 py-0.5 font-medium text-danger-700 line-through dark:text-danger-300">
              {fmtCell(d.from)}
            </span>
            <span className="text-muted">→</span>
            <span className="rounded bg-success-50 px-2 py-0.5 font-medium text-success-700 dark:text-success-300">
              {fmtCell(d.to)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Compact key/value snapshot for submission / sync events.
function Snapshot({ title, data }) {
  if (!data || typeof data !== 'object') return null
  const entries = Object.entries(data).filter(([, v]) => v !== undefined)
  if (!entries.length) return null
  return (
    <div className="rounded-lg bg-scrim p-3 ring-1 ring-hairline">
      <p className="eyebrow mb-1.5">{title}</p>
      <dl className="flex flex-col gap-1 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt>
            <dd className="font-medium text-ink">{fmtCell(typeof v === 'object' ? JSON.stringify(v) : v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function AuditEventDetail({ event, onClose, onViewAi, onViewStudent }) {
  // Close on Escape — drawer convention.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const meta = actionMeta(event.action)
  const isDecision = meta.category === 'decision'
  const isConfig = meta.category === 'config'
  const rec = event.before?.aiRecommendation

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Audit event detail"
        className="glass-panel animate-toast-in relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-highlight custom-scrollbar"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-glass-strong px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <ActionPill action={event.action} />
            {event.overrode && <OverrideFlag />}
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-scrim hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <p className="font-display text-lg font-semibold leading-snug text-ink">{event.summary}</p>

          {/* Who / device / when */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <ActorAvatar actor={event.actor} className="h-9 w-9 text-xs" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{event.actor?.name ?? '—'}</p>
                <p className="text-xs text-muted">{roleLabel(event.actor?.role)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Row label="When">{fmtDateTime(event.ts)}</Row>
              <Row label="Device">
                <span title={event.device?.ua}>{event.device?.label ?? '—'}</span>
              </Row>
            </div>
            {event.device?.id && (
              <p className="-mt-2 break-all font-mono text-[10px] text-muted">device {event.device.id}</p>
            )}
          </div>

          {/* Student affected */}
          {event.student && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-scrim px-3 py-2.5 ring-1 ring-hairline">
              <div>
                <p className="eyebrow">Student affected</p>
                <p className="text-sm font-medium text-ink">{event.student.name}</p>
                <p className="text-xs text-muted">{event.student.id}</p>
              </div>
              <button
                type="button" onClick={() => onViewStudent?.(event.student.id)}
                className="glass-input rounded-lg px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-glass-hover"
              >
                History →
              </button>
            </div>
          )}

          {/* Decision: AI rec → outcome */}
          {isDecision && (
            <div className="flex flex-col gap-3">
              <p className="eyebrow">Before → After</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg bg-scrim p-3 ring-1 ring-hairline">
                  <p className="text-[11px] uppercase tracking-wide text-muted">AI recommended</p>
                  <div className="mt-1.5">
                    {rec ? <DecisionPill value={rec.decision} /> : <span className="text-sm text-muted">—</span>}
                    {rec?.confidence != null && (
                      <span className="ml-2 text-xs text-muted">{Math.round(rec.confidence * 100)}%</span>
                    )}
                  </div>
                </div>
                <span className="text-muted">→</span>
                <div className="flex-1 rounded-lg bg-scrim p-3 ring-1 ring-hairline">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Counselor decided</p>
                  <p className="mt-1.5 text-sm font-semibold capitalize text-ink">{event.after?.status ?? '—'}</p>
                </div>
              </div>
              {event.overrode && (
                <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700 ring-1 ring-warning-300 dark:text-warning-300">
                  This decision overrode the AI recommendation.
                </p>
              )}
              {event.aiDecisionId && (
                <button
                  type="button" onClick={() => onViewAi?.(event.aiDecisionId)}
                  className="glass-input self-start rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
                >
                  View AI reasoning →
                </button>
              )}
            </div>
          )}

          {/* Config: field-level diff */}
          {isConfig && Array.isArray(event.diff) && event.diff.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="eyebrow">What changed</p>
              <DiffTable diff={event.diff} />
            </div>
          )}

          {/* Submission / sync snapshots */}
          {!isDecision && !isConfig && (
            <div className="flex flex-col gap-2">
              <Snapshot title="Before" data={event.before} />
              <Snapshot title="After" data={event.after} />
            </div>
          )}

          {/* Note */}
          {event.note && (
            <div className="flex flex-col gap-1">
              <p className="eyebrow">Note</p>
              <blockquote className="border-l-4 border-hairline pl-3 text-sm italic leading-relaxed text-ink">
                "{event.note}"
              </blockquote>
            </div>
          )}

          <p className="border-t border-hairline pt-3 font-mono text-[10px] text-muted">event {event.id}</p>
        </div>
      </div>
    </div>
  )
}
