import { useState, useEffect } from 'react'
import { fetchMyRequests, fetchAllWaivers, subscribeToWaitlist } from '../../services/api.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { RequestTracker, StatusBadge } from './RequestTracker.jsx'

const wasDeniedForSeat = (request) =>
  request.status === 'denied' && request.recommendation?.checks?.some((c) => c.id === 'seat' && c.passed === false)

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

export function MyRequests() {
  const { user } = useAuth()
  const studentId = user?.id ?? 'demo-student'
  const [requests, setRequests] = useState([])
  const [waiverMap, setWaiverMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notifyRequested, setNotifyRequested] = useState(() => new Set())
  // Per-row status the nested tracker polls up to, so the card's own badge keeps
  // pace with the stepper instead of freezing at the load-time status.
  const [liveStatus, setLiveStatus] = useState(() => ({}))

  const requestNotify = async (request) => {
    // Optimistically flip to "we'll notify you", but revert if the subscribe
    // call rejects so we never show success for a request that didn't land.
    setNotifyRequested((prev) => new Set(prev).add(request.id))
    try {
      await subscribeToWaitlist(studentId, request.toCourse, request.id)
    } catch (err) {
      setNotifyRequested((prev) => {
        const next = new Set(prev)
        next.delete(request.id)
        return next
      })
      setError(err?.message || 'Could not sign you up for notifications. Please try again.')
    }
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchMyRequests(), fetchAllWaivers()])
      .then(([myRequests, allWaivers]) => {
        if (cancelled) return

        // Build waiverTypeId -> name map
        const map = {}
        allWaivers.forEach((w) => {
          map[w.id] = w.name
        })

        setWaiverMap(map)
        setRequests(myRequests)
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load requests')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="fade-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">My Requests</h1>
        <p className="text-sm text-muted">
          Track the status of every waiver you've submitted.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted">Loading…</p>
      )}

      {error && !loading && (
        <p className="text-sm text-danger-600">{error}</p>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="glass-card p-5">
          <p className="text-sm text-muted">
            You have no waiver requests yet.
          </p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="glass-card p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-ink">
                    {waiverMap[request.waiverTypeId] || request.waiverTypeId}
                  </p>
                  <p className="text-xs text-muted">
                    <span className="font-mono">{request.id}</span>
                    {formatDate(request.submittedAt) && (
                      <> · Submitted {formatDate(request.submittedAt)}</>
                    )}
                  </p>
                </div>
                <StatusBadge status={liveStatus[request.id] ?? request.status} className="shrink-0" />
              </div>

              {request.studentNote && (
                <p className="text-sm text-muted italic">
                  {request.studentNote}
                </p>
              )}

              {wasDeniedForSeat(request) && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-black/[0.03] px-3 py-2.5 text-sm">
                  <span className="text-ink">"{request.toCourse}" was full at the time of review.</span>
                  {notifyRequested.has(request.id) ? (
                    <span className="shrink-0 text-xs font-medium text-success-700">We'll notify you ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => requestNotify(request)}
                      className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                    >
                      Notify me when a spot opens
                    </button>
                  )}
                </div>
              )}

              {/* Pass the already-loaded record so the tracker renders from it
                  directly instead of re-fetching each row's status (N+1).
                  onStatusChange keeps the card badge in sync with the poll. */}
              <RequestTracker
                request={request}
                onStatusChange={(status) =>
                  setLiveStatus((prev) => (prev[request.id] === status ? prev : { ...prev, [request.id]: status }))
                }
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
