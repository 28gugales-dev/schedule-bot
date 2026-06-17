import { useState, useEffect } from 'react'
import { fetchMyRequests, fetchAllWaivers } from '../../services/api.js'
import { RequestTracker } from './RequestTracker.jsx'

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
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">My Requests</h1>
        <p className="text-sm text-muted">
          Track the status of every waiver you've submitted.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted">Loading…</p>
      )}

      {error && !loading && (
        <p className="text-sm text-rose-600">{error}</p>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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
              className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-base font-semibold text-ink">
                    {waiverMap[request.waiverTypeId] || request.waiverTypeId}
                  </p>
                  <p className="text-xs text-muted">{request.id}</p>
                </div>
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
