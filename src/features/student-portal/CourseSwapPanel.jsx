import { useMemo, useState } from 'react'
import { getCourseCatalog, trackSkipHops } from '../../utils/courseCatalog.js'
import { checkEligibility } from '../../utils/ruleEngine.js'
import { checkSeatAvailability } from '../../utils/seatAvailability.js'
import { hasConflict } from '../../utils/conflictDetection.js'
import { analyzeDropImpact } from '../../utils/dependencyAnalysis.js'

const NONE_OPTION = '__none__'

// Two-column "drop X, replace with Y" picker — right side grays out ineligible
// courses. Two waiver types relax the gate they'd otherwise enforce, since
// each exists specifically to permit the thing it would normally block:
//   - prereq-override: missing prereq is waived within 2 forward hops of
//     fromCourse in the prereq graph (e.g. completed Journalism I -> may
//     request Journalism II or III, on unlisted/external credit).
//   - schedule-conflict: a period collision is shown, not disabled — that
//     collision is the reason for the request, not a reason to block it.
export function CourseSwapPanel({ courseListNames = [], student, value, onChange, waiverTypeId }) {
  const allowTrackSkip = waiverTypeId === 'prereq-override'
  const allowConflictOverride = waiverTypeId === 'schedule-conflict'
  const [leftSearch, setLeftSearch] = useState('')
  const [rightSearch, setRightSearch] = useState('')
  const catalog = useMemo(() => getCourseCatalog(), [])

  const fromCourse = value?.fromCourse ?? null
  const toCourse = value?.toCourse ?? null

  const filteredLeft = useMemo(
    () => courseListNames.filter((c) => c.toLowerCase().includes(leftSearch.toLowerCase())),
    [courseListNames, leftSearch],
  )

  const dependencyImpact = useMemo(() => (fromCourse ? analyzeDropImpact(fromCourse) : null), [fromCourse])

  const currentSchedule = useMemo(
    () => courseListNames.filter((c) => c !== fromCourse).map((name) => ({ course: name, period: checkSeatAvailability(name).period })),
    [courseListNames, fromCourse],
  )

  const rightOptions = useMemo(() => {
    const rows = catalog
      .filter((c) => c.name.toLowerCase().includes(rightSearch.toLowerCase()))
      .map((course) => {
        const seat = checkSeatAvailability(course.name)
        const conflict = seat.available && hasConflict(currentSchedule, { course: course.name, period: seat.period })
        const conflictBlocks = conflict && !allowConflictOverride
        const elig = checkEligibility(student, course, { allowTrackSkip, fromCourse })
        const eligible = seat.available && !conflictBlocks && elig.eligible
        const reasons = [
          ...(!seat.available ? ['No seats available in any period'] : []),
          ...(conflictBlocks ? ['Conflicts with another course on your schedule'] : []),
          ...elig.failedRules.map((r) => r.label),
        ]
        const hops = allowTrackSkip ? trackSkipHops(fromCourse, course.name) : null
        const prereqWaived = hops != null && course.prerequisite && !student.completed.has(course.prerequisite)
        const why = prereqWaived
          ? `Prerequisite waived — ${hops} step${hops > 1 ? 's' : ''} ahead of "${fromCourse}"`
          : conflict && allowConflictOverride
            ? 'Conflicts with your schedule — counselor will resolve the period'
            : !course.prerequisite
              ? 'Intro course — no prerequisite required'
              : `Meets prerequisite: "${course.prerequisite}"`
        return { name: course.name, eligible, reasons, why, seatsLeft: seat.seatsLeft }
      })
    return rows.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.name.localeCompare(b.name))
  }, [catalog, rightSearch, student, currentSchedule, allowTrackSkip, allowConflictOverride, fromCourse])

  const setFrom = (name) => onChange({ fromCourse: name || null, toCourse })
  const setTo = (name) => onChange({ fromCourse, toCourse: name === NONE_OPTION ? 'None' : name })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {dependencyImpact?.warning && (
        <div className="sm:col-span-2 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700 ring-1 ring-warning-100 dark:text-warning-300">
          ⚠ {dependencyImpact.warning}
        </div>
      )}
      {/* Left: course to drop */}
      <div className="glass-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Course to replace</p>
        <input
          type="text"
          value={leftSearch}
          onChange={(e) => setLeftSearch(e.target.value)}
          placeholder="Search your courses…"
          className="glass-input mb-2 w-full px-3 py-1.5 text-sm"
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
                  fromCourse === name ? 'bg-brand-50 ring-2 ring-brand-600 text-brand-700 dark:text-brand-300' : 'hover:bg-brand-50/60 text-ink'
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
      <div className="glass-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Replace with</p>
        <input
          type="text"
          value={rightSearch}
          onChange={(e) => setRightSearch(e.target.value)}
          placeholder="Search all courses…"
          disabled={!fromCourse}
          className="glass-input mb-2 w-full px-3 py-1.5 text-sm disabled:opacity-50"
        />
        {!fromCourse ? (
          <p className="text-sm text-muted">Pick a course on the left first.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-1">
            <button
              type="button"
              onClick={() => setTo(NONE_OPTION)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                toCourse === 'None' ? 'bg-brand-50 ring-2 ring-brand-600 text-brand-700 dark:text-brand-300' : 'hover:bg-brand-50/60 text-ink'
              }`}
            >
              None — just drop it
            </button>
            {rightOptions.map((opt) => (
              <button
                key={opt.name}
                type="button"
                disabled={!opt.eligible}
                title={opt.eligible ? `${opt.why} · ${opt.seatsLeft} seats left` : opt.reasons.join('; ')}
                onClick={() => setTo(opt.name)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition flex items-center justify-between gap-2 ${
                  !opt.eligible
                    ? 'opacity-40 cursor-not-allowed text-muted'
                    : toCourse === opt.name
                      ? 'bg-brand-50 ring-2 ring-brand-600 text-brand-700 dark:text-brand-300'
                      : 'hover:bg-brand-50/60 text-ink'
                }`}
              >
                <span>{opt.eligible ? '✓' : '🔒'} {opt.name}</span>
                <span className="text-xs text-muted truncate max-w-[45%]">{opt.eligible ? opt.why : opt.reasons[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
