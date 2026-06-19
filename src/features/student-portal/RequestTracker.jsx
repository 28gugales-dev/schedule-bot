import { useState, useEffect } from 'react';
import { fetchRequestStatus } from '../../services/api.js';

const STEPS = ['Submitted', 'Automated Review', 'Counselor Review', 'Decision'];

// status -> index of the step that is "active" (current or final)
const STATUS_MAP = {
  submitted: 0,
  'automated-review': 1,
  'counselor-review': 2,
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

export function RequestTracker({ requestId }) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(undefined);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    setLoading(true);
    setRequest(undefined);

    fetchRequestStatus(requestId)
      .then((data) => {
        if (!cancelled) {
          setRequest(data);
          setLoading(false);
        }
      })
      .catch(() => {
        // Defensive for the real backend (the mock resolves null on miss).
        if (!cancelled) {
          setRequest(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

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
            Request <span className="font-mono">{requestId}</span>
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
