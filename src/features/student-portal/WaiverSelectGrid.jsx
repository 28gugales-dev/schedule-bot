export function WaiverSelectGrid({ waivers = [], selectedId, onSelect }) {
  if (!waivers.length) {
    return <p className="text-sm text-muted">No waiver types available.</p>;
  }

  return (
    <div role="radiogroup" className="grid gap-4 sm:grid-cols-2">
      {waivers.map((waiver) => (
        <button
          key={waiver.id}
          type="button"
          role="radio"
          aria-checked={waiver.id === selectedId}
          onClick={() => onSelect(waiver.id)}
          className={`rounded-xl p-5 text-left shadow-sm transition ${
            waiver.id === selectedId
              ? 'ring-2 ring-brand-600 bg-brand-50'
              : 'bg-white ring-1 ring-slate-200 hover:ring-brand-300'
          }`}
        >
          <p className="text-sm font-semibold text-ink">{waiver.name}</p>
          <p className="text-xs text-muted mt-1">{waiver.description}</p>
          {waiver.requiredDocs?.length > 0 && (
            <span className="mt-3 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
              {waiver.requiredDocs.length} required doc{waiver.requiredDocs.length !== 1 ? 's' : ''}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
