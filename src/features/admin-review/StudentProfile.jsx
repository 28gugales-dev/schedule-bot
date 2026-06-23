import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchStudentRecord, fetchAllWaivers } from '../../services/api.js'
import { StatusBadge } from '../student-portal/RequestTracker.jsx'

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const initialsOf = (name) =>
  String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'

const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 3 4 8 9 13" />
    <line x1="4" y1="8" x2="13" y2="8" />
  </svg>
)

/**
 * Counselor view of a single student's record: identity + every request.
 * Reached from the ⌘K command palette (student quick-find) and admin-only via
 * the /admin route guard. Data is uniform across demo/Supabase (fetchStudentRecord);
 * the disclosure is logged at the service seam, not here.
 */
export function StudentProfile() {
  const { studentId } = useParams()
  const [record, setRecord] = useState(null)
  const [waiverMap, setWaiverMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchStudentRecord(studentId), fetchAllWaivers()])
      .then(([rec, waivers]) => {
        if (cancelled) return
        const map = {}
        waivers.forEach((w) => { map[w.id] = w.name })
        setWaiverMap(map)
        setRecord(rec)
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load student record')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [studentId])

  const student = record?.student
  const requests = record?.requests ?? []

  return (
    <section className="fade-up mx-auto w-full max-w-3xl space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
        <IconBack /> Review Queue
      </Link>

      {loading ? (
        <div className="glass-card h-28 animate-pulse" />
      ) : error ? (
        <div className="glass-card border-danger-200 p-6 text-sm text-danger-600">{error}</div>
      ) : (
        <>
          {/* Identity header */}
          <div className="glass-card flex items-center gap-4 p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700 dark:text-brand-300">
              {initialsOf(student?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{student?.name ?? studentId}</h1>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-muted">
                {student?.grade != null && <span>Grade {student.grade}</span>}
                {student?.gpa != null && <span>GPA {Number(student.gpa).toFixed(2)}</span>}
                {student?.id && <span>ID {student.id}</span>}
                {student?.email && <span>{student.email}</span>}
              </div>
            </div>
          </div>

          {/* Requests */}
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Requests</h2>
              <span className="text-[12px] text-muted">{requests.length} total</span>
            </div>

            {requests.length === 0 ? (
              <div className="glass-card p-6 text-center text-sm text-muted">No requests on file for this student.</div>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="glass-card flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{waiverMap[r.waiverTypeId] ?? r.waiverTypeId}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      Submitted {formatDate(r.submittedAt)}
                      {r.decidedAt && <> · Decided {formatDate(r.decidedAt)}</>}
                    </p>
                    {r.studentNote && <p className="mt-2 text-[13px] text-ink/80">“{r.studentNote}”</p>}
                    {r.counselorNote && (
                      <p className="mt-1.5 text-[12px] text-muted">
                        <span className="font-medium text-ink/70">Counselor:</span> {r.counselorNote}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={r.status} className="shrink-0" />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  )
}
