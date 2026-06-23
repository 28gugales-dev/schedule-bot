import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ActionPill, OverrideFlag, fmtDateTime } from '../audit/auditShared.jsx'

const LIMIT = 50

/** Counselor-scoped activity feed. Controlled `selectedId` ('all' or a counselor
 *  id) so the Counselors tab can deep-link a person into this view. The full
 *  power-filtering log lives at /admin/audit — linked, not duplicated. */
export function TeamActivity({ counselors, events, selectedId = 'all', onSelectedChange }) {
  const staffIds = useMemo(() => new Set(counselors.map((c) => c.id)), [counselors])
  const rows = useMemo(() => {
    const base = events.filter((e) =>
      selectedId === 'all' ? staffIds.has(e.actor?.id) : e.actor?.id === selectedId,
    )
    return base.slice(0, LIMIT)
  }, [events, selectedId, staffIds])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          Show
          <select
            value={selectedId}
            onChange={(e) => onSelectedChange?.(e.target.value)}
            className="glass-input rounded-lg px-2 py-1 text-sm text-ink"
          >
            <option value="all">All team</option>
            {counselors.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <Link
          to="/admin/audit"
          className="text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-300"
        >
          Open full audit log →
        </Link>
      </div>

      <div className="glass-card p-5">
        <ul className="flex flex-col divide-y divide-hairline">
          {rows.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <ActionPill action={e.action} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {e.summary}
                {selectedId === 'all' && e.actor?.name && <span className="text-muted"> · {e.actor.name}</span>}
              </span>
              {e.overrode && <OverrideFlag />}
              <span className="shrink-0 text-xs text-muted">{fmtDateTime(e.ts)}</span>
            </li>
          ))}
          {rows.length === 0 && <li className="py-3 text-sm text-muted">No activity for this filter.</li>}
        </ul>
        {rows.length === LIMIT && (
          <p className="mt-3 text-center text-xs text-muted">
            Showing the {LIMIT} most recent — use the full audit log for the complete history.
          </p>
        )}
      </div>
    </div>
  )
}
