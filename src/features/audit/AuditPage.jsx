import { useSearchParams } from 'react-router-dom'
import { AuditOverview } from './AuditOverview.jsx'
import { ActivityLog } from './ActivityLog.jsx'
import { AiDecisionLog } from './AiDecisionLog.jsx'

// School-wide audit + AI-logic console. Three views behind a segmented control;
// the active tab + cross-view deep links live in the URL (?tab, ?student, ?ai)
// so a "view student history" or "view AI reasoning" jump is shareable and the
// browser back button works.

const TABS = [
  { id: 'activity', label: 'Activity' },
  { id: 'ai', label: 'AI Reasoning' },
  { id: 'overview', label: 'Overview' },
]

export function AuditPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'activity'

  const setTab = (id) => {
    const next = new URLSearchParams(params)
    next.set('tab', id)
    setParams(next, { replace: false })
  }

  return (
    <section className="fade-up flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Audit Trail</h1>
          <p className="mt-1 text-sm text-muted">
            Every decision, edit, and AI evaluation — who, which device, when, and what changed.
          </p>
        </div>

        {/* Segmented tabs */}
        <div className="flex gap-0.5 rounded-xl bg-scrim p-0.5 backdrop-blur-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                tab === t.id ? 'bg-elevated text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && <AuditOverview onJump={setTab} />}
      {tab === 'activity' && <ActivityLog params={params} setParams={setParams} />}
      {tab === 'ai' && <AiDecisionLog params={params} setParams={setParams} />}
    </section>
  )
}
