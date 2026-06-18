import { useMemo, useState } from 'react'
import { getCourseCatalog } from '../../utils/courseCatalog.js'
import { checkEligibility } from '../../utils/ruleEngine.js'
import { checkSeatAvailability } from '../../utils/seatAvailability.js'

const NONE_OPTION = '__none__'

// Two-column "what am I dropping, what am I replacing it with" picker.
// Left: the student's recognized current/planned courses (from the parsed
// course list). Right: every catalog course, searchable, with ineligible
// options grayed out — eligibility = seat availability (CSP placeholder)
// gate first, then prerequisite/grade rule-engine check.
export function CourseSwapPanel({ courseListNames = [], student, value, onChange }) {
  const [leftSearch, setLeftSearch] = useState('')
  const [rightSearch, setRightSearch] = useState('')
  const catalog = useMemo(() => getCourseCatalog(), [])

  const fromCourse = value?.fromCourse ?? null
  const toCourse = value?.toCourse ?? null

  const filteredLeft = useMemo(
    () => courseListNames.filter((c) => c.toLowerCase().includes(leftSearch.toLowerCase())),
    [courseListNames, leftSearch],
  )

  const rightOptions = useMemo(() => {
    const rows = catalog
      .filter((c) => c.name.toLowerCase().includes(rightSearch.toLowerCase()))
      .map((course) => {
        const seat = checkSeatAvailability(course.name)
        const elig = checkEligibility(student, course)
        const eligible = seat.available && elig.eligible
        const reasons = [
          ...(!seat.available ? ['No seats available in any period'] : []),
          ...elig.failedRules.map((r) => r.label),
        ]
        return { name: course.name, eligible, reasons, seatsLeft: seat.seatsLeft }
      })
    return rows.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.name.localeCompare(b.name))
  }, [catalog, rightSearch, student])

  const setFrom = (name) => onChange({ fromCourse: name || null, toCourse })
  const setTo = (name) => onChange({ fromCourse, toCourse: name === NONE_OPTION ? 'None' : name })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Left: course to drop */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Course to replace</p>
        <input
          type="text"
          value={leftSearch}
          onChange={(e) => setLeftSearch(e.target.value)}
          placeholder="Search your courses…"
          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {courseListNames.length === 0 ? (
          <p className="text-sm text-muted">Upload a course list to see your courses here.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredLeft.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setFrom(name)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  fromCourse === name ? 'bg-brand-50 ring-2 ring-brand-600 text-brand-700' : 'hover:bg-slate-50 text-ink'
                }`}
              >
                {name}
              </button>
            ))}
            {filteredLeft.length === 0 && <p className="text-sm text-muted px-1">No matches.</p>}
          </div>
        )}
      </div>

      {/* Right: replacement options */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Replace with</p>
        <input
          type="text"
          value={rightSearch}
          onChange={(e) => setRightSearch(e.target.value)}
          placeholder="Search all courses…"
          disabled={!fromCourse}
          className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
        />
        {!fromCourse ? (
          <p className="text-sm text-muted">Pick a course on the left first.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-1">
            <button
              type="button"
              onClick={() => setTo(NONE_OPTION)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                toCourse === 'None' ? 'bg-brand-50 ring-2 ring-brand-600 text-brand-700' : 'hover:bg-slate-50 text-ink'
              }`}
            >
              None — just drop it
            </button>
            {rightOptions.map((opt) => (
              <button
                key={opt.name}
                type="button"
                disabled={!opt.eligible}
                title={opt.eligible ? `${opt.seatsLeft} seats left` : opt.reasons.join('; ')}
                onClick={() => setTo(opt.name)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition flex items-center justify-between gap-2 ${
                  !opt.eligible
                    ? 'opacity-40 cursor-not-allowed text-muted'
                    : toCourse === opt.name
                      ? 'bg-brand-50 ring-2 ring-brand-600 text-brand-700'
                      : 'hover:bg-slate-50 text-ink'
                }`}
              >
                <span>{opt.eligible ? '✓' : '🔒'} {opt.name}</span>
                {!opt.eligible && <span className="text-xs text-muted truncate max-w-[40%]">{opt.reasons[0]}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
