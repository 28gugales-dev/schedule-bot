import { useEffect, useState } from 'react'
import { fetchRejectedRequests, fetchAllWaivers } from '../../services/api.js'

function fmtDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}

export function RejectedHistory() {
  const [items, setItems] = useState([])
  const [waiverMap, setWaiverMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchRejectedRequests(), fetchAllWaivers()])
      .then(([rejected, waivers]) => {
        if (cancelled) return
        const map = {}
        for (const w of waivers) map[w.id] = w.name
        setWaiverMap(map)
        setItems(rejected)
      })
      .catch((e) => !cancelled && setError(e?.message ?? 'Failed to load rejected requests.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  return (
    <section className="fade-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Rejected Requests</h1>
        <p className="mt-1 text-sm text-muted">Past denied waiver requests, kept for reference.</p>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center text-sm text-muted">Loading…</div>
      ) : error ? (
        <div className="glass-card p-8 text-center text-sm text-danger-700">{error}</div>
      ) : items.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-muted">No rejected requests yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="glass-card p-5 flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-ink">{r.student?.name ?? 'Student'}</p>
                  <p className="text-xs text-muted">
                    {waiverMap[r.waiverTypeId] ?? r.waiverTypeId} · Denied {fmtDate(r.deniedAt)}
                  </p>
                </div>
                {r.fromCourse && r.toCourse && (
                  <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-medium text-ink">
                    {r.fromCourse} → {r.toCourse}
                  </span>
                )}
              </div>
              {r.recommendation?.reason && <p className="text-sm text-muted">{r.recommendation.reason}</p>}
              {r.counselorNote && <p className="text-sm italic text-ink">"{r.counselorNote}"</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
