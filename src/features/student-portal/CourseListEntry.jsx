import { matchCourseName } from '../../utils/courseCatalog.js'

// Seven boxes by default (a typical school day's periods), with a "+" to add
// extra rows for special cases (e.g. a zero period or a split block) and a
// "−" to remove those extras. Left = what the student typed; right = what
// Levenshtein-fuzzy matching against the catalog resolved it to, live.
const BASE_ROWS = 7

function MatchBadge({ raw, match }) {
  if (!raw.trim()) return <span className="text-xs text-muted">—</span>
  if (!match) {
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-muted">No catalog match</span>
  }
  return (
    <span
      title={match.exact ? 'Exact match' : `Closest match (${Math.round(match.similarity * 100)}% similar)`}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        match.exact ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {match.course.name}{!match.exact && ` (~${Math.round(match.similarity * 100)}%)`}
    </span>
  )
}

export function CourseListEntry({ values, onChange }) {
  const rows = values.length >= BASE_ROWS ? values : [...values, ...Array(BASE_ROWS - values.length).fill('')]

  const setValue = (i, v) => {
    const next = [...rows]
    next[i] = v
    onChange(next)
  }

  const addRow = () => onChange([...rows, ''])
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[3.5rem_1fr_1fr_1.5rem] items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        <span></span>
        <span>You typed</span>
        <span>Recognized as</span>
        <span></span>
      </div>
      {rows.map((raw, i) => {
        const match = raw.trim() ? matchCourseName(raw) : null
        const isExtra = i >= BASE_ROWS
        return (
          <div key={i} className="grid grid-cols-[3.5rem_1fr_1fr_1.5rem] items-center gap-2">
            <span className="text-xs text-muted">{isExtra ? 'Extra' : `Period ${i + 1}`}</span>
            <input
              type="text"
              value={raw}
              onChange={(e) => setValue(i, e.target.value)}
              placeholder="Course name…"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <MatchBadge raw={raw} match={match} />
            {isExtra ? (
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remove this course"
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-rose-50 hover:text-rose-600 transition"
              >
                −
              </button>
            ) : (
              <span />
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={addRow}
        className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50 transition"
      >
        + Add a course
      </button>
    </div>
  )
}
