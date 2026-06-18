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
// semantic design tokens in src/index.css (brand-600 #2456e6, slate header/border).
const gridTheme = themeQuartz.withParams({
  accentColor: '#2456e6',
  headerBackgroundColor: '#f8fafc',
  headerTextColor: '#475569',
  fontFamily: 'inherit',
  rowHoverColor: '#eff4ff',
  selectedRowBackgroundColor: '#eef4ff',
  borderColor: '#e2e8f0',
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
      <div className="rounded-xl bg-surface p-10 shadow-sm ring-1 ring-border text-center max-w-sm">
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
    setSelectedId(row.id)
    setSubmitting(false)
    setOneRoster(null)
    setLoadingRoster(true)
    try {
      const record = await fetchOneRosterRecord(row.student.id)
      setOneRoster(record)
    } catch {
      setOneRoster(null)
    } finally {
      setLoadingRoster(false)
    }
  }, [])

  // ── Submit decision ──────────────────────────────────────────────────────────
  const handleDecision = useCallback(async (decision, note) => {
    setSubmitting(true)
    try {
      await submitDecision(selectedId, decision, note)
    } catch {
      // Non-fatal: log silently
    }
    setQueue(prev => prev.filter(r => r.id !== selectedId))
    setSelectedId(null)
    setOneRoster(null)
    setSubmitting(false)
  }, [selectedId])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const remaining = queue.length
  const selectedRequest = selectedId ? queue.find(r => r.id === selectedId) ?? null : null

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
      headerName: 'Recommendation',
      valueGetter: p => p.data.recommendation.decision,
      cellRenderer: p => <RecommendationPill value={p.value} />,
      minWidth: 140,
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

  // ── Render: detail view ──────────────────────────────────────────────────────
  if (selectedRequest) {
    return (
      <ReviewDetail
        request={selectedRequest}
        waiverName={waiverMap[selectedRequest.waiverTypeId] ?? selectedRequest.waiverTypeId}
        oneRoster={oneRoster}
        loadingRoster={loadingRoster}
        submitting={submitting}
        onBack={() => { setSelectedId(null); setOneRoster(null) }}
        onDecision={handleDecision}
      />
    )
  }

  // ── Render: queue list ───────────────────────────────────────────────────────
  return (
    <section className="flex flex-col gap-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-ink">Waiver Review Queue</h1>
        {loading ? (
          <p className="mt-1 text-sm text-muted">Loading…</p>
        ) : error ? (
          <p className="mt-1 text-sm text-rose-600">{error}</p>
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
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center text-sm text-muted">
          Loading queue…
        </div>
      ) : error ? (
        <div className="rounded-xl bg-rose-50 p-8 ring-1 ring-rose-200 text-center text-sm text-rose-700">
          {error}
        </div>
      ) : remaining === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ height: 'calc(100vh - 220px)', width: '100%' }}>
          <AgGridReact
            theme={gridTheme}
            rowData={queue}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={p => p.data.id}
            onRowClicked={e => openDetail(e.data)}
            rowStyle={{ cursor: 'pointer' }}
          />
        </div>
      )}
    </section>
  )
}
