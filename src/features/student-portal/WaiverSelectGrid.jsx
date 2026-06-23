import { useRef } from 'react';
import { waiverWindowStatus, windowStatusLabel } from '../../utils/waiverWindow.js';

export function WaiverSelectGrid({ waivers = [], selectedId, onSelect }) {
  const btnRefs = useRef({});

  if (!waivers.length) {
    return <p className="text-sm text-muted">No waiver types available.</p>;
  }

  // Per-card window status — only 'open' forms are selectable; scheduled/closed
  // ones are shown (so students see they exist) but disabled and greyed.
  const statusOf = (w) => waiverWindowStatus(w);
  const isOpen = (w) => statusOf(w) === 'open';

  // Arrow-key navigation per the WAI-ARIA radio group pattern, restricted to the
  // selectable (open) options so focus never lands on a disabled card.
  const handleKeyDown = (e) => {
    const ids = waivers.filter(isOpen).map((w) => w.id);
    if (!ids.length) return;
    const idx = ids.indexOf(selectedId);
    let nextIdx = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIdx = idx < 0 ? 0 : (idx + 1) % ids.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIdx = idx < 0 ? ids.length - 1 : (idx - 1 + ids.length) % ids.length;
    }
    if (nextIdx === null) return;
    e.preventDefault();
    const nextId = ids[nextIdx];
    onSelect(nextId);
    btnRefs.current[nextId]?.focus();
  };

  const firstOpenId = waivers.find(isOpen)?.id;

  return (
    <div
      role="radiogroup"
      aria-label="Waiver type"
      onKeyDown={handleKeyDown}
      className="grid gap-4 sm:grid-cols-2"
    >
      {waivers.map((waiver) => {
        const selected = waiver.id === selectedId;
        const docCount = waiver.requiredDocs?.length ?? 0;
        const status = statusOf(waiver);
        const open = status === 'open';
        // Roving tabindex among open cards only; if nothing is selected the first
        // open card holds the single tab stop.
        const tabbable = open && (selected || (!selectedId && waiver.id === firstOpenId));
        return (
          <button
            key={waiver.id}
            ref={(el) => {
              btnRefs.current[waiver.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={!open}
            disabled={!open}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => open && onSelect(waiver.id)}
            className={`relative p-5 pr-10 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
              !open
                ? 'glass-card cursor-not-allowed opacity-55'
                : selected
                  ? 'glass-card ring-2 ring-brand-600 bg-brand-500/10'
                  : 'glass-card glass-hover'
            }`}
          >
            {/* Selection check — top-right (only meaningful for open cards) */}
            <span
              className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold transition ${
                selected ? 'bg-brand-600 text-white' : 'bg-scrim text-transparent'
              }`}
              aria-hidden="true"
            >
              ✓
            </span>

            <p className="text-sm font-semibold text-ink">{waiver.name}</p>
            <p className="mt-1 text-xs text-muted">{waiver.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!open && (
                <span className="inline-block rounded-full bg-scrim px-2 py-0.5 text-xs font-medium text-muted">
                  {windowStatusLabel(status)}
                  {status === 'scheduled' && waiver.openAt ? ` · opens ${waiver.openAt}` : ''}
                  {status === 'closed' && waiver.closeAt ? ` · closed ${waiver.closeAt}` : ''}
                </span>
              )}
              {docCount > 0 && (
                <span className="inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-300">
                  {docCount} required doc{docCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
