// Custom-SVG / token-styled charts for the Team panel. No charting library —
// matches the Civic analytics aesthetic and the app's zero-chart-dep codebase.

const VALUE_TONE = {
  ink: 'text-ink',
  success: 'text-success-700 dark:text-success-300',
  warning: 'text-warning-700 dark:text-warning-300',
  danger: 'text-danger-700 dark:text-danger-300',
  brand: 'text-brand-700 dark:text-ink',
}

const ACCENT_DOT = {
  ink: 'bg-muted',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  brand: 'bg-brand-500',
}

/** A single KPI tile — colored accent dot + uppercase label + big tabular value. */
export function Tile({ label, value, sub, tone = 'ink' }) {
  return (
    <div className="glass-card flex flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_DOT[tone]}`} aria-hidden="true" />
        <span className="eyebrow">{label}</span>
      </span>
      <p className={`font-display text-3xl font-semibold tabular-nums ${VALUE_TONE[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

/** Top KPI row for the Overview tab. */
export function KpiRow({ counselors, stats }) {
  const activeToday = counselors.filter((c) => {
    if (!c.stats.lastActivity) return false
    const d = new Date(c.stats.lastActivity)
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }).length

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile label="Counselors" value={counselors.length} sub={`${activeToday} active today`} tone="brand" />
      <Tile label="Decisions logged" value={stats.decisionsTotal} sub={`${stats.decisionsToday} today`} />
      <Tile
        label="AI agreement"
        value={stats.agreement != null ? `${stats.agreement}%` : '—'}
        sub={`${stats.overrides} override${stats.overrides !== 1 ? 's' : ''}`}
        tone={stats.agreement != null && stats.agreement >= 80 ? 'success' : 'warning'}
      />
      <Tile
        label="Override rate"
        value={`${stats.overrideRate}%`}
        sub="counselor ≠ AI"
        tone={stats.overrideRate > 25 ? 'warning' : 'ink'}
      />
    </div>
  )
}

// ── Decisions-over-time area chart (SVG) ──────────────────────────────────────
const DAYS = 14

function buildTrend(events) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    buckets.push({ date: d, count: 0 })
  }
  const start = buckets[0].date.getTime()
  for (const e of events) {
    if (e.category !== 'decision') continue
    const t = new Date(e.ts)
    t.setHours(0, 0, 0, 0)
    const idx = Math.round((t.getTime() - start) / 86400000)
    if (idx >= 0 && idx < DAYS) buckets[idx].count += 1
  }
  return buckets
}

const fmtTick = (d) => `${d.getMonth() + 1}/${d.getDate()}`

/** Derive at-a-glance readouts the line itself can't show: pace, peak, coverage,
 *  and 7-day-over-7-day momentum. All from the same buckets so chart + numbers
 *  never disagree. Tones reuse VALUE_TONE so they flip in dark/enterprise skins. */
function summarize(data) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const max = Math.max(0, ...data.map((d) => d.count))
  const peak = data.find((d) => d.count === max)
  const activeDays = data.filter((d) => d.count > 0).length
  const half = Math.floor(DAYS / 2)
  const prior = data.slice(0, DAYS - half).reduce((s, d) => s + d.count, 0)
  const recent = data.slice(DAYS - half).reduce((s, d) => s + d.count, 0)

  let trend
  if (prior === 0) {
    trend = recent > 0 ? { value: 'New', tone: 'success' } : { value: '—', tone: 'ink' }
  } else {
    const pct = Math.round(((recent - prior) / prior) * 100)
    const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : ''
    trend = { value: `${arrow} ${Math.abs(pct)}%`.trim(), tone: pct > 0 ? 'success' : pct < 0 ? 'danger' : 'ink' }
  }

  return [
    { label: 'Daily average', value: (total / DAYS).toFixed(1), tone: 'ink' },
    { label: 'Peak day', value: max, sub: max > 0 ? fmtTick(peak.date) : null, tone: 'brand' },
    { label: 'Active days', value: activeDays, sub: `of ${DAYS}`, tone: 'ink' },
    { label: `Last ${half}d trend`, value: trend.value, tone: trend.tone },
  ]
}

/** Decisions made per day over the last 14 days. Area + line, token-colored,
 *  with a derived-metrics readout column to the right (stacks below on mobile). */
export function DecisionsTrend({ events }) {
  const data = buildTrend(events)
  const metrics = summarize(data)
  const W = 600
  const H = 168
  const pad = { l: 8, r: 8, t: 14, b: 22 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const max = Math.max(1, ...data.map((d) => d.count))
  const n = data.length
  const x = (i) => pad.l + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1))
  const y = (v) => pad.t + innerH - (v / max) * innerH

  const linePts = data.map((d, i) => `${x(i)},${y(d.count)}`).join(' ')
  const areaPath = `M ${x(0)},${pad.t + innerH} L ${data.map((d, i) => `${x(i)},${y(d.count)}`).join(' L ')} L ${x(n - 1)},${pad.t + innerH} Z`
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="eyebrow">Decisions over time</span>
        <span className="text-xs text-muted">
          <span className="font-semibold tabular-nums text-ink">{total}</span> in {DAYS} days
        </span>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(150px,196px)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-0 self-center" role="img" aria-label={`Decisions per day over the last ${DAYS} days`}>
        <defs>
          <linearGradient id="team-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* baseline */}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + innerH} y2={pad.t + innerH} stroke="var(--color-border)" strokeWidth="1" />
        <path d={areaPath} fill="url(#team-trend-fill)" />
        <polyline
          points={linePts}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.count)} r="2.5" fill="var(--color-brand-500)" />
        ))}
        {/* sparse x labels: first (start-anchored), middle, last (end-anchored)
            so the edge ticks aren't clipped by the viewBox padding */}
        {[0, Math.floor(n / 2), n - 1].map((i, k) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            fontSize="10"
            textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}
            fill="var(--color-muted)"
          >
            {fmtTick(data[i].date)}
          </text>
        ))}
      </svg>
        <dl className="flex flex-col self-center lg:border-l lg:border-hairline lg:pl-5">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex items-baseline justify-between gap-3 border-b border-hairline py-2.5 last:border-0"
            >
              <dt className="text-[13px] text-muted">{m.label}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className={`font-display text-lg font-semibold tabular-nums ${VALUE_TONE[m.tone]}`}>{m.value}</span>
                {m.sub && <span className="text-[11px] tabular-nums text-muted">{m.sub}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

// ── Ranked horizontal bars (decisions / override-rate by counselor) ───────────
const BAR_TONE = {
  brand: 'bg-brand-500',
  warning: 'bg-warning-500',
}

/** rows: [{ label, value, display }]. `suffix` appended to the value readout. */
export function RankedBars({ title, rows, tone = 'brand', suffix = '', empty = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="glass-card p-5">
      <span className="eyebrow">{title}</span>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.length === 0 && <li className="text-sm text-muted">{empty}</li>}
        {rows.map((r, i) => (
          <li key={r.key ?? r.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="w-3 shrink-0 text-[11px] tabular-nums text-muted">{i + 1}</span>
                <span className="truncate text-ink">{r.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted">{r.display ?? r.value}{suffix}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-scrim">
              <div className={`h-full rounded-full ${BAR_TONE[tone]}`} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
