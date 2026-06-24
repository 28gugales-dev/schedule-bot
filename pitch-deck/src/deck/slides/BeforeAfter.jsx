import { SlideFrame, Em } from '../SlideKit'

// Data-security beat — the infra/procurement trust slide. Four concrete,
// named facts (not badge soup): FERPA, SOC 2 Type II + ISO 27001 hosting,
// AES-256 at rest / TLS in transit, and Google OAuth (no passwords stored).
//
// Sizing here is fluid (clamp()) rather than the shared Box/Grid's fixed
// padding+breakpoints — this slide is the densest in the deck (4 cards x 4
// lines + header + punchline), so on a shorter real-world window it was the
// one slide actually clipped by the deck's overflow-hidden stage. clamp()
// shrinks padding/gaps/type continuously with viewport height instead of
// only at fixed breakpoints, so it always fits instead of overflowing.
const FACTS = [
  {
    eyebrow: 'Student records',
    stat: 'FERPA',
    sub: 'compliant by design',
    line: 'Access controls, audit trails, and data minimization built in throughout — not bolted on.',
  },
  {
    eyebrow: 'Hosting infrastructure',
    stat: 'SOC 2 Type II',
    sub: '+ ISO 27001 certified',
    line: 'Student data lives on infrastructure independently audited to both standards.',
  },
  {
    eyebrow: 'Encryption',
    stat: 'AES-256',
    sub: 'at rest · TLS in transit',
    line: 'Every record, every transfer — encrypted end to end, always.',
  },
  {
    eyebrow: 'Sign-in',
    stat: 'Google OAuth',
    sub: 'school accounts only',
    line: 'Students and staff log in with their existing school Google account. We never see or store a password.',
  },
]

export default function BeforeAfter() {
  return (
    <SlideFrame eyebrow="Data security" title="Built on infrastructure your IT team already trusts.">
      <div className="grid grid-cols-1 gap-[clamp(0.6rem,1.6vh,1.25rem)] md:grid-cols-2">
        {FACTS.map((f) => (
          <div
            key={f.stat}
            data-anim
            className="rounded-xl border border-border bg-panel p-[clamp(0.85rem,2.2vh,1.5rem)]"
          >
            <p className="font-mono text-[clamp(9px,0.75vw,11px)] uppercase tracking-[0.28em] text-good">{f.eyebrow}</p>
            <div className="mt-[clamp(0.4rem,1vh,1rem)] font-display text-[clamp(1.3rem,2.4vw,2.25rem)] font-semibold tracking-tight text-ink">
              {f.stat}
            </div>
            <p className="mt-1 font-mono text-[clamp(10px,0.85vw,12px)] tracking-tight text-muted">{f.sub}</p>
            <p className="mt-[clamp(0.35rem,0.9vh,0.75rem)] text-[clamp(11px,0.95vw,13.5px)] leading-relaxed text-muted">
              {f.line}
            </p>
          </div>
        ))}
      </div>

      <p
        data-anim
        className="mt-[clamp(1rem,2.8vh,2.5rem)] text-center font-display text-[clamp(1.1rem,1.9vw,1.75rem)] font-medium leading-snug tracking-tight text-ink"
      >
        Security your <Em>IT director</Em> signs off on, not just your counselors.
      </p>
    </SlideFrame>
  )
}
