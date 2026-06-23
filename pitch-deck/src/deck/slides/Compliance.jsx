import { SlideFrame, ShotFrame } from '../SlideKit'

// Compliance & security beat — the procurement / IT gatekeeper. On white.
// Research-backed trust slide: show REAL product UI as proof, not badge soup.
// Three actual screens, each mapped to a named FERPA obligation, then a lean
// control-badge strip. "Show, don't tell" — these are screens their security
// reviewer can click through, which is what closes the deal.
const PROOF = [
  {
    src: '/shots/audit-activity.png',
    addr: 'app.schedule-ai / Audit Trail',
    label: 'Access trail',
    line: 'Every record access — who, what, when, which device — logged and exportable.',
  },
  {
    src: '/shots/audit-ai.png',
    addr: 'app.schedule-ai / AI Reasoning',
    label: 'Explainable AI',
    line: 'Every AI decision carries its confidence and per-rule scoring. No black box.',
  },
  {
    src: '/shots/rubric.png',
    addr: 'app.schedule-ai / Policy',
    label: 'Your rules',
    line: 'The district sets the criteria; row-level security isolates each school’s data.',
  },
]

const BADGES = ['FERPA-aligned', 'Role-based access', 'Full audit trail', 'Row-level security', 'CSV / JSON export']

export default function Compliance() {
  return (
    <SlideFrame
      eyebrow="Built for compliance"
      title="Proof your security team can click through."
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PROOF.map((p) => (
          <figure key={p.label} className="flex flex-col">
            <ShotFrame src={p.src} alt={p.line} addr={p.addr} size="sm" />
            <figcaption className="mt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brand-600">{p.label}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{p.line}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Lean control-badge strip — supporting the screenshots, not replacing them.
          Named standards only (no "bank-grade"/padlock soup). */}
      <div data-anim className="mt-9 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {BADGES.map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-good" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {b}
          </span>
        ))}
      </div>
    </SlideFrame>
  )
}
