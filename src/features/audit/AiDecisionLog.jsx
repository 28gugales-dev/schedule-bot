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

export function AiDecisionLog({ params, setParams }) {
  const { resolvedTheme } = useTheme()
  const gridTheme = resolvedTheme === 'dark' ? gridThemeDark : gridThemeLight

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [decision, setDecision] = useState('')

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
    if (query) {
      const q = query.toLowerCase()
      out = out.filter((d) =>
        [d.student?.name, WAIVER_NAME[d.waiverTypeId], d.rationale]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      )
    }
    return out
  }, [rows, decision, query])

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
      valueFormatter: (p) => fmtDateNum(p.value), sort: 'desc', minWidth: 110, flex: 1,
    },
    {
      colId: 'student', headerName: 'Student',
      valueGetter: (p) => p.data.student?.name ?? '—', minWidth: 130, flex: 1.2,
    },
    {
      colId: 'waiver', headerName: 'Waiver',
      valueGetter: (p) => WAIVER_NAME[p.data.waiverTypeId] ?? p.data.waiverTypeId, minWidth: 150, flex: 1.6,
    },
    {
      colId: 'decision', headerName: 'AI decision',
      valueGetter: (p) => p.data.decision,
      cellRenderer: (p) => <DecisionPill value={p.value} />, minWidth: 120, flex: 1,
    },
    {
      colId: 'confidence', headerName: 'Confidence',
      valueGetter: (p) => p.data.confidence,
      cellRenderer: (p) => <ConfidenceBar value={p.value} />, minWidth: 140, flex: 1,
    },
    {
      colId: 'checks', headerName: 'Checks',
      valueGetter: (p) => {
        const c = p.data.checks ?? []
        return `${c.filter((x) => x.passed).length}/${c.length}`
      },
      minWidth: 90, flex: 0.7,
    },
  ], [])

  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, minWidth: 80 }), [])

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card flex flex-wrap items-center gap-2.5 p-3">
        <input
          type="search" value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search student, waiver, rationale…"
          className="glass-input min-w-[200px] flex-1 px-3 py-1.5 text-sm text-ink placeholder:text-muted"
          aria-label="Search AI decisions"
        />
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

      <div className="glass-card overflow-hidden p-1.5">
        <div style={{ height: 560, width: '100%' }}>
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
