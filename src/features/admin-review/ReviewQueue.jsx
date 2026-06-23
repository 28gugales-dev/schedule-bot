import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import {
  fetchReviewQueue,
  fetchAllWaivers,
  fetchOneRosterRecord,
  submitDecision,
} from '../../services/api.js'
import { ReviewDetail } from './ReviewDetail.jsx'
import { useTheme } from '../../features/theme/ThemeProvider.jsx'
import { useSkin } from '../../features/skin/SkinProvider.jsx'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { actorFromAuth } from '../../services/audit.js'

// Register AG Grid modules once at module scope
ModuleRegistry.registerModules([AllCommunityModule])

// AG Grid builds its theme in JS and derives row/hover/selected colors at
// construction time, so it can't read our CSS `var(--…)` tokens. Instead we keep
// two param objects that MIRROR the light/dark token values in src/index.css and
// switch between them on the resolved theme (see `gridTheme` in the component).
const gridThemeLight = themeQuartz.withParams({
  accentColor: '#0071e3',
  backgroundColor: 'rgba(255,255,255,0.35)',
  headerBackgroundColor: 'rgba(255,255,255,0.55)',
  headerTextColor: '#71717a',
  foregroundColor: '#1d1d1f',
  fontFamily: 'inherit',
  rowHoverColor: 'rgba(0,113,227,0.07)',
  selectedRowBackgroundColor: 'rgba(0,113,227,0.12)',
  oddRowBackgroundColor: 'rgba(255,255,255,0.0)',
  borderColor: 'rgba(15,23,42,0.08)',
  wrapperBorderRadius: '14px',
})

const gridThemeDark = themeQuartz.withParams({
  accentColor: '#0a84ff',
  backgroundColor: 'rgba(28,28,33,0.0)',
  headerBackgroundColor: 'rgba(255,255,255,0.05)',
  headerTextColor: '#9a9aa6',
  foregroundColor: '#f2f2f5',
  fontFamily: 'inherit',
  rowHoverColor: 'rgba(10,132,255,0.14)',
  selectedRowBackgroundColor: 'rgba(10,132,255,0.22)',
  oddRowBackgroundColor: 'rgba(255,255,255,0.0)',
  borderColor: 'rgba(255,255,255,0.1)',
  wrapperBorderRadius: '14px',
})

// Enterprise skin: opaque slate/white grid — no translucency, hairline slate
// borders, tight radius. Mirrors the [data-skin="enterprise"] tokens in
// index.css (ag-grid builds its theme in JS, so it can't read those vars).
const gridThemeEnterpriseLight = themeQuartz.withParams({
  accentColor: '#0071e3',
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#f8fafc',
  headerTextColor: '#64748b',
  foregroundColor: '#0f172a',
  fontFamily: 'inherit',
  rowHoverColor: '#f1f5f9',
  selectedRowBackgroundColor: '#e0edfb',
  oddRowBackgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  wrapperBorderRadius: '0px',
})

const gridThemeEnterpriseDark = themeQuartz.withParams({
  accentColor: '#0a84ff',
  backgroundColor: '#1c1c1c',
  headerBackgroundColor: '#161616',
  headerTextColor: '#9a9aa6',
  foregroundColor: '#f2f2f5',
  fontFamily: 'inherit',
  rowHoverColor: '#262626',
  selectedRowBackgroundColor: '#333333',
  oddRowBackgroundColor: '#1c1c1c',
  borderColor: '#2c2c2c',
  wrapperBorderRadius: '0px',
})

// recommendation.decision → semantic dot colour + capitalized label
const REC_STYLES = {
  admit:  { dot: 'bg-success-500', label: 'Admit'  },
  deny:   { dot: 'bg-danger-500',  label: 'Deny'   },
  review: { dot: 'bg-warning-500', label: 'Review' },
}

function RecommendationPill({ value }) {
  const s = REC_STYLES[value] ?? REC_STYLES.review
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
      <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="glass-card p-10 text-center max-w-sm">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-lg font-semibold text-ink">All caught up</p>
        <p className="mt-1 text-sm text-muted">No pending waiver requests.</p>
      </div>
    </div>
  )
}

