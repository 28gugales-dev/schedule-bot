import { useState, useEffect } from 'react';
import { fetchRequestStatus } from '../../services/api.js';

const STEPS = ['Submitted', 'Automated Review', 'Counselor Review', 'Decision'];

// Terminal statuses end the stepper — no further polling needed.
const TERMINAL = new Set(['approved', 'denied', 'flagged']);
const isTerminal = (status) => TERMINAL.has(status);

const POLL_MS = 2000;

// status -> index of the step that is "active" (current or final)
const STATUS_MAP = {
  submitted: 0,
  'automated-review': 1,
  'counselor-review': 2,
  flagged: 2,
  decision: 3,
  approved: 3,
  denied: 3,
};

// Single source of truth for how each status reads + which semantic tone it
// carries. Reused by MyRequests via <StatusBadge> so labels never drift.
export const STATUS_META = {
  submitted: { label: 'Submitted', tone: 'brand' },
  'automated-review': { label: 'Automated review', tone: 'brand' },
  'counselor-review': { label: 'Counselor review', tone: 'brand' },
  flagged: { label: 'Flagged for review', tone: 'warning' },
  decision: { label: 'Decision pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  denied: { label: 'Denied', tone: 'danger' },
};

// Full literal class strings (Tailwind v4 scans source — no dynamic concat).
const BADGE_TONE = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100 dark:text-brand-300',
  success: 'bg-success-50 text-success-700 ring-success-100 dark:text-success-300',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100 dark:text-warning-300',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100 dark:text-danger-300',
};

const DOT_TONE = {
  brand: 'bg-brand-500',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  danger: 'bg-danger-600',
};

export function StatusBadge({ status, className = '' }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'brand' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${BADGE_TONE[meta.tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONE[meta.tone]}`} />
      {meta.label}
    </span>
  );
}

// `requestId` — fetch + poll the status by id (original, still-supported path).
// `request`   — an already-loaded request object: render from it directly and
//               skip the initial fetch (avoids the N+1 when a parent like
//               MyRequests already has every record). Still polls while the
//               status is non-terminal so the stepper visibly advances.
// `onStatusChange(status)` — optional. Fires whenever the tracker learns a new
// status (initial load + each poll). Lets a parent that renders its own badge
// (e.g. MyRequests) stay in sync with the polling stepper instead of freezing
// at the load-time status.
export function RequestTracker({ requestId, request: requestProp, onStatusChange }) {
  // Seed from the prop when given so the first paint has no fetch flash.
  const [loading, setLoading] = useState(() => requestProp === undefined);
  const [request, setRequest] = useState(() => requestProp ?? undefined);

  // The id we poll against — prefer the loaded object's own id.
  const trackId = requestProp?.id ?? requestId;

  // Mirror the prop into state when it changes (parent re-fetched the list).
  useEffect(() => {
    if (requestProp !== undefined) {
      setRequest(requestProp);
      setLoading(false);
    }
  }, [requestProp]);

  useEffect(() => {
    if (!trackId) return;
    let cancelled = false;
    let timer = null;

    // No prop → fetch the initial status; reset to the loading state first.
    if (requestProp === undefined) {
      setLoading(true);
      setRequest(undefined);
    }

    const schedule = (status) => {
      // Keep polling only while the status is known and non-terminal.
      if (cancelled || isTerminal(status)) return;
      timer = setTimeout(poll, POLL_MS);
    };

    const poll = () => {
      fetchRequestStatus(trackId)
        .then((data) => {
          if (cancelled) return;
          setRequest(data);
          setLoading(false);
          schedule(data?.status);
        })
        .catch(() => {
          // Defensive for the real backend (the mock resolves null on miss).
          if (cancelled) return;
          setRequest((prev) => prev ?? null);
          setLoading(false);
        });
    };

    if (requestProp === undefined) {
      // No seed — fetch now (which also schedules the next poll).
      poll();
    } else {
      // Seeded from the prop — don't refetch, just start polling if pending.
      schedule(requestProp.status);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, requestProp]);

  // Bubble each learned status up so a parent's own badge tracks the poll.
  useEffect(() => {
    if (request?.status) onStatusChange?.(request.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.status]);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <p className="text-sm text-muted">Loading status…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="glass-card p-5">
        <p className="text-sm text-muted">Request not found.</p>
      </div>
    );
  }

  const activeIndex =
    STATUS_MAP[request.status] !== undefined ? STATUS_MAP[request.status] : 0;
  const decided = request.status === 'approved' || request.status === 'denied';
  const denied = request.status === 'denied';

  const submittedLabel = request.submittedAt
    ? new Date(request.submittedAt).toLocaleString()
    : null;

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">
            Request <span className="font-mono">{trackId}</span>
          </p>
          {submittedLabel && (
            <p className="mt-0.5 text-xs text-muted">Submitted {submittedLabel}</p>
          )}
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Stepper */}
      <div className="flex items-start">
        {STEPS.map((label, index) => {
          const isLast = index === STEPS.length - 1;

          // Resolve the visual state of this node.
          let state;
          if (isLast && decided) state = denied ? 'denied' : 'approved';
          else if (index < activeIndex) state = 'done';
          else if (index === activeIndex) state = 'current';
          else state = 'future';

          const circleClass = {
            done: 'bg-brand-600 text-white',
            current: 'bg-brand-50 text-brand-700 dark:text-brand-300 ring-2 ring-brand-600',
            future: 'bg-scrim text-muted',
            approved: 'bg-success-600 text-white',
            denied: 'bg-danger-600 text-white',
          }[state];

          const circleContent =
            state === 'done' || state === 'approved'
              ? '✓'
              : state === 'denied'
                ? '✕'
                : index + 1;

          // Step labels: the final step reflects the actual outcome.
          const stepLabel =
            isLast && decided ? (denied ? 'Denied' : 'Approved') : label;

          const labelClass =
            state === 'approved'
              ? 'font-medium text-success-700 dark:text-success-300'
              : state === 'denied'
                ? 'font-medium text-danger-700 dark:text-danger-300'
                : index <= activeIndex
                  ? 'text-ink'
                  : 'text-muted';

          const connectorClass =
            index < activeIndex ? 'bg-brand-600' : 'bg-scrim-strong';

          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${circleClass}`}
                >
                  {circleContent}
                </div>
                {!isLast && <div className={`h-0.5 flex-1 ${connectorClass}`} />}
              </div>
              <p className={`mt-2 text-center text-xs ${labelClass}`}>{stepLabel}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
