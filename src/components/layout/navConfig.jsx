/* Shared navigation model for both shells (GlassShell + EnterpriseShell).
 * One source of truth for destinations, labels, icons, and the per-portal
 * title. `section` groups items into labelled blocks — the enterprise sidebar
 * renders the section eyebrows; the glass sidebar ignores them. */

import { useState, useEffect, useMemo } from 'react'

const IconNewRequest = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <line x1="8" y1="5" x2="8" y2="11" />
    <line x1="5" y1="8" x2="11" y2="8" />
  </svg>
)

const IconRequests = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="4" x2="13" y2="4" />
    <line x1="3" y1="8" x2="13" y2="8" />
    <line x1="3" y1="12" x2="9" y2="12" />
  </svg>
)

const IconQueue = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <line x1="5" y1="6" x2="11" y2="6" />
    <line x1="5" y1="9" x2="9" y2="9" />
  </svg>
)

const IconForm = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="2" width="11" height="12" rx="2" />
    <line x1="5" y1="5.5" x2="11" y2="5.5" />
    <line x1="5" y1="8" x2="11" y2="8" />
    <line x1="5" y1="10.5" x2="8.5" y2="10.5" />
  </svg>
)

const IconBatch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 6A5 5 0 1 0 10 12" />
    <polyline points="10 12 13 12 13 9" />
  </svg>
)

const IconRejected = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <line x1="6" y1="6" x2="10" y2="10" />
    <line x1="10" y1="6" x2="6" y2="10" />
  </svg>
)

const IconAudit = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <polyline points="8 5 8 8 10 9.5" />
  </svg>
)

const IconTeam = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2.5" />
    <path d="M1.5 13a4.5 4.5 0 0 1 9 0" />
    <path d="M11 4.2a2 2 0 0 1 0 3.6" />
    <path d="M12 13a4.5 4.5 0 0 0-2.2-3.3" />
  </svg>
)

// ── Audit sub-views (each a sidebar destination of its own) ──────────────────
const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 8 5 8 7 3 9 13 11 8 14 8" />
  </svg>
)
const IconDecision = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h12" />
    <path d="M5 4l-2.5 4a2 2 0 0 0 5 0L5 4Z" />
    <path d="M11 4l-2.5 4a2 2 0 0 0 5 0L11 4Z" />
    <line x1="8" y1="2.5" x2="8" y2="13" />
    <path d="M5.5 13.5h5" />
  </svg>
)
const IconSubmission = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9.5V12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9.5" />
    <polyline points="5 6 8 3 11 6" />
    <line x1="8" y1="3" x2="8" y2="10" />
  </svg>
)
const IconAi = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.3 3.4L12.7 6.7 9.3 8 8 11.4 6.7 8 3.3 6.7 6.7 5.4 8 2Z" />
    <path d="M12.5 11.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" />
  </svg>
)
const IconResources = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 4a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4Z" />
    <line x1="5" y1="9" x2="11" y2="9" />
  </svg>
)
const IconOverview = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
)

export const NAV = {
  student: [
    { to: '/student', label: 'New Request', end: true, section: 'Requests', icon: <IconNewRequest /> },
    { to: '/student/requests', label: 'My Requests', section: 'Requests', icon: <IconRequests /> },
  ],
  admin: [
    { to: '/admin', label: 'Review Queue', end: true, section: 'Review', icon: <IconQueue /> },
    { to: '/admin/forms', label: 'Form Builder', section: 'Review', icon: <IconForm /> },
    { to: '/admin/resources', label: 'Resources', section: 'Review', icon: <IconResources /> },
    { to: '/admin/rejected', label: 'Rejected', section: 'Review', icon: <IconRejected /> },
    { to: '/admin/team', label: 'Team', end: true, section: 'Team', icon: <IconTeam /> },
    { to: '/admin/batch', label: 'Batch Sync', section: 'Sync', icon: <IconBatch /> },
    { to: '/admin/audit', label: 'Activity', end: true, section: 'Audit', icon: <IconActivity /> },
    { to: '/admin/audit/decisions', label: 'Counselor Decisions', section: 'Audit', icon: <IconDecision /> },
    { to: '/admin/audit/submissions', label: 'Student Submissions', section: 'Audit', icon: <IconSubmission /> },
    { to: '/admin/audit/ai', label: 'AI Reasoning', section: 'Audit', icon: <IconAi /> },
    { to: '/admin/audit/overview', label: 'Overview', section: 'Audit', icon: <IconOverview /> },
  ],
}

export const TITLE = {
  student: 'Student Portal',
  admin: 'Command Center',
}

/* Shared collapse-state key — both sidebars honour the same preference so the
 * choice survives a skin switch. */
export const COLLAPSE_KEY = 'ccc:sidebar-collapsed'

/**
 * Sidebar collapse state shared by both shells.
 *
 * Two layers:
 *   • `collapsed` — the user's saved preference (persisted to localStorage).
 *   • `forcedCollapsed` — a transient, NON-persisted collapse a nested route can
 *     request via the returned `outletContext.collapseSidebar(bool)` (the review
 *     detail cockpit uses it to claim full width). Kept separate so auto-collapse
 *     never overwrites the saved preference.
 *
 * Returns the EFFECTIVE collapsed value as `collapsed` so shells need no other
 * change, a `toggle` that always flips what's on screen and hands control back
 * to the user (clearing any forced collapse so the button is never a no-op), and
 * the `outletContext` to spread onto <Outlet/>.
 */
export function useCollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1') } catch { /* ignore */ }
  }, [])

  const [forcedCollapsed, setForcedCollapsed] = useState(false)
  const effectiveCollapsed = collapsed || forcedCollapsed

  const toggle = () => {
    const next = !effectiveCollapsed
    setForcedCollapsed(false)
    setCollapsed(next)
    try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
  }

  const outletContext = useMemo(() => ({ collapseSidebar: setForcedCollapsed }), [])

  return { collapsed: effectiveCollapsed, toggle, outletContext }
}
