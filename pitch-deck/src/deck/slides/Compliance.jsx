import { SlideRoot, ShotFrame } from '../SlideKit'

// Compliance & security beat — the procurement / IT gatekeeper. On white.
// Focused on the single strongest proof point — the access trail — shown
// large on the right; beside it (not just below the title) on the left:
// eyebrow + title + copy + control badges. Built on SlideRoot directly
// (not SlideFrame) so the title can live INSIDE the left column and the
// image can center against the whole title+copy block, not just the copy.
const ACCESS_TRAIL = {
  src: '/shots/audit-activity.png',
  addr: 'app.schedule-ai / Audit Trail',
  line: 'Every record access — who, what, when, which device — logged and exportable. Nothing happens to a student\'s data without a trace.',
}

const BADGES = ['FERPA-aligned', 'Role-based access', 'Full audit trail', 'Row-level security', 'CSV / JSON export']

export default function Compliance() {
  return (
    <SlideRoot>
      <div className="mx-auto flex h-full max-w-[1480px] flex-col justify-center px-16 py-16">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12">
          <div data-anim className="md:col-span-4">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.26em] text-brand-600">
              Built for compliance
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink md:text-[2.75rem]">
              Proof your security team can click through.
            </h2>

            <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.24em] text-good">Access trail</p>
            <p className="mt-2 text-base leading-relaxed text-muted">{ACCESS_TRAIL.line}</p>

            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
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
          </div>

          <div data-anim className="md:col-span-8">
            <ShotFrame src={ACCESS_TRAIL.src} alt={ACCESS_TRAIL.line} addr={ACCESS_TRAIL.addr} size="lg" />
          </div>
        </div>
      </div>
    </SlideRoot>
  )
}
