import { useState, useEffect } from 'react';
import { fetchBatchSyncQueue, triggerBatchICPush } from '../../services/api.js';

export function BatchSyncDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [confirmation, setConfirmation] = useState(null);

  // Load queue on mount
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const data = await fetchBatchSyncQueue();
        setQueue(data);
      } catch (err) {
        console.error('Failed to load batch sync queue:', err);
        setQueue([]);
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-trigger sync when countdown hits zero
          handleAutoSync();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-sync function called when countdown expires
  const handleAutoSync = async () => {
    try {
      setSyncing(true);
      const result = await triggerBatchICPush();

      // Mark synced items locally
      setQueue(prev =>
        prev.map(item => ({
          ...item,
          synced: true
        }))
      );

      setConfirmation(`Pushed ${result.pushedCount} waiver(s) to Infinite Campus`);
      setTimeout(() => setConfirmation(null), 3000);
      setCountdown(60);
    } catch (err) {
      console.error('Auto-sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Manual sync handler
  const handleForceSyncNow = async () => {
    try {
      setSyncing(true);
      const result = await triggerBatchICPush();

      // Mark synced items locally
      setQueue(prev =>
        prev.map(item => ({
          ...item,
          synced: true
        }))
      );

      setConfirmation(`Pushed ${result.pushedCount} waiver(s) to Infinite Campus`);
      setTimeout(() => setConfirmation(null), 3000);
      setCountdown(60);
    } catch (err) {
      console.error('Force sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

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

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-ink">Batch Sync Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Manage approved waivers queued for Infinite Campus synchronization
        </p>
      </div>

      {/* Countdown & Sync Card */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Next automatic sync in</p>
            <p className="mt-1 text-2xl font-semibold text-brand-600">
              {formatCountdown(countdown)}
            </p>
          </div>
          <button
            onClick={handleForceSyncNow}
            disabled={syncing}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Force Sync Now'}
          </button>
        </div>
      </div>

      {/* Confirmation message */}
      {confirmation && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {confirmation}
        </div>
      )}

      {/* Queue status */}
      <div className="text-sm text-muted">
        {pendingCount} pending • {syncedCount} synced
      </div>

      {/* Empty state */}
      {!loading && queue.length === 0 && (
        <div className="rounded-xl bg-white p-12 shadow-sm ring-1 ring-slate-200 text-center">
          <p className="text-sm text-muted">No approved waivers awaiting sync.</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 text-center">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      )}

      {/* Queue table */}
      {!loading && queue.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Student</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Waiver Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Approved At</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(item => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-200 ${
                    item.synced ? 'bg-slate-50 opacity-60' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3 text-sm text-ink">{item.student}</td>
                  <td className="px-5 py-3 text-sm text-ink">{item.waiver}</td>
                  <td className="px-5 py-3 text-sm text-muted">{formatDate(item.approvedAt)}</td>
                  <td className="px-5 py-3 text-sm">
                    {item.synced ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Synced
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
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
