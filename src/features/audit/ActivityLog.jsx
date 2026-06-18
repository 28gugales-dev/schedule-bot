import { useState, useEffect, useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import {
  fetchAuditLog,
  fetchAuditFacets,
  downloadAudit,
} from '../../services/audit.js'
import { CATEGORY_META } from '../../services/audit.schema.js'
import { useTheme } from '../../features/theme/ThemeProvider.jsx'
import {
  fmtDateNum,
  ActionPill,
  OverrideFlag,
  roleLabel,
  gridThemeLight,
  gridThemeDark,
} from './auditShared.jsx'
import { AuditEventDetail } from './AuditEventDetail.jsx'

ModuleRegistry.registerModules([AllCommunityModule])

const EMPTY_FILTERS = { query: '', category: '', actorId: '', from: '', to: '' }

export function ActivityLog({ params, setParams }) {
  const { resolvedTheme } = useTheme()
  const gridTheme = resolvedTheme === 'dark' ? gridThemeDark : gridThemeLight

  // studentId is URL-controlled so cross-view "view student history" deep links
  // land here pre-filtered; the rest of the filters are local.
  const studentId = params.get('student') || ''
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [facets, setFacets] = useState({ actors: [], students: [] })
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchAuditFacets().then(setFacets).catch(() => {})
  }, [])

  // Refetch whenever any filter changes (the service does the filtering).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const dateTo = filters.to ? `${filters.to}T23:59:59.999Z` : ''
    const dateFrom = filters.from ? `${filters.from}T00:00:00.000Z` : ''
    fetchAuditLog({
      query: filters.query || undefined,
      category: filters.category || undefined,
      actorId: filters.actorId || undefined,
      studentId: studentId || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    })
      .then((r) => { if (!cancelled) setRows(r) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filters, studentId])

  const setStudent = useCallback((id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('student', id)
    else next.delete('student')
    setParams(next)
  }, [params, setParams])

  const clearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setStudent('')
  }, [setStudent])

  const hasFilters = !!(studentId || filters.query || filters.category || filters.actorId || filters.from || filters.to)

  // Jump to the AI reasoning tab focused on one decision.
  const viewAi = useCallback((aiId) => {
    const next = new URLSearchParams(params)
    next.set('tab', 'ai')
    if (aiId) next.set('ai', aiId)
    next.delete('student')
    setParams(next)
  }, [params, setParams])

  const columnDefs = useMemo(() => [
    {
      colId: 'ts', headerName: 'Time', field: 'ts',
      valueFormatter: (p) => fmtDateNum(p.value), sort: 'desc', minWidth: 110, flex: 1,
    },
    {
      colId: 'action', headerName: 'Action',
      valueGetter: (p) => p.data.action,
      cellRenderer: (p) => <ActionPill action={p.value} />, minWidth: 140, flex: 1.2,
    },
    {
      colId: 'actor', headerName: 'Actor',
      valueGetter: (p) => p.data.actor?.name ?? '—',
      cellRenderer: (p) => (
        <span className="leading-tight">
          <span className="text-ink">{p.data.actor?.name ?? '—'}</span>
          <span className="ml-1.5 text-xs text-muted">{roleLabel(p.data.actor?.role)}</span>
        </span>
      ), minWidth: 150, flex: 1.3,
    },
    {
      colId: 'device', headerName: 'Device',
      valueGetter: (p) => p.data.device?.label ?? '—', minWidth: 130, flex: 1,
    },
    {
      colId: 'student', headerName: 'Student',
      valueGetter: (p) => p.data.student?.name ?? '—', minWidth: 120, flex: 1,
    },
    {
      colId: 'summary', headerName: 'Summary',
      valueGetter: (p) => p.data.summary,
      cellRenderer: (p) => (
        <span className="inline-flex items-center gap-2">
          <span className="truncate text-ink">{p.data.summary}</span>
          {p.data.overrode && <OverrideFlag />}
        </span>
      ), minWidth: 240, flex: 2.4,
    },
  ], [])

  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, minWidth: 90 }), [])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="glass-card flex flex-wrap items-center gap-2.5 p-3">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          placeholder="Search summary, student, actor…"
          className="glass-input min-w-[200px] flex-1 px-3 py-1.5 text-sm text-ink placeholder:text-muted"
          aria-label="Search the audit log"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          className="glass-input px-3 py-1.5 text-sm text-ink"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_META).map(([key, m]) => (
            <option key={key} value={key}>{m.label}</option>
          ))}
        </select>
        <select
          value={filters.actorId}
          onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
          className="glass-input px-3 py-1.5 text-sm text-ink"
          aria-label="Filter by actor"
        >
          <option value="">All actors</option>
          {facets.actors.map((a) => (
            <option key={a.id} value={a.id}>{a.name} · {roleLabel(a.role)}</option>
          ))}
        </select>
        <select
          value={studentId}
          onChange={(e) => setStudent(e.target.value)}
          className="glass-input px-3 py-1.5 text-sm text-ink"
          aria-label="Filter by student"
        >
          <option value="">All students</option>
          {facets.students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          type="date" value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          className="glass-input px-2 py-1.5 text-sm text-ink" aria-label="From date"
        />
        <input
          type="date" value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          className="glass-input px-2 py-1.5 text-sm text-ink" aria-label="To date"
        />
        {hasFilters && (
          <button
            type="button" onClick={clearAll}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-muted transition hover:text-ink"
          >
            Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted">{rows.length} event{rows.length !== 1 ? 's' : ''}</span>
          <button
            type="button" onClick={() => downloadAudit(rows, 'csv')} disabled={!rows.length}
            className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover disabled:opacity-50"
          >
            CSV
          </button>
          <button
            type="button" onClick={() => downloadAudit(rows, 'json')} disabled={!rows.length}
            className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover disabled:opacity-50"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="glass-card overflow-hidden p-1.5">
        <div style={{ height: 560, width: '100%' }}>
          <AgGridReact
            theme={gridTheme}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowHeight={48}
            headerHeight={46}
            getRowId={(p) => p.data.id}
            pagination
            paginationPageSize={12}
            paginationPageSizeSelector={[12, 25, 50]}
            onRowClicked={(e) => setSelected(e.data)}
            rowStyle={{ cursor: 'pointer' }}
            overlayNoRowsTemplate={
              loading ? '<span class="text-sm text-muted">Loading…</span>'
                      : '<span class="text-sm text-muted">No matching events.</span>'
            }
          />
        </div>
      </div>

      {selected && (
        <AuditEventDetail
          event={selected}
          onClose={() => setSelected(null)}
          onViewAi={viewAi}
          onViewStudent={(id) => { setSelected(null); setStudent(id) }}
        />
      )}
    </div>
  )
}
