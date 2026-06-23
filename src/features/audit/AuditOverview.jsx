import { useState, useEffect } from 'react'
import { fetchAuditStats, fetchAuditLog } from '../../services/audit.js'
import { fmtDateTime, ActionPill, OverrideFlag } from './auditShared.jsx'

function Tile({ label, value, sub, tone = 'ink' }) {
  const valueColor = {
    ink: 'text-ink',
    success: 'text-success-700 dark:text-success-300',
    warning: 'text-warning-700 dark:text-warning-300',
    danger: 'text-danger-700 dark:text-danger-300',
    brand: 'text-brand-700 dark:text-ink',
  }[tone]
  return (
    <div className="glass-card flex flex-col gap-1 p-4">
      <p className="eyebrow">{label}</p>
      <p className={`font-display text-3xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

export function AuditOverview({ onJump }) {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState(null)
  // Bumped by Retry to re-run the effect (keeps the cancellation guard intact).
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([fetchAuditStats(), fetchAuditLog()])
      .then(([s, log]) => {
        if (cancelled) return
        setStats(s)
        setRecent(log.slice(0, 6))
      })
      .catch(() => { if (!cancelled) setError('Could not load the audit overview.') })
    return () => { cancelled = true }
  }, [reloadKey])

  // Error must be checked before the loading sentinel — a caught failure leaves
  // stats null, which would otherwise read as a perpetual "Loading…".
  if (error) {
    return (
      <div role="alert" className="glass-card flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) {
    return <div className="glass-card p-8 text-center text-sm text-muted">Loading…</div>
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Tile label="Decisions today" value={stats.decisionsToday} sub={`${stats.decisionsTotal} all-time`} />
        <Tile
          label="AI agreement"
          value={stats.agreement != null ? `${stats.agreement}%` : '—'}
          sub={`${stats.overrides} override${stats.overrides !== 1 ? 's' : ''}`}
          tone={stats.agreement != null && stats.agreement >= 80 ? 'success' : 'warning'}
        />
        <Tile label="Override rate" value={`${stats.overrideRate}%`} sub="counselor ≠ AI" tone={stats.overrideRate > 25 ? 'warning' : 'ink'} />
        <Tile label="Pending sync" value={stats.pendingSync} sub="awaiting IC push" tone={stats.pendingSync > 0 ? 'warning' : 'success'} />
        <Tile label="AI evaluations" value={stats.aiCount} sub="logged with reasoning" tone="brand" />
        <Tile label="Config changes" value={stats.configChanges} sub="rubric + waiver edits" />
        <Tile label="Total events" value={stats.total} sub="school-wide" />
        <Tile label="Last activity" value={stats.lastActivity ? fmtDateTime(stats.lastActivity).split(',')[0] : '—'} sub={stats.lastActivity ? fmtDateTime(stats.lastActivity).split(', ').slice(1).join(', ') : ''} />
      </div>

      {/* Recent activity */}
      <div className="glass-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Recent activity</p>
          <button
            type="button" onClick={() => onJump?.('activity')}
            className="text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-300"
          >
            View all →
          </button>
        </div>
        <ul className="flex flex-col divide-y divide-hairline">
          {recent.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <ActionPill action={e.action} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{e.summary}</span>
              {e.overrode && <OverrideFlag />}
              <span className="shrink-0 text-xs text-muted">{fmtDateTime(e.ts)}</span>
            </li>
          ))}
          {recent.length === 0 && <li className="py-3 text-sm text-muted">No activity yet.</li>}
        </ul>
      </div>
    </div>
  )
}
