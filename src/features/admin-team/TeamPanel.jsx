import { useState, useEffect } from 'react'
import { fetchCounselors } from '../../services/counselors.js'
import { fetchAuditStats, fetchAuditLog } from '../../services/audit.js'
import { KpiRow, DecisionsTrend, RankedBars } from './teamCharts.jsx'
import { CounselorTable } from './CounselorTable.jsx'
import { CapabilityMatrix } from './CapabilityMatrix.jsx'
import { TeamActivity } from './TeamActivity.jsx'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'counselors', label: 'Counselors' },
  { id: 'activity', label: 'Activity' },
  { id: 'permissions', label: 'Permissions' },
]

/**
 * Admin → Team. Loads the staff roster + audit stats + events ONCE and feeds all
 * four tabs (no per-tab refetch). Reuses the audit service as the data spine so
 * it never duplicates /admin/audit's plumbing.
 */
export function TeamPanel() {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null) // { counselors, stats, events }
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [activityFilter, setActivityFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([fetchCounselors(), fetchAuditStats(), fetchAuditLog()])
      .then(([counselors, stats, events]) => {
        if (!cancelled) setData({ counselors, stats, events })
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the team panel.')
      })
    return () => { cancelled = true }
  }, [reloadKey])

  const jumpToCounselor = (id) => {
    setActivityFilter(id)
    setTab('activity')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Team</h1>
        <p className="mt-0.5 text-sm text-muted">Counselors, activity, permissions, and analytics.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Team views">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-brand-600 text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Body */}
      {error ? (
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
      ) : !data ? (
        <div className="glass-card p-8 text-center text-sm text-muted">Loading…</div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab data={data} />}
          {tab === 'counselors' && <CounselorTable counselors={data.counselors} onSelect={jumpToCounselor} />}
          {tab === 'activity' && (
            <TeamActivity
              counselors={data.counselors}
              events={data.events}
              selectedId={activityFilter}
              onSelectedChange={setActivityFilter}
            />
          )}
          {tab === 'permissions' && <CapabilityMatrix counselors={data.counselors} />}
        </>
      )}
    </div>
  )
}

function OverviewTab({ data }) {
  const { counselors, stats, events } = data

  const decisionRows = counselors
    .filter((c) => c.stats.decisions > 0)
    .map((c) => ({ key: c.id, label: c.name, value: c.stats.decisions, display: c.stats.decisions }))

  const overrideRows = [...counselors]
    .filter((c) => c.stats.decisions > 0)
    .sort((a, b) => b.stats.overrideRate - a.stats.overrideRate)
    .map((c) => ({ key: c.id, label: c.name, value: c.stats.overrideRate, display: c.stats.overrideRate }))

  return (
    <div className="flex flex-col gap-5">
      <KpiRow counselors={counselors} stats={stats} />
      <DecisionsTrend events={events} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RankedBars title="Decisions by counselor" rows={decisionRows} tone="brand" />
        <RankedBars title="Override rate by counselor" rows={overrideRows} tone="warning" suffix="%" />
      </div>
    </div>
  )
}
