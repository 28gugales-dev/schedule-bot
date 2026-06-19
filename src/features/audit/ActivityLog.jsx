import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import {
  fetchAuditLog,
  fetchAuditFacets,
  downloadAudit,
} from '../../services/audit.js'
import { CATEGORY_META } from '../../services/audit.schema.js'
import { WAIVER_TYPES } from '../../services/mockData.js'
import { useTheme } from '../../features/theme/ThemeProvider.jsx'
import {
  fmtDateNum,
  ActionPill,
  OverrideFlag,
  roleLabel,
  gridThemeLight,
  gridThemeDark,
  gridThemeEnterpriseLight,
  gridThemeEnterpriseDark,
} from './auditShared.jsx'
import { AuditEventDetail } from './AuditEventDetail.jsx'

ModuleRegistry.registerModules([AllCommunityModule])

const EMPTY_FILTERS = { query: '', category: '', actorId: '', from: '', to: '' }

// The "Counselor Decisions" and "Student Submissions" tabs are this same grid
// locked to one audit category and given a column set tuned to that slice, so
// all three audit ledgers share one fetch/filter/export path.
const VARIANT_CATEGORY = { decisions: 'decision', submissions: 'submission' }
const VARIANT_NOUN = { decisions: 'decision', submissions: 'submission' }
const WAIVER_NAME = Object.fromEntries(WAIVER_TYPES.map((w) => [w.id, w.name]))

