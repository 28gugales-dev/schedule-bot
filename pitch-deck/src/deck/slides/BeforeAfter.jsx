import { SlideFrame, Box, Grid, Em } from '../SlideKit'
import StatCounter from '../components/StatCounter'

// Before / After ROI beat. Two-column split: the manual past (warm/negative) vs
// Schedule AI (brand/good). The numbers ARE the argument — counted up, not stated
// (Warikoo: don't claim the metric, perform it). Mock figures, plausibly sourced.
export default function BeforeAfter() {
  return (
    <SlideFrame eyebrow="Before / After" title="Hours of manual work, gone.">
      <Grid cols={2}>
        {/* BEFORE — the manual reality. Plain panel, warm accent = the cost. */}
        <Box>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-warm">Before</p>
          <div className="mt-5 font-display text-6xl font-semibold tracking-tight text-warm">
            <StatCounter value={3} decimals={0} suffix="+ hrs" />
          </div>
          <p className="mt-4 text-base leading-relaxed text-muted">
            per schedule, by hand {/* mock */}
          </p>
        </Box>

        {/* AFTER — Schedule AI. Accent panel + green number = the win. */}
        <Box accent>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-good">After</p>
          <div className="mt-5 font-display text-6xl font-semibold tracking-tight text-good">
            <StatCounter value={8} decimals={0} suffix=" min" />
          </div>
          <p className="mt-4 text-base leading-relaxed text-muted">
            with Schedule AI, reviewed by you {/* mock */}
          </p>
        </Box>
      </Grid>

      {/* The punch line — one emphasized number that lands the ROI. */}
      <p
        data-anim
        className="mt-10 text-center font-display text-2xl font-medium leading-snug tracking-tight text-ink md:text-[1.75rem]"
      >
        That&apos;s <Em>20&times; faster</Em> — hours of a counselor&apos;s week, back. {/* mock */}
      </p>
    </SlideFrame>
  )
}
