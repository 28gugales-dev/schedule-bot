import { useId } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

// Controlled confirm dialog. Self-contained: token-themed surface (.glass-card),
// focus-trapped, scrim click + Escape both cancel. Renders nothing when closed.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const dialogRef = useFocusTrap(open, { onClose: onCancel });

  if (!open) return null;

  const confirmClass =
    tone === 'danger'
      ? 'bg-danger-600 text-white hover:bg-danger-700'
      : 'bg-brand-600 text-white hover:bg-brand-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Scrim — clicking outside the dialog cancels. */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-card animate-toast-in relative w-[calc(100%-2rem)] max-w-md p-5"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-scrim px-4 py-2 text-sm font-medium text-ink transition hover:bg-scrim-strong"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