export function ReviewQueue() {
  const { resolvedTheme } = useTheme()
  const { skin } = useSkin()
  const isEnterprise = skin === 'enterprise'
  // Enterprise view gets the opaque slate/white grid theme; glass keeps the
  // translucent one. Both light + dark variants are defined at the top of file.
  const gridTheme = isEnterprise
    ? (resolvedTheme === 'dark' ? gridThemeEnterpriseDark : gridThemeEnterpriseLight)
    : (resolvedTheme === 'dark' ? gridThemeDark : gridThemeLight)
  const { user, role } = useAuth()

  // Auto-collapse the app sidebar while a student is open so the detail cockpit
  // claims the full width (AppShell exposes the setter via Outlet context).
  // EnterpriseShell additionally exposes a topbar portal slot + layout setters so
  // this page can hoist its title/search into the dense topbar and go full-bleed.
  const { collapseSidebar, topbarSlotEl, setPageChrome, setFullBleed } = useOutletContext() ?? {}

  const [queue, setQueue]             = useState([])
  const [waiverMap, setWaiverMap]     = useState({})
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Detail view state
  const [selectedId, setSelectedId]       = useState(null)
  const [oneRoster, setOneRoster]         = useState(null)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [submitting, setSubmitting]       = useState(false)

  // Decision-confirmation toast + stale-async guard for openDetail
  const [toast, setToast] = useState(null)
  // Enterprise grid: global quick-filter text (driven by the toolbar search box).
  const [quickFilter, setQuickFilter] = useState('')
  const reqRef = useRef(0)
  // Ids in the order the grid currently DISPLAYS them (sort + quick-filter
  // applied) — captured while the grid is mounted so "auto-advance to next"
  // can follow the order the counselor actually sees, not the raw array order.
  const displayedIdsRef = useRef([])

  // ── Auto-dismiss toast ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ── Collapse sidebar in detail view, restore when leaving the queue ──────────
  useEffect(() => { collapseSidebar?.(!!selectedId) }, [selectedId, collapseSidebar])
  useEffect(() => () => { collapseSidebar?.(false) }, [collapseSidebar])

  // ── Enterprise: hoist title/search into the topbar + full-bleed the grid ─────
  useEffect(() => {
    setPageChrome?.(isEnterprise)
    setFullBleed?.(isEnterprise)
    return () => { setPageChrome?.(false); setFullBleed?.(false) }
  }, [isEnterprise, setPageChrome, setFullBleed])

  // ── Load on mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [q, waivers] = await Promise.all([fetchReviewQueue(), fetchAllWaivers()])
        if (cancelled) return
        const map = {}
        for (const w of waivers) map[w.id] = w.name
        setWaiverMap(map)
        setQueue(q)
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Failed to load queue.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Row click → open detail ──────────────────────────────────────────────────
  const openDetail = useCallback(async (row) => {
    const token = ++reqRef.current
    setSelectedId(row.id)
    setSubmitting(false)
    setOneRoster(null)
    setLoadingRoster(true)
    try {
      const record = await fetchOneRosterRecord(row.student.id)
      if (reqRef.current === token) setOneRoster(record)
    } catch {
      if (reqRef.current === token) setOneRoster(null)
    } finally {
      if (reqRef.current === token) setLoadingRoster(false)
    }
  }, [])

  // ── Submit decision (admit / deny / flag) ───────────────────────────────────
  // AWAIT the write before mutating the UI. On success: drop the row, toast, and
  // advance the cockpit to the next pending request (auto-advance review flow).
  // On failure: keep the row, error toast, do NOT advance — `submitting` flips
  // back so the acting card's buttons re-enable for a retry.
  const handleDecision = useCallback(async (decision, note) => {
    const decidingId = selectedId
    const name = queue.find(r => r.id === decidingId)?.student.name ?? 'Student'
    setSubmitting(true)
    try {
      await submitDecision(decidingId, decision, note, actorFromAuth(user, role))
    } catch {
      setSubmitting(false)
      setToast({ kind: 'danger', text: `Couldn't save ${name}'s decision — try again.` })
      return
    }
    // Pick the NEXT request in the grid's displayed (sorted/filtered) order, so
    // advancing matches what the counselor sees. Fall back to raw array order
    // only if the displayed order wasn't captured.
    const order = displayedIdsRef.current
    const pos = order.indexOf(decidingId)
    let nextId = null
    if (pos !== -1) {
      for (let i = pos + 1; i < order.length; i++) {
        if (order[i] !== decidingId) { nextId = order[i]; break }
      }
    }
    let next = nextId ? queue.find(r => r.id === nextId) ?? null : null
    if (!next && pos === -1) {
      const idx = queue.findIndex(r => r.id === decidingId)
      next = idx >= 0 ? queue[idx + 1] ?? null : null
    }
    setQueue(prev => prev.filter(r => r.id !== decidingId))
    const TOAST = {
      admit: { kind: 'success', text: `Admitted ${name} — queued for batch sync.` },
      deny:  { kind: 'danger',  text: `Denied ${name}.` },
      flag:  { kind: 'warning', text: `Flagged ${name} for escalation.` },
    }
    setToast(TOAST[decision] ?? TOAST.deny)
    // Advance to the next request (reuses openDetail → refetches its OneRoster +
    // resets submitting/loadingRoster) or return to the grid when none remain.
    if (next) {
      openDetail(next)
    } else {
      setSelectedId(null)
      setOneRoster(null)
      setSubmitting(false)
    }
  }, [selectedId, queue, user, role, openDetail])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const remaining = queue.length
  const selectedRequest = selectedId ? queue.find(r => r.id === selectedId) ?? null : null

  // ── Enterprise topbar chrome (portaled into EnterpriseShell's slot) ──────────
  // Title + live subtitle on the left, global search to the right of it. Search
  // is capped (max-w-xs) and hidden < sm so it never crowds the session controls.
  const subtitleText = loading
    ? 'Loading…'
    : error
      ? error
      : remaining > 0
        ? `${remaining} request${remaining !== 1 ? 's' : ''} remaining`
        : 'Queue is empty'
  const showSearch = isEnterprise && !selectedRequest && !loading && !error && remaining > 0
  const topbarChrome = isEnterprise && topbarSlotEl
    ? createPortal(
        <>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight text-ink">Waiver Review Queue</p>
            <p className={`hidden truncate text-[11px] leading-tight sm:block ${error ? 'text-danger-600 dark:text-danger-400' : 'text-muted'}`}>
              {subtitleText}
            </p>
          </div>
          {showSearch && (
            <input
              type="search"
              value={quickFilter}
              onChange={e => setQuickFilter(e.target.value)}
              placeholder="Search students, waivers, recommendations…"
              className="glass-input ml-2 hidden min-w-0 flex-1 px-3 py-1.5 text-[13px] text-ink placeholder:text-muted sm:block"
              aria-label="Search the review queue"
            />
          )}
        </>,
        topbarSlotEl,
      )
    : null

  // Grid sizing: hug content height (no dead space below the rows) while keeping
  // AG-Grid's OWN horizontal scroll on narrow viewports. domLayout="autoHeight"
  // was removed because it suppresses that h-scroll and clips the right columns.
  const ROW_H = 44
  const HEADER_H = 46
  // Glass hugs its content (no dead space below the rows). The enterprise console
  // instead fills the viewport via a flex chain (section h-[calc] → wrapper
  // flex-1 → grid h-100%) so its pagination bar sits flush at the bottom.
  const gridHeight = HEADER_H + queue.length * ROW_H + 18

  // ── Column defs ──────────────────────────────────────────────────────────────
  const columnDefs = useMemo(() => [
    {
      colId: 'student',
      headerName: 'Student',
      valueGetter: p => p.data.student.name,
      flex: 2,
      minWidth: 118,
    },
    {
      colId: 'id',
      headerName: 'ID',
      valueGetter: p => p.data.student.id,
      minWidth: 76,
    },
    {
      colId: 'grade',
      headerName: 'Grade',
      valueGetter: p => p.data.student.grade,
      minWidth: 60,
    },
    {
      colId: 'gpa',
      headerName: 'GPA',
      valueGetter: p => p.data.student.gpa,
      valueFormatter: p => p.value.toFixed(2),
      minWidth: 58,
    },
    {
      colId: 'waiver',
      headerName: 'Waiver',
      valueGetter: p => waiverMap[p.data.waiverTypeId] ?? p.data.waiverTypeId,
      flex: 2,
      minWidth: 118,
    },
    {
      colId: 'rec',
      headerName: 'Recommended',
      valueGetter: p => p.data.recommendation.decision,
      cellRenderer: p => <RecommendationPill value={p.value} />,
      minWidth: 104,
    },
    {
      colId: 'confidence',
      headerName: 'Confidence',
      valueGetter: p => p.data.recommendation.confidence,
      valueFormatter: p => Math.round(p.value * 100) + '%',
      minWidth: 84,
    },
    {
      colId: 'submitted',
      headerName: 'Submitted',
      field: 'submittedAt',
      valueFormatter: p =>
        new Date(p.value).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
      sort: 'desc',
      flex: 2,
      minWidth: 124,
    },
  ], [waiverMap])

  // Responsive columns: the 8-column set needs ~742px. Below that the grid would
  // clip its right edge (the "Submitted" column). Rather than clip, drop the
  // three low-priority columns (ID / Grade / Confidence) when the grid's own
  // panel gets narrow, then refit. Driven off the grid's clientWidth — NOT the
  // viewport — so it self-corrects when the sidebar collapses or hides at lg.
  const SECONDARY_COLS = ['id', 'grade', 'confidence']
  const fitColumns = useCallback((p) => {
    // Enterprise console is a full grid — show every column (it can scroll
    // horizontally). Glass drops the three low-priority columns when narrow
    // rather than clipping the right edge.
    p.api.setColumnsVisible(SECONDARY_COLS, isEnterprise || p.clientWidth >= 720)
    p.api.sizeColumnsToFit()
  }, [isEnterprise])

  // Snapshot the displayed row order after any sort / filter / data change so
  // handleDecision can advance to the next VISIBLE request (see displayedIdsRef).
  const captureOrder = useCallback((p) => {
    const ids = []
    p.api.forEachNodeAfterFilterAndSort((n) => { if (n.data) ids.push(n.data.id) })
    displayedIdsRef.current = ids
  }, [])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    flex: 1,
    minWidth: 58,
    // Enterprise keeps menu filters (the header funnel) but drops the per-column
    // floating-filter input row — global topbar search covers quick filtering.
    ...(isEnterprise ? { filter: true, floatingFilter: false } : {}),
  }), [isEnterprise])

  // Toast element, shared across both render branches
  const TOAST_DOT = { success: 'bg-success-500', danger: 'bg-danger-500', warning: 'bg-warning-500' }
  const toastEl = toast && (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 glass-card px-4 py-3 shadow-lg animate-toast-in">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TOAST_DOT[toast.kind] ?? TOAST_DOT.danger}`} aria-hidden="true" />
      <span className="text-sm font-medium text-ink">{toast.text}</span>
    </div>
  )

  // ── Render: detail view ──────────────────────────────────────────────────────
  if (selectedRequest) {
    return (
      <>
        <ReviewDetail
          key={selectedRequest.id}
          request={selectedRequest}
          waiverName={waiverMap[selectedRequest.waiverTypeId] ?? selectedRequest.waiverTypeId}
          oneRoster={oneRoster}
          loadingRoster={loadingRoster}
          submitting={submitting}
          onBack={() => { setSelectedId(null); setOneRoster(null) }}
          onDecision={handleDecision}
        />
        {topbarChrome}
        {toastEl}
      </>
    )
  }

  // ── Render: queue list ───────────────────────────────────────────────────────
  return (
    <>
    <section className={isEnterprise ? 'flex flex-col lg:h-[calc(100vh-3.5rem)]' : 'fade-up flex flex-col gap-5'}>
      {/* Page header — enterprise hoists this into the topbar (see topbarChrome) */}
      {!isEnterprise && (
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Waiver Review Queue</h1>
          {loading ? (
            <p className="mt-1 text-sm text-muted">Loading…</p>
          ) : error ? (
            <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {remaining > 0
                ? `${remaining} request${remaining !== 1 ? 's' : ''} remaining`
                : 'Queue is empty'}
            </p>
          )}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="glass-card p-8 text-center text-sm text-muted">
          Loading queue…
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center text-sm text-danger-700 dark:text-danger-300">
          {error}
        </div>
      ) : remaining === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className={isEnterprise ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'glass-card overflow-hidden p-1.5'}>
            <div className={isEnterprise ? 'min-h-0 flex-1' : ''} style={{ height: isEnterprise ? '100%' : gridHeight, width: '100%' }}>
              <AgGridReact
                theme={gridTheme}
                rowData={queue}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onFirstDataRendered={fitColumns}
                onGridSizeChanged={fitColumns}
                onModelUpdated={captureOrder}
                rowHeight={ROW_H}
                headerHeight={HEADER_H}
                getRowId={p => p.data.id}
                onRowClicked={e => openDetail(e.data)}
                onCellKeyDown={e => {
                  if (e.event?.key === 'Enter' || e.event?.key === ' ') {
                    e.event.preventDefault()
                    openDetail(e.data)
                  }
                }}
                rowStyle={{ cursor: 'pointer' }}
                quickFilterText={isEnterprise ? quickFilter : undefined}
                pagination={isEnterprise}
                paginationPageSize={20}
                paginationPageSizeSelector={isEnterprise ? [20, 50, 100] : false}
                animateRows
              />
            </div>
          </div>
        </>
      )}
    </section>
    {topbarChrome}
    {toastEl}
    </>
  )
}