export function ActivityLog({ params, setParams, isEnterprise = false, search = '', setSearch, variant = 'all' }) {
  const lockedCategory = VARIANT_CATEGORY[variant] || ''
  const noun = VARIANT_NOUN[variant] || 'event'
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const gridTheme = isEnterprise
    ? (resolvedTheme === 'dark' ? gridThemeEnterpriseDark : gridThemeEnterpriseLight)
    : (resolvedTheme === 'dark' ? gridThemeDark : gridThemeLight)

  // studentId is URL-controlled so cross-view "view student history" deep links
  // land here pre-filtered; the rest of the filters are local.
  const studentId = params.get('student') || ''
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  // Enterprise drives the query from the topbar search box (lifted to AuditPage);
  // glass uses the in-bar search field. Everything else is identical.
  const effectiveQuery = isEnterprise ? search : filters.query
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
      query: effectiveQuery || undefined,
      category: (lockedCategory || filters.category) || undefined,
      actorId: filters.actorId || undefined,
      studentId: studentId || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    })
      .then((r) => { if (!cancelled) setRows(r) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filters, studentId, effectiveQuery, lockedCategory])

  const setStudent = useCallback((id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('student', id)
    else next.delete('student')
    setParams(next)
  }, [params, setParams])

  const clearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setStudent('')
    setSearch?.('')
  }, [setStudent, setSearch])

  const hasFilters = !!(studentId || effectiveQuery || filters.category || filters.actorId || filters.from || filters.to)

  // Jump to the AI Reasoning view (its own route now) focused on one decision.
  const viewAi = useCallback((aiId) => {
    navigate(aiId ? `/admin/audit/ai?ai=${encodeURIComponent(aiId)}` : '/admin/audit/ai')
  }, [navigate])

  const columnDefs = useMemo(() => {
    const tsCol = (headerName) => ({
      colId: 'ts', headerName, field: 'ts',
      valueFormatter: (p) => fmtDateNum(p.value), sort: 'desc', width: 120, minWidth: 110,
    })
    const studentCol = {
      colId: 'student', headerName: 'Student',
      valueGetter: (p) => p.data.student?.name ?? '—', width: 150, minWidth: 120,
    }
    const summaryCol = {
      colId: 'summary', headerName: 'Summary',
      valueGetter: (p) => p.data.summary,
      cellRenderer: (p) => (
        <span className="inline-flex items-center gap-2">
          <span className="truncate text-ink">{p.data.summary}</span>
          {p.data.overrode && <OverrideFlag />}
        </span>
      ), flex: 1, minWidth: 280,
    }

    // Per-row affordances: open the submission's detail drawer, and (when the
    // request was evaluated) jump straight to its AI reasoning. stopPropagation
    // keeps the row's own onClick from double-firing.
    const actionsCol = {
      colId: 'actions', headerName: 'Actions',
      sortable: false, filter: false, suppressMovable: true,
      cellRenderer: (p) => (
        <span className="inline-flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelected(p.data) }}
            className="text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-300"
          >
            View
          </button>
          {p.data.aiDecisionId && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); viewAi(p.data.aiDecisionId) }}
              className="text-sm font-medium text-muted transition hover:text-ink"
            >
              AI →
            </button>
          )}
        </span>
      ), width: 140, minWidth: 120,
    }

    // Counselor Decisions — the decision IS the headline; actor is always staff.
    if (variant === 'decisions') {
      return [
        tsCol('Time'),
        {
          colId: 'action', headerName: 'Decision',
          valueGetter: (p) => p.data.action,
          cellRenderer: (p) => <ActionPill action={p.value} />, width: 150, minWidth: 130,
        },
        {
          colId: 'actor', headerName: 'Counselor',
          valueGetter: (p) => p.data.actor?.name ?? '—',
          cellRenderer: (p) => (
            <span className="leading-tight">
              <span className="text-ink">{p.data.actor?.name ?? '—'}</span>
              <span className="ml-1.5 text-xs text-muted">{roleLabel(p.data.actor?.role)}</span>
            </span>
          ), width: 180, minWidth: 150,
        },
        studentCol,
        summaryCol,
      ]
    }

    // Student Submissions — actor === student, so collapse to one Student column
    // and surface the waiver type the request is for.
    if (variant === 'submissions') {
      return [
        tsCol('Submitted'),
        {
          colId: 'student', headerName: 'Student',
          valueGetter: (p) => p.data.student?.name ?? p.data.actor?.name ?? '—', width: 160, minWidth: 140,
        },
        {
          colId: 'waiver', headerName: 'Waiver',
          valueGetter: (p) => WAIVER_NAME[p.data.waiverTypeId] ?? p.data.waiverTypeId ?? '—',
          width: 200, minWidth: 170,
        },
        {
          colId: 'device', headerName: 'Device',
          valueGetter: (p) => p.data.device?.label ?? '—', width: 150, minWidth: 130,
        },
        summaryCol,
        actionsCol,
      ]
    }

    // 'all' — the full Activity ledger.
    return [
      tsCol('Time'),
      {
        colId: 'action', headerName: 'Action',
        valueGetter: (p) => p.data.action,
        cellRenderer: (p) => <ActionPill action={p.value} />, width: 150, minWidth: 140,
      },
      {
        colId: 'actor', headerName: 'Actor',
        valueGetter: (p) => p.data.actor?.name ?? '—',
        cellRenderer: (p) => (
          <span className="leading-tight">
            <span className="text-ink">{p.data.actor?.name ?? '—'}</span>
            <span className="ml-1.5 text-xs text-muted">{roleLabel(p.data.actor?.role)}</span>
          </span>
        ), width: 180, minWidth: 150,
      },
      {
        colId: 'device', headerName: 'Device',
        valueGetter: (p) => p.data.device?.label ?? '—', width: 150, minWidth: 130,
      },
      { ...studentCol, width: 140, minWidth: 120 },
      summaryCol,
    ]
  }, [variant, viewAi])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    minWidth: 90,
    // Enterprise console keeps the header menu filters; floating filter row is
    // dropped (the topbar search covers quick filtering).
    ...(isEnterprise ? { filter: true, floatingFilter: false } : {}),
  }), [isEnterprise])

  return (
    <div className={isEnterprise ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface' : 'flex flex-col gap-4'}>
      {/* Filter bar — glass wraps it in a frosted card; enterprise renders it as
          the console panel's header row (border-b flows into the grid below, so
          the filters-left / actions-right split reads as deliberate structure
          rather than a floating toolbar with a dead gap in the middle). */}
      <div className={isEnterprise ? 'flex flex-wrap items-center gap-2.5 border-b border-border px-3 py-2.5' : 'glass-card flex flex-wrap items-center gap-2.5 p-3'}>
        {!isEnterprise && (
          <input
            type="search"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search summary, student, actor…"
            className="glass-input min-w-[200px] flex-1 px-3 py-1.5 text-sm text-ink placeholder:text-muted"
            aria-label="Search the audit log"
          />
        )}
        {/* Category is the tab itself on the Decisions / Submissions views, so the
            picker only appears on the full Activity ledger. */}
        {!lockedCategory && (
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
        )}
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
          <span className="text-xs text-muted">{rows.length} {noun}{rows.length !== 1 ? 's' : ''}</span>
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

      {/* Grid — enterprise: the panel body, flex-filling the framed height so
          sparse data leaves room inside the frame, not bare canvas below it.
          Glass keeps its fixed-height frosted card. */}
      <div className={isEnterprise ? 'min-h-0 flex-1' : 'glass-card overflow-hidden p-1.5'}>
        <div style={{ height: isEnterprise ? '100%' : 560, width: '100%' }}>
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
                      : `<span class="text-sm text-muted">No matching ${noun}s.</span>`
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
