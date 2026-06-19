import { useState, useEffect, useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { fetchAiDecisions } from '../../services/audit.js'
import { WAIVER_TYPES } from '../../services/mockData.js'
import { useTheme } from '../../features/theme/ThemeProvider.jsx'
import {
  fmtDateNum,
  DecisionPill,
  gridThemeLight,
  gridThemeDark,
  gridThemeEnterpriseLight,
  gridThemeEnterpriseDark,
} from './auditShared.jsx'
import { AiDecisionDetail } from './AiDecisionDetail.jsx'

ModuleRegistry.registerModules([AllCommunityModule])

const WAIVER_NAME = Object.fromEntries(WAIVER_TYPES.map((w) => [w.id, w.name]))

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100)
  const tone = pct >= 70 ? 'bg-success-500' : pct >= 50 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-scrim-strong">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted">{pct}%</span>
    </span>
  )
}

export function AiDecisionLog({ params, setParams, isEnterprise = false, search = '' }) {
  const { resolvedTheme } = useTheme()
  const gridTheme = isEnterprise
    ? (resolvedTheme === 'dark' ? gridThemeEnterpriseDark : gridThemeEnterpriseLight)
    : (resolvedTheme === 'dark' ? gridThemeDark : gridThemeLight)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [decision, setDecision] = useState('')

  // Enterprise drives the query from the topbar search box (lifted to AuditPage);
  // glass uses the in-bar search field.
  const effectiveQuery = isEnterprise ? search : query

  const focusId = params.get('ai') || ''

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAiDecisions()
      .then((r) => { if (!cancelled) setRows(r) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let out = rows
    if (decision) out = out.filter((d) => d.decision === decision)
    if (effectiveQuery) {
      const q = effectiveQuery.toLowerCase()
      out = out.filter((d) =>
        [d.student?.name, WAIVER_NAME[d.waiverTypeId], d.rationale]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      )
    }
    return out
  }, [rows, decision, effectiveQuery])

  const selected = useMemo(() => rows.find((d) => d.id === focusId) ?? null, [rows, focusId])

  const open = useCallback((id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('ai', id)
    else next.delete('ai')
    setParams(next)
  }, [params, setParams])

  const columnDefs = useMemo(() => [
    {
      colId: 'ts', headerName: 'Evaluated', field: 'ts',
      valueFormatter: (p) => fmtDateNum(p.value), sort: 'desc', width: 120, minWidth: 110,
    },
    {
      colId: 'student', headerName: 'Student',
      valueGetter: (p) => p.data.student?.name ?? '—', width: 150, minWidth: 130,
    },
    {
      colId: 'waiver', headerName: 'Waiver',
      valueGetter: (p) => WAIVER_NAME[p.data.waiverTypeId] ?? p.data.waiverTypeId, flex: 1, minWidth: 200,
    },
    {
      colId: 'decision', headerName: 'AI decision',
      valueGetter: (p) => p.data.decision,
      cellRenderer: (p) => <DecisionPill value={p.value} />, width: 140, minWidth: 120,
    },
    {
      colId: 'confidence', headerName: 'Confidence',
      valueGetter: (p) => p.data.confidence,
      cellRenderer: (p) => <ConfidenceBar value={p.value} />, width: 150, minWidth: 140,
    },
    {
      colId: 'checks', headerName: 'Checks',
      valueGetter: (p) => {
        const c = p.data.checks ?? []
        return `${c.filter((x) => x.passed).length}/${c.length}`
      },
      width: 110, minWidth: 90,
    },
  ], [])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    minWidth: 80,
    ...(isEnterprise ? { filter: true, floatingFilter: false } : {}),
  }), [isEnterprise])

  return (
    <div className={isEnterprise ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface' : 'flex flex-col gap-4'}>
      <div className={isEnterprise ? 'flex flex-wrap items-center gap-2.5 border-b border-border px-3 py-2.5' : 'glass-card flex flex-wrap items-center gap-2.5 p-3'}>
        {!isEnterprise && (
          <input
            type="search" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, waiver, rationale…"
            className="glass-input min-w-[200px] flex-1 px-3 py-1.5 text-sm text-ink placeholder:text-muted"
            aria-label="Search AI decisions"
          />
        )}
        <select
          value={decision} onChange={(e) => setDecision(e.target.value)}
          className="glass-input px-3 py-1.5 text-sm text-ink" aria-label="Filter by AI decision"
        >
          <option value="">All decisions</option>
          <option value="admit">Admit</option>
          <option value="deny">Deny</option>
          <option value="review">Review</option>
        </select>
        <span className="ml-auto text-xs text-muted">{filtered.length} decision{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={isEnterprise ? 'min-h-0 flex-1' : 'glass-card overflow-hidden p-1.5'}>
        <div style={{ height: isEnterprise ? '100%' : 560, width: '100%' }}>
          <AgGridReact
            theme={gridTheme}
            rowData={filtered}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowHeight={48}
            headerHeight={46}
            getRowId={(p) => p.data.id}
            pagination
            paginationPageSize={12}
            paginationPageSizeSelector={[12, 25, 50]}
            onRowClicked={(e) => open(e.data.id)}
            rowStyle={{ cursor: 'pointer' }}
            overlayNoRowsTemplate={
              loading ? '<span class="text-sm text-muted">Loading…</span>'
                      : '<span class="text-sm text-muted">No matching decisions.</span>'
            }
          />
        </div>
      </div>

      {selected && (
        <AiDecisionDetail
          decision={selected}
          waiverName={WAIVER_NAME[selected.waiverTypeId] ?? selected.waiverTypeId}
          onClose={() => open('')}
        />
      )}
    </div>
  )
}
