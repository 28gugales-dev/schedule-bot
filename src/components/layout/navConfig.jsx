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

const IconRubric = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="5" x2="13" y2="5" />
    <line x1="3" y1="8" x2="10" y2="8" />
    <line x1="3" y1="11" x2="7" y2="11" />
    <circle cx="12" cy="11" r="1.5" />
  </svg>
)

const IconBatch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 6A5 5 0 1 0 10 12" />
    <polyline points="10 12 13 12 13 9" />
  </svg>
)

const IconAudit = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <polyline points="8 5 8 8 10 9.5" />
  </svg>
)

export const NAV = {
  student: [
    { to: '/student', label: 'New Request', end: true, section: 'Requests', icon: <IconNewRequest /> },
    { to: '/student/requests', label: 'My Requests', section: 'Requests', icon: <IconRequests /> },
  ],
  admin: [
    { to: '/admin', label: 'Review Queue', end: true, section: 'Review', icon: <IconQueue /> },
    { to: '/admin/rubric', label: 'Rubric Builder', section: 'Review', icon: <IconRubric /> },
    { to: '/admin/batch', label: 'Batch Sync', section: 'Sync', icon: <IconBatch /> },
    { to: '/admin/audit', label: 'Audit Trail', section: 'Audit', icon: <IconAudit /> },
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
