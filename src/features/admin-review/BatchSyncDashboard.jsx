import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { fetchBatchSyncQueue, triggerBatchICPush } from '../../services/api.js';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useSkin } from '../../features/skin/SkinProvider.jsx';
import { actorFromAuth } from '../../services/audit.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

export function BatchSyncDashboard() {
  const { user, role } = useAuth();
  const { skin } = useSkin();
  const isEnterprise = skin === 'enterprise';
  // EnterpriseShell exposes a topbar portal slot + layout setters via Outlet
  // context so this page can hoist its title into the dense topbar + go full-bleed.
  const { topbarSlotEl, setPageChrome, setFullBleed } = useOutletContext() ?? {};
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);
  // Gate the MANUAL "Force Sync Now" button behind a confirm. The automatic
  // 60s countdown push is the intended scheduled job and is NOT gated.
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);

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
    // Nothing to push: reset the countdown silently, no push, no toast. Covers
    // the auto-tick AND a manual confirm that lands after an auto-sync already
    // drained the queue while the confirm dialog was open (avoids a "0 waiver(s)"
    // toast). The manual button is disabled at pendingNow === 0 anyway.
    if (pendingNow === 0) {
      setCountdown(60);
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      const result = await triggerBatchICPush(actorFromAuth(user, role));
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

  // Enterprise: hoist title/subtitle into the topbar + full-bleed the console.
  useEffect(() => {
    setPageChrome?.(isEnterprise);
    setFullBleed?.(isEnterprise);
    return () => { setPageChrome?.(false); setFullBleed?.(false); };
  }, [isEnterprise, setPageChrome, setFullBleed]);

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

  // ── Enterprise topbar chrome (portaled into EnterpriseShell's slot) ──────────
  // Title + a live subtitle mirroring the page's queue status / countdown.
  const subtitleText = loading
    ? 'Loading…'
    : allSynced
      ? 'All synced ✓'
      : `${pendingCount} pending · ${syncedCount} synced · next sync ${formatCountdown(countdown)}`;
  const topbarChrome = isEnterprise && topbarSlotEl
    ? createPortal(
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold leading-tight text-ink">Batch Sync Dashboard</p>
          <p className="hidden truncate text-[11px] leading-tight text-muted sm:block">{subtitleText}</p>
        </div>,
        topbarSlotEl,
      )
    : null;

  return (
    <>
    <section className={isEnterprise ? 'flex flex-col gap-3 lg:h-[calc(100vh-3.5rem)]' : 'fade-up space-y-6'}>
      {/* Header — enterprise hoists this into the topbar (see topbarChrome) */}
      {!isEnterprise && (
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Batch Sync Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Manage approved waivers queued for Infinite Campus synchronization
          </p>
        </div>
      )}

      {/* Sync console bar — countdown + live queue counts on one dense row, with
          Force Sync on the right. Counts live here (not a separate line) so the
          glass skin keeps its status readout once the old duplicate line is gone. */}
      <div className={isEnterprise ? 'flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3' : 'glass-card flex flex-wrap items-center justify-between gap-4 p-4'}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-2.5">
            <span className="text-sm font-medium text-ink">Next sync</span>
            <span className="font-mono text-2xl font-semibold tabular-nums text-brand-600 dark:text-ink">
              {formatCountdown(countdown)}
            </span>
          </div>
          <span className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />
          <div className="flex items-center gap-3 text-sm text-ink">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-warning-500" aria-hidden="true" />
              {pendingCount} pending
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-success-500" aria-hidden="true" />
              {syncedCount} synced
            </span>
            {allSynced && (
              <span className="font-medium text-success-700 dark:text-success-300">All synced ✓</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setForceConfirmOpen(true)}
          disabled={syncing || pendingCount === 0}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? 'Syncing…' : 'Force Sync Now'}
        </button>
      </div>

      {/* Success banner */}
      {confirmation && (
        <div
          role="status"
          className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700 dark:text-success-300 ring-1 ring-success-300"
        >
          {confirmation}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:text-danger-300 ring-1 ring-danger-200"
        >
          {error}
        </div>
      )}

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

      {/* Queue table — enterprise frames it as a console panel that flex-fills the
          content height (matching the audit grids beside it) with a sticky header,
          so the data region uses the full viewport rather than floating above bare
          canvas. Glass keeps its frosted card at natural height. */}
      {!loading && queue.length > 0 && (
        <div className={isEnterprise ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface' : 'glass-card overflow-hidden'}>
          <div className={isEnterprise ? 'min-h-0 flex-1 overflow-auto' : ''}>
          <table className="w-full">
            <thead className={isEnterprise ? 'sticky top-0 z-10 border-b border-border bg-surface' : 'border-b border-hairline bg-glass-weak'}>
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
                  className={`border-b border-hairline ${
                    item.synced ? 'bg-scrim opacity-60' : ''
                  }`}
                >
                  <td className="px-5 py-3 text-sm text-ink">{item.student}</td>
                  <td className="px-5 py-3 text-sm text-ink">{item.waiver}</td>
                  <td className="px-5 py-3 text-sm text-muted">{formatDate(item.approvedAt)}</td>
                  <td className="px-5 py-3 text-sm">
                    {item.synced ? (
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-success-500" aria-hidden="true" />
                        Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-warning-500" aria-hidden="true" />
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </section>
    {topbarChrome}
    <ConfirmDialog
      open={forceConfirmOpen}
      title="Force sync now?"
      message={`Force-sync ${pendingCount} approved waiver(s) to Infinite Campus now?`}
      confirmLabel="Force sync"
      cancelLabel="Cancel"
      onCancel={() => setForceConfirmOpen(false)}
      onConfirm={() => { setForceConfirmOpen(false); runSync(false); }}
    />
    </>
  );
}
