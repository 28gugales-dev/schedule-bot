import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import {
  fetchReviewQueue,
  fetchAllWaivers,
  fetchOneRosterRecord,
  submitDecision,
} from '../../services/api.js'
import { ReviewDetail } from './ReviewDetail.jsx'

// Register AG Grid modules once at module scope
ModuleRegistry.registerModules([AllCommunityModule])

// AG Grid runs in JS and can't read CSS vars, so these hex literals mirror the
// semantic design tokens in src/index.css (brand-600 #0071e3, zinc header/border).
const gridTheme = themeQuartz.withParams({
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
  const reqRef = useRef(0)

  // ── Auto-dismiss toast ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

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

  // ── Submit decision ──────────────────────────────────────────────────────────
  const handleDecision = useCallback(async (decision, note) => {
    setSubmitting(true)
    const name = queue.find(r => r.id === selectedId)?.student.name ?? 'Student'
    try {
      await submitDecision(selectedId, decision, note)
    } catch {
      // Non-fatal: optimistic removal stands; batch sync will reconcile.
    }
    setQueue(prev => prev.filter(r => r.id !== selectedId))
    setSelectedId(null)
    setOneRoster(null)
    setSubmitting(false)
    setToast({
      kind: decision === 'admit' ? 'success' : 'danger',
      text: decision === 'admit'
        ? `Admitted ${name} — queued for batch sync.`
        : `Denied ${name}.`,
    })
  }, [selectedId, queue])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const remaining = queue.length
  const selectedRequest = selectedId ? queue.find(r => r.id === selectedId) ?? null : null

  // Grid sizing: hug content height (no dead space below the rows) while keeping
  // AG-Grid's OWN horizontal scroll on narrow viewports. domLayout="autoHeight"
  // was removed because it suppresses that h-scroll and clips the right columns.
  const ROW_H = 44
  const HEADER_H = 46
  const gridHeight = HEADER_H + queue.length * ROW_H + 18

  // ── Column defs ──────────────────────────────────────────────────────────────
  const columnDefs = useMemo(() => [
    {
      headerName: 'Student',
      valueGetter: p => p.data.student.name,
      flex: 2,
      minWidth: 140,
    },
    {
      headerName: 'ID',
      valueGetter: p => p.data.student.id,
      minWidth: 90,
    },
    {
      headerName: 'Grade',
      valueGetter: p => p.data.student.grade,
      minWidth: 80,
    },
    {
      headerName: 'GPA',
      valueGetter: p => p.data.student.gpa,
      valueFormatter: p => p.value.toFixed(2),
      minWidth: 80,
    },
    {
      headerName: 'Waiver',
      valueGetter: p => waiverMap[p.data.waiverTypeId] ?? p.data.waiverTypeId,
      flex: 2,
      minWidth: 140,
    },
    {
      headerName: 'Recommended',
      valueGetter: p => p.data.recommendation.decision,
      cellRenderer: p => <RecommendationPill value={p.value} />,
      minWidth: 130,
    },
    {
      headerName: 'Confidence',
      valueGetter: p => p.data.recommendation.confidence,
      valueFormatter: p => Math.round(p.value * 100) + '%',
      minWidth: 110,
    },
    {
      headerName: 'Submitted',
      field: 'submittedAt',
      valueFormatter: p =>
        new Date(p.value).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
      sort: 'desc',
      flex: 2,
      minWidth: 160,
    },
  ], [waiverMap])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    flex: 1,
    minWidth: 90,
  }), [])

  // Toast element, shared across both render branches
  const toastEl = toast && (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 glass-card px-4 py-3 shadow-lg animate-toast-in">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${toast.kind === 'success' ? 'bg-success-500' : 'bg-danger-500'}`} aria-hidden="true" />
      <span className="text-sm font-medium text-ink">{toast.text}</span>
    </div>
  )

  // ── Render: detail view ──────────────────────────────────────────────────────
  if (selectedRequest) {
    return (
      <>
        <ReviewDetail
          request={selectedRequest}
          waiverName={waiverMap[selectedRequest.waiverTypeId] ?? selectedRequest.waiverTypeId}
          oneRoster={oneRoster}
          loadingRoster={loadingRoster}
          submitting={submitting}
          onBack={() => { setSelectedId(null); setOneRoster(null) }}
          onDecision={handleDecision}
        />
        {toastEl}
      </>
    )
  }

  // ── Render: queue list ───────────────────────────────────────────────────────
  return (
    <>
    <section className="fade-up flex flex-col gap-5">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Waiver Review Queue</h1>
        {loading ? (
          <p className="mt-1 text-sm text-muted">Loading…</p>
        ) : error ? (
          <p className="mt-1 text-sm text-danger-600">{error}</p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            {remaining > 0
              ? `${remaining} request${remaining !== 1 ? 's' : ''} remaining`
              : 'Queue is empty'}
          </p>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="glass-card p-8 text-center text-sm text-muted">
          Loading queue…
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center text-sm text-danger-700">
          {error}
        </div>
      ) : remaining === 0 ? (
        <EmptyState />
      ) : (
        <div className="glass-card overflow-hidden p-1.5">
          <div style={{ height: gridHeight, width: '100%' }}>
            <AgGridReact
              theme={gridTheme}
              rowData={queue}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
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
            />
          </div>
        </div>
      )}
    </section>
    {toastEl}
    </>
  )
}
