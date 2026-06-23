import { SlideFrame, Box, Grid } from '../SlideKit'

// Original Stakes beat, on white: left headline + three cost tiles (light panels).
const COSTS = [
  {
    k: 'Students',
    v: 'in the wrong courses',
    d: 'Misplacements surface weeks into the term — after the add/drop window has already closed.',
  },
  {
    k: 'Graduation',
    v: 'requirements missed',
    d: 'A single overlooked credit can cost a student their on-time diploma.',
  },
  {
    k: 'Counselors',
    v: 'burning out',
    d: 'Manual scheduling is the office’s biggest time sink every single fall.',
  },
]

export default function Stakes() {
  return (
    <SlideFrame eyebrow="Why it matters" title="The cost of getting it wrong is real.">
      <Grid cols={3}>
        {COSTS.map((c) => (
          <Box key={c.k}>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-warm">{c.k}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{c.v}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{c.d}</p>
          </Box>
        ))}
      </Grid>
    </SlideFrame>
  )
}
