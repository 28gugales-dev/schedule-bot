import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useOutletContext, useNavigate } from 'react-router-dom'
import { useSkin } from '../skin/SkinProvider.jsx'
import { AuditOverview } from './AuditOverview.jsx'
import { ActivityLog } from './ActivityLog.jsx'
import { AiDecisionLog } from './AiDecisionLog.jsx'

// School-wide audit + AI-logic console. The five views (Activity, Counselor
// Decisions, Student Submissions, AI Reasoning, Overview) are now sidebar
// destinations — each is its own route under /admin/audit and renders this page
// with a different `view` prop, so the sidebar NavLink owns the active state and
// there is no in-page tab bar. Cross-view deep links still ride the URL query
// (?student to focus Activity on one student, ?ai to open one AI decision).
//
// In the enterprise skin the active view's name + a global search box hoist into
// the dense topbar (via the EnterpriseShell portal slot) and the body goes
// full-bleed. Glass skin keeps the in-page title; both read `view` from the route.

const VIEW_LABEL = {
  activity: 'Activity',
  decisions: 'Counselor Decisions',
  submissions: 'Student Submissions',
  ai: 'AI Reasoning',
  overview: 'Overview',
}

const SEARCH_PLACEHOLDER = {
  activity: 'Search summary, student, actor…',
  decisions: 'Search student, counselor, decision…',
  submissions: 'Search student, waiver, summary…',
  ai: 'Search student, waiver, rationale…',
}

export function AuditPage({ view = 'activity' }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { skin } = useSkin()
  const isEnterprise = skin === 'enterprise'
  const { topbarSlotEl, setPageChrome, setFullBleed } = useOutletContext() ?? {}

  // Each view searches different fields, so reset the box when the route changes.
  const [search, setSearch] = useState('')
  useEffect(() => { setSearch('') }, [view])

  // Enterprise: hoist title/search into the topbar + full-bleed the body.
  useEffect(() => {
    setPageChrome?.(isEnterprise)
    setFullBleed?.(isEnterprise)
    return () => { setPageChrome?.(false); setFullBleed?.(false) }
  }, [isEnterprise, setPageChrome, setFullBleed])

  // Search + full-height fill apply to the grid views only (Overview has neither).
  const isGrid = view !== 'overview'
  const showSearch = isEnterprise && isGrid

  const topbarChrome = isEnterprise && topbarSlotEl
    ? createPortal(
        <>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight text-ink">{VIEW_LABEL[view]}</p>
            <p className="hidden truncate text-[11px] leading-tight text-muted sm:block">Audit Trail</p>
          </div>
          {showSearch && (
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER[view]}
              className="glass-input ml-2 hidden min-w-0 flex-1 px-3 py-1.5 text-[13px] text-ink placeholder:text-muted sm:block"
              aria-label="Search the audit log"
            />
          )}
        </>,
        topbarSlotEl,
      )
    : null

  const gridProps = {
    params,
    setParams,
    isEnterprise,
    search,
    setSearch,
  }

  return (
    <>
      <section
        className={
          isEnterprise
            ? `audit-console flex flex-col gap-3 ${isGrid ? 'lg:h-[calc(100vh-3.5rem)]' : ''}`
            : 'audit-console fade-up flex flex-col gap-5'
        }
      >
        {/* Glass keeps an in-page title; enterprise hoists it to the topbar. */}
        {!isEnterprise && (
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{VIEW_LABEL[view]}</h1>
            <p className="mt-1 text-sm text-muted">
              Every decision, edit, and AI evaluation — who, which device, when, and what changed.
            </p>
          </div>
        )}

        {view === 'overview' && <AuditOverview onJump={() => navigate('/admin/audit')} />}
        {view === 'activity' && <ActivityLog key="activity" variant="all" {...gridProps} />}
        {view === 'decisions' && <ActivityLog key="decisions" variant="decisions" {...gridProps} />}
        {view === 'submissions' && <ActivityLog key="submissions" variant="submissions" {...gridProps} />}
        {view === 'ai' && <AiDecisionLog key="ai" {...gridProps} />}
      </section>
      {topbarChrome}
    </>
  )
}
