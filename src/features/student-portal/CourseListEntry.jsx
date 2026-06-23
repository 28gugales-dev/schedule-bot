import { useRef, useState } from 'react'
import { matchCourseName, suggestCourseNames } from '../../utils/courseCatalog.js'

// Seven course boxes by default, with +/- to add/remove and a type-ahead match dropdown.
const BASE_ROWS = 7

function MatchBadge({ raw, match }) {
  if (!raw.trim()) return <span className="text-xs text-muted">—</span>
  if (!match) {
    return <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-border">No catalog match</span>
  }
  return (
    <span
      title={match.exact ? 'Exact match' : `Closest match (${Math.round(match.similarity * 100)}% similar)`}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        match.exact ? 'bg-success-50 text-success-700 dark:text-success-300' : 'bg-warning-50 text-warning-700 dark:text-warning-300'
      }`}
    >
      {match.course.name}{!match.exact && ` (~${Math.round(match.similarity * 100)}%)`}
    </span>
  )
}

export function CourseListEntry({ values, onChange }) {
  const [openIndex, setOpenIndex] = useState(null)
  const blurTimer = useRef(null)

  const rows = values.length >= BASE_ROWS ? values : [...values, ...Array(BASE_ROWS - values.length).fill('')]

  const setValue = (i, v) => {
    const next = [...rows]
    next[i] = v
    onChange(next)
  }

  const addRow = () => onChange([...rows, ''])
  const removeRow = (i) => {
    if (rows.length <= 1) return
    onChange(rows.filter((_, idx) => idx !== i))
  }

  const selectSuggestion = (i, name) => {
    clearTimeout(blurTimer.current)
    setValue(i, name)
    setOpenIndex(null)
  }

  // Only close row i's dropdown — guards against a stale timer from another row.
  const handleBlur = (i) => {
    blurTimer.current = setTimeout(() => {
      setOpenIndex((current) => (current === i ? null : current))
    }, 120)
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[3.5rem_1fr_1fr_1.5rem] items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        <span></span>
        <span>You typed</span>
        <span>Official course name</span>
        <span></span>
      </div>
      {rows.map((raw, i) => {
        const match = raw.trim() ? matchCourseName(raw) : null
        const isExtra = i >= BASE_ROWS
        const suggestions = openIndex === i ? suggestCourseNames(raw, 6) : []
        return (
          <div key={i} className="grid grid-cols-[3.5rem_1fr_1fr_1.5rem] items-center gap-2">
            <span className="text-xs text-muted">{isExtra ? 'Extra' : `Period ${i + 1}`}</span>
            <div className="relative">
              <input
                type="text"
                value={raw}
                onChange={(e) => setValue(i, e.target.value)}
                onFocus={() => setOpenIndex(i)}
                onBlur={() => handleBlur(i)}
                placeholder="Course name…"
                className="glass-input w-full px-3 py-1.5 text-sm"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg bg-elevated py-1 text-sm shadow-lg ring-1 ring-border">
                  {suggestions.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(i, name)}
                        className="block w-full px-3 py-1.5 text-left text-ink hover:bg-brand-50"
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <MatchBadge raw={raw} match={match} />
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length <= 1}
              aria-label="Remove this course"
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-danger-50 hover:text-danger-600 dark:hover:text-danger-300 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
            >
              −
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={addRow}
        className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50 transition"
      >
        + Add a course
      </button>
    </div>
  )
}
