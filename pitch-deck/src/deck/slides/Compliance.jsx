import { SlideFrame } from '../SlideKit'

// Compliance & security beat — the procurement gatekeeper. On white.
// Layout choice: a clean two-column checklist, NOT another grid of filled tiles
// (Stakes / Before-After / Pricing already own the boxed-grid look). A checklist
// performs the message — "we tick every box procurement cares about" — and reads
// calm and trustworthy instead of busy. FERPA leads and is the single blue accent;
// the other five items stay quiet and neutral. One bold label + one short line each.
const ITEMS = [
  {
    label: 'FERPA-aligned',
    line: 'Student data handled to FERPA standards, end to end.',
    lead: true,
  },
  {
    label: 'Full audit trail',
    line: 'Every change is logged, attributed, and reviewable.',
  },
  {
    label: 'Graduation-requirement checks',
    line: 'District rules enforced automatically on every plan.',
  },
  {
    label: 'Waiver types',
    line: 'District-specific exceptions, supported out of the box.',
  },
  {
    label: 'Row-level security',
    line: 'Each school’s data isolated at the database, via RLS.',
  },
  {
    label: 'Role-based access',
    line: 'Counselor, admin, and district scopes, cleanly separated.',
  },
]

// Single-stroke check. Inherits color from its row (brand for FERPA, ink elsewhere).
function Check({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[18px] w-[18px] ${className}`}
      stroke="currentColor"
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function Compliance() {
  return (
    <SlideFrame
      eyebrow="Built for compliance"
      title="FERPA-aligned, audit-ready by default."
      kicker="Everything your district’s data, privacy, and IT teams check for — handled by default, not bolted on."
    >
      <ul className="grid grid-cols-1 gap-x-12 gap-y-7 md:grid-cols-2">
        {ITEMS.map((item) => (
          <li key={item.label} data-anim className="flex items-start gap-4">
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                item.lead
                  ? 'border-brand-200 bg-brand-50 text-brand-600'
                  : 'border-border bg-panel text-ink'
              }`}
            >
              <Check />
            </span>
            <div>
              <p
                className={`font-display text-lg font-semibold leading-snug tracking-tight ${
                  item.lead ? 'text-brand-600' : 'text-ink'
                }`}
              >
                {item.label}
              </p>
              <p className="mt-1.5 max-w-[34ch] text-[15px] leading-relaxed text-muted">
                {item.line}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </SlideFrame>
  )
}
