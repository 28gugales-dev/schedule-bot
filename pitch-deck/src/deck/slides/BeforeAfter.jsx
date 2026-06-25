import { SlideFrame, Box, Grid, Em } from '../SlideKit'

// Data-security beat — the infra/procurement trust slide. Four concrete,
// named facts (not badge soup): FERPA, SOC 2 Type II + ISO 27001 hosting,
// AES-256 at rest / TLS in transit, and Google OAuth (no passwords stored).
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
      <Grid cols={2} className="gap-x-6 gap-y-5">
        {FACTS.map((f) => (
          <Box key={f.stat}>
            {/* Rhythm: eyebrow + stat + sub read as one tight unit (the named
                fact); the explainer line sits a clear step below it. */}
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-good">{f.eyebrow}</p>
            <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">{f.stat}</div>
            <p className="mt-1.5 font-mono text-[12px] tracking-tight text-muted">{f.sub}</p>
            <p className="mt-3.5 text-[13.5px] leading-snug text-muted">{f.line}</p>
          </Box>
        ))}
      </Grid>

      <p
        data-anim
        className="mt-6 text-center font-display text-2xl font-medium leading-snug tracking-tight text-ink md:text-[1.75rem] [@media(max-height:760px)]:mt-3 [@media(min-height:880px)]:mt-10"
      >
        Security your <Em>IT director</Em> signs off on, not just your counselors.
      </p>
    </SlideFrame>
  )
}
