import { SlideFrame, Box, Grid } from '../SlideKit'
import StatCounter from '../components/StatCounter'

// Pricing & ROI beat, on white. Deliberately not a pricing matrix — one price,
// one payback. Left: a single accent price panel (the ask). Right: a mirrored
// panel that turns the cost into a return. Both lead with a hero number so the
// two cells read as a balanced pair. All figures are placeholders.
const PRICE_PER_SEAT = 1200 // mock — $ / counselor / year
const HOURS_SAVED = 40 // mock — hours saved per counselor per term

export default function Pricing() {
  return (
    <SlideFrame eyebrow="Pricing" title="Priced to pay for itself.">
      <Grid cols={2}>
        {/* Left — the ask: one price, all-in. */}
        <Box accent className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand-600">
              Per seat, all-in
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              {/* mock */}
              <span className="font-display text-6xl font-semibold tracking-tight tnum text-ink">
                ${PRICE_PER_SEAT.toLocaleString()}
              </span>
              <span className="font-display text-2xl font-medium text-muted">/yr</span>
            </div>
            <p className="mt-2 text-sm text-muted">per counselor</p>
          </div>
          <p className="mt-8 border-t border-brand-200 pt-6 text-base leading-relaxed text-muted">
            Everything included — onboarding, support, and every update. No
            per-student fees, no surprises at renewal.
          </p>
        </Box>

        {/* Right — the return: a mirrored hero number, then the payback. */}
        <Box className="flex flex-col justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand-600">
              The return
            </p>
            <div className="mt-4 flex items-baseline gap-2">
              {/* mock */}
              <StatCounter
                value={HOURS_SAVED}
                className="font-display text-6xl font-semibold tracking-tight text-brand-600"
              />
              <span className="font-display text-2xl font-medium text-muted">hrs</span>
            </div>
            <p className="mt-2 text-sm text-muted">saved per counselor, every term</p>
          </div>
          <p className="mt-8 border-t border-border pt-6 text-base leading-relaxed text-muted">
            At a counselor’s loaded hourly cost, the seat pays for itself in the{' '}
            <span className="font-semibold text-good">first week</span> — the rest of
            the year is upside.
          </p>
        </Box>
      </Grid>
    </SlideFrame>
  )
}
