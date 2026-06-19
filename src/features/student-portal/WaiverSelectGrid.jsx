import { useRef } from 'react';

export function WaiverSelectGrid({ waivers = [], selectedId, onSelect }) {
  const btnRefs = useRef({});

  if (!waivers.length) {
    return <p className="text-sm text-muted">No waiver types available.</p>;
  }

  // Arrow-key navigation per the WAI-ARIA radio group pattern: Arrows move the
  // selection (and focus) between options; the group itself is one tab stop.
  const handleKeyDown = (e) => {
    const ids = waivers.map((w) => w.id);
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

  return (
    <div
      role="radiogroup"
      aria-label="Waiver type"
      onKeyDown={handleKeyDown}
      className="grid gap-4 sm:grid-cols-2"
    >
      {waivers.map((waiver, index) => {
        const selected = waiver.id === selectedId;
        const docCount = waiver.requiredDocs?.length ?? 0;
        // Roving tabindex: only the selected card is tabbable; if nothing is
        // selected yet, the first card holds the single tab stop.
        const tabbable = selected || (!selectedId && index === 0);
        return (
          <button
            key={waiver.id}
            ref={(el) => {
              btnRefs.current[waiver.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onSelect(waiver.id)}
            className={`relative p-5 pr-10 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
              selected
                ? 'glass-card ring-2 ring-brand-600 bg-brand-500/10'
                : 'glass-card glass-hover'
            }`}
          >
            {/* Selection check — top-right */}
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
            {docCount > 0 && (
              <span className="mt-3 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-300">
                {docCount} required doc{docCount !== 1 ? 's' : ''}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
