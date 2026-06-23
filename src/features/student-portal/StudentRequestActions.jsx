import { useState } from 'react'
import { withdrawRequest, requestRequestDeletion } from '../../services/api.js'

// Statuses after which a request can no longer be withdrawn — only its deletion
// can be requested. Mirrors the RLS USING gate (withdraw is submitted-only).
const TERMINAL = new Set(['approved', 'denied', 'flagged', 'withdrawn'])

// Student-facing actions on a single request: withdraw a still-submitted
// request, or request deletion of a decided one. Both route through the shared
// api.js contract (which auto-selects demo vs real via isSupabaseConfigured).
// Optimistic-with-revert mirrors requestNotify in MyRequests.jsx — the parent
// owns the data via onChanged(), so on success we re-pull rather than mutate.
export function StudentRequestActions({ request, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const canWithdraw = request.status === 'submitted'
  const isTerminal = TERMINAL.has(request.status)
  const deletionRequested = Boolean(request.deletionRequestedAt)
  const canRequestDeletion = isTerminal && !deletionRequested

  const handleWithdraw = async () => {
    if (busy) return
    // Withdraw is irreversible — confirm before firing.
    if (!window.confirm('Withdraw this request? This cannot be undone.')) return
    setBusy(true)
    setError(null)
    try {
      await withdrawRequest(request.id)
      onChanged?.()
    } catch (err) {
      setError(err?.message || 'Could not withdraw the request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleRequestDeletion = async () => {
    if (busy) return
    if (!window.confirm('Request deletion of this request? A counselor will review it.')) return
    setBusy(true)
    setError(null)
    try {
      await requestRequestDeletion(request.id)
      onChanged?.()
    } catch (err) {
      setError(err?.message || 'Could not submit the deletion request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!canWithdraw && !canRequestDeletion && !deletionRequested) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canWithdraw && (
        <button
          type="button"
          onClick={handleWithdraw}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          Withdraw request
        </button>
      )}

      {canRequestDeletion && (
        <button
          type="button"
          onClick={handleRequestDeletion}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          Request deletion
        </button>
      )}

      {deletionRequested && (
        <span className="text-xs font-medium text-success-700">Deletion requested</span>
      )}

      {error && <span className="text-xs text-danger-600">{error}</span>}
    </div>
  )
}
