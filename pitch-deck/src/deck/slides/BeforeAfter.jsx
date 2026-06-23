import { SlideFrame, Box, Grid, Em } from '../SlideKit'

// Before / After ROI beat — real per-waiver numbers: 2–3 minutes to review a
// waiver by hand vs. 10–15 seconds with Schedule AI. Ranges shown honestly; the
// midpoint multiplier (~12×) ties the seconds back to a term's worth of waivers.
export default function BeforeAfter() {
  return (
    <SlideFrame eyebrow="Before / After" title="Minutes per waiver — down to seconds.">
      <Grid cols={2}>
        {/* BEFORE — the manual reality. Warm accent = the cost. */}
        <Box>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-warm">By hand</p>
          <div className="mt-5 font-display text-6xl font-semibold tracking-tight tnum text-warm">2&ndash;3 min</div>
          <p className="mt-4 text-base leading-relaxed text-muted">to review a waiver, manually</p>
        </Box>

        {/* AFTER — Schedule AI. Accent panel + green = the win. */}
        <Box accent>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-good">With Schedule AI</p>
          <div className="mt-5 font-display text-6xl font-semibold tracking-tight tnum text-good">10&ndash;15 sec</div>
          <p className="mt-4 text-base leading-relaxed text-muted">per waiver, reviewed by you</p>
        </Box>
      </Grid>

      {/* The punch line — honest midpoint multiplier, tied to volume. */}
      <p
        data-anim
        className="mt-10 text-center font-display text-2xl font-medium leading-snug tracking-tight text-ink md:text-[1.75rem]"
      >
        About <Em>12&times; faster</Em> per waiver — hours of a counselor&apos;s term, back.
      </p>
    </SlideFrame>
  )
}
