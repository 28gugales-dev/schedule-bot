import { useState, useEffect } from 'react'
import { fetchMyRequests, fetchAllWaivers } from '../../services/api.js'
import { RequestTracker, StatusBadge } from './RequestTracker.jsx'

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

export function MyRequests() {
  const [requests, setRequests] = useState([])
  const [waiverMap, setWaiverMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
                <StatusBadge status={request.status} className="shrink-0" />
              </div>

              {request.studentNote && (
                <p className="text-sm text-muted italic">
                  {request.studentNote}
                </p>
              )}

              <RequestTracker requestId={request.id} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
