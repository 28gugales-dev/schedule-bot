import { useEffect } from 'react'
import { fmtDateTime, DecisionPill } from './auditShared.jsx'

function SignedBar({ delta }) {
  const pos = delta >= 0
  const width = Math.min(100, Math.abs(delta) * 180) // scale small deltas to a visible bar
  return (
    <span className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-24 items-center justify-center rounded-full bg-scrim-strong">
        <span
          className={`absolute top-0 h-full rounded-full ${pos ? 'left-1/2 bg-success-500' : 'right-1/2 bg-danger-500'}`}
          style={{ width: `${width / 2}%` }}
        />
      </span>
      <span className={`text-xs tabular-nums ${pos ? 'text-success-700 dark:text-success-300' : 'text-danger-700 dark:text-danger-300'}`}>
        {pos ? '+' : ''}{delta.toFixed(2)}
      </span>
    </span>
  )
}

function CheckRow({ check }) {
  const ok = check.passed
  return (
    <li className={`rounded-lg p-3 ring-1 ${ok ? 'bg-scrim ring-hairline' : 'bg-danger-500/10 ring-danger-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-ink">{check.label}</span>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${
            ok ? 'bg-success-50 text-success-700 ring-success-300 dark:text-success-300'
               : 'bg-danger-100 text-danger-700 ring-danger-300 dark:text-danger-300'
          }`}
        >
          {ok ? '✓' : '✗'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
        <div className="flex flex-col">
          <span className="eyebrow">Claimed</span>
          <span className="text-ink">{check.claimed ?? '—'}</span>
        </div>
        <div className="flex flex-col">
          <span className="eyebrow">Actual (SIS)</span>
          <span className={ok ? 'text-success-700 dark:text-success-300' : 'text-danger-700 dark:text-danger-300'}>
            {check.actual ?? '—'}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{check.reasoning}</p>
      {(check.weight != null || check.contribution != null) && (
        <p className="mt-1.5 font-mono text-[10px] text-muted">
          weight {Number(check.weight).toFixed(2)} · contribution {check.contribution >= 0 ? '+' : ''}{Number(check.contribution).toFixed(2)}
        </p>
      )}
    </li>
  )
}

export function AiDecisionDetail({ decision, waiverName, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pct = Math.round((decision.confidence ?? 0) * 100)
  const breakdown = decision.scoreBreakdown
  const snap = decision.inputsSnapshot ?? {}

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog" aria-modal="true" aria-label="AI decision reasoning"
        className="glass-panel animate-toast-in relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-highlight custom-scrollbar"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-glass-strong px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">◆</span>
            <div>
              <p className="text-sm font-semibold text-ink">AI evaluation</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{decision.evaluator}</p>
            </div>
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
          {/* Outcome */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold text-ink">{decision.student?.name}</p>
              <p className="text-sm text-muted">{waiverName} · {decision.student?.id}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <DecisionPill value={decision.decision} />
              <span className="text-xs text-muted">{pct}% confidence · {fmtDateTime(decision.ts)}</span>
            </div>
          </div>

          {/* Rationale */}
          <div className="rounded-lg bg-scrim p-3 ring-1 ring-hairline">
            <p className="eyebrow mb-1">Why this score</p>
            <p className="text-sm leading-relaxed text-ink">{decision.rationale}</p>
          </div>

          {/* Score breakdown */}
          {breakdown && (
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Score breakdown</p>
              <div className="flex flex-col gap-2 rounded-lg bg-scrim p-3 ring-1 ring-hairline">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Base</span>
                  <span className="font-mono tabular-nums text-ink">{Number(breakdown.base).toFixed(2)}</span>
                </div>
                {breakdown.items?.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink">{it.label}</span>
                    <SignedBar delta={it.delta} />
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t border-hairline pt-2 text-sm font-semibold">
                  <span className="text-ink">Confidence</span>
                  <span className="font-mono tabular-nums text-ink">{(decision.confidence ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Per-criterion checks */}
          {decision.checks?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Criteria evaluated ({decision.checks.filter((c) => c.passed).length}/{decision.checks.length} passed)</p>
              <ul className="flex flex-col gap-2">
                {decision.checks.map((c) => <CheckRow key={c.id} check={c} />)}
              </ul>
            </div>
          )}

          {/* Inputs the evaluator saw */}
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Inputs snapshot</p>
            <div className="rounded-lg bg-scrim p-3 ring-1 ring-hairline text-sm">
              {snap.claimedNote && (
                <p className="mb-2 italic text-ink">"{snap.claimedNote}"</p>
              )}
              <dl className="flex flex-col gap-1">
                {snap.gpa != null && <KV k="GPA" v={snap.gpa} />}
                {snap.grade != null && <KV k="Grade" v={snap.grade} />}
                {Array.isArray(snap.courseList) && snap.courseList.length > 0 && (
                  <KV k="Courses" v={snap.courseList.join(', ')} />
                )}
              </dl>
            </div>
          </div>

          <p className="border-t border-hairline pt-3 font-mono text-[10px] text-muted">
            {decision.id} · request {decision.requestId}
          </p>
        </div>
      </div>
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium text-ink text-right">{String(v)}</dd>
    </div>
  )
}
