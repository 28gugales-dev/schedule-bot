import { useState, useEffect } from 'react';
import { fetchRequestStatus } from '../../services/api.js';

const STEPS = ['Submitted', 'Automated Review', 'Counselor Review', 'Decision'];

const STATUS_MAP = {
  submitted: 0,
  'automated-review': 1,
  'counselor-review': 2,
  decision: 3,
  approved: 3,
  denied: 3,
};

export function RequestTracker({ requestId }) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(undefined);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    setLoading(true);
    setRequest(undefined);

    fetchRequestStatus(requestId).then((data) => {
      if (!cancelled) {
        setRequest(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-muted">Loading status…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-muted">Request not found.</p>
      </div>
    );
  }

  const activeIndex =
    STATUS_MAP[request.status] !== undefined ? STATUS_MAP[request.status] : 0;

  const submittedLabel =
    request.submittedAt
      ? new Date(request.submittedAt).toLocaleString()
      : null;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {/* Header */}
      <div className="mb-5">
        <p className="text-sm font-medium text-ink">
          Request <span className="font-mono">{requestId}</span>
        </p>
        {submittedLabel && (
          <p className="mt-0.5 text-xs text-muted">Submitted {submittedLabel}</p>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-start">
        {STEPS.map((label, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isFuture = index > activeIndex;
          const isLast = index === STEPS.length - 1;

          let circleClass;
          if (isCompleted) {
            circleClass =
              'bg-brand-600 text-white';
          } else if (isCurrent) {
            circleClass =
              'bg-brand-50 text-brand-700 ring-2 ring-brand-600';
          } else {
            circleClass = 'bg-slate-200 text-slate-400';
          }

          const labelClass =
            index <= activeIndex ? 'text-ink' : 'text-muted';

          const connectorClass =
            index < activeIndex ? 'bg-brand-600' : 'bg-slate-200';

          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              {/* Row: circle + connector line */}
              <div className="flex w-full items-center">
                {/* Circle */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${circleClass}`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {/* Connector (not rendered after last step) */}
                {!isLast && (
                  <div className={`h-0.5 flex-1 ${connectorClass}`} />
                )}
              </div>

              {/* Label */}
              <p className={`mt-2 text-center text-xs ${labelClass}`}>
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
