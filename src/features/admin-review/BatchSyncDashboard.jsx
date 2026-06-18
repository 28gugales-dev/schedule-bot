import { useState, useEffect, useRef } from 'react';
import { fetchBatchSyncQueue, triggerBatchICPush } from '../../services/api.js';

export function BatchSyncDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);

  // Keep the interval/zero-effect pointed at the latest runSync without
  // re-creating the interval on every render.
  const runSyncRef = useRef(null);

  // Load queue on mount
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const data = await fetchBatchSyncQueue();
        setQueue(data);
      } catch {
        setError("Couldn't load the sync queue. Try again.");
        setQueue([]);
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, []);

  // Single sync path used by both the manual button and the auto-trigger.
  const runSync = async (isAuto = false) => {
    if (syncing) return; // overlap guard — never start a second sync

    const pendingNow = queue.filter(item => !item.synced).length;
    // Auto-trigger with an empty queue: reset silently, no push, no toast.
    if (isAuto && pendingNow === 0) {
      setCountdown(60);
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      const result = await triggerBatchICPush();
      setQueue(prev => prev.map(item => ({ ...item, synced: true })));
      setConfirmation(`Pushed ${result.pushedCount} waiver(s) to Infinite Campus`);
    } catch {
      setError("Sync failed — couldn't reach Infinite Campus. Try again.");
    } finally {
      setSyncing(false);
      setCountdown(60);
    }
  };

  // Always expose the latest runSync to the timer effects.
  useEffect(() => {
    runSyncRef.current = runSync;
  });

  // The interval ONLY ticks the countdown down. Pause it while a sync is in
  // flight so it doesn't immediately re-fire on top of an active push.
  useEffect(() => {
    if (syncing) return;
    const id = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [syncing]);

  // Fire the sync from an effect (not from inside the updater) when we hit 0.
  useEffect(() => {
    if (countdown === 0) runSyncRef.current?.(true);
  }, [countdown]);

  // Auto-dismiss banners via cleanup-safe effects (cleared on unmount / re-fire).
  useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => setConfirmation(null), 3500);
    return () => clearTimeout(t);
  }, [confirmation]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error]);

  // Format countdown as MM:SS
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format ISO date to readable format
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const pendingCount = queue.filter(item => !item.synced).length;
  const syncedCount = queue.filter(item => item.synced).length;
  const allSynced = !loading && queue.length > 0 && pendingCount === 0;

  return (
    <section className="fade-up space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Batch Sync Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Manage approved waivers queued for Infinite Campus synchronization
        </p>
      </div>

      {/* Countdown & Sync Card */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Next automatic sync in</p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-brand-600">
              {formatCountdown(countdown)}
            </p>
            {allSynced && (
              <p className="mt-1 text-xs font-medium text-success-700">All synced ✓</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => runSync(false)}
            disabled={syncing || pendingCount === 0}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'Syncing…' : 'Force Sync Now'}
          </button>
        </div>
      </div>

      {/* Success banner */}
      {confirmation && (
        <div
          role="status"
          className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700 ring-1 ring-success-300"
        >
          {confirmation}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700 ring-1 ring-danger-200"
        >
          {error}
        </div>
      )}

      {/* Queue status */}
      <div className="text-sm text-muted">
        {pendingCount} pending • {syncedCount} synced
      </div>

      {/* Empty state */}
      {!loading && queue.length === 0 && (
        <div className="glass-card p-12 text-center">
          <p className="text-sm text-muted">No approved waivers awaiting sync.</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="glass-card p-5 text-center">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      )}

      {/* Queue table */}
      {!loading && queue.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-black/10 bg-white/40">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-muted">Student</th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-muted">Waiver Type</th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-muted">Approved At</th>
                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(item => (
                <tr
                  key={item.id}
                  className={`border-b border-black/10 ${
                    item.synced ? 'bg-black/[0.03] opacity-60' : ''
                  }`}
                >
                  <td className="px-5 py-3 text-sm text-ink">{item.student}</td>
                  <td className="px-5 py-3 text-sm text-ink">{item.waiver}</td>
                  <td className="px-5 py-3 text-sm text-muted">{formatDate(item.approvedAt)}</td>
                  <td className="px-5 py-3 text-sm">
                    {item.synced ? (
                      <span className="inline-flex rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700">
                        Synced
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
