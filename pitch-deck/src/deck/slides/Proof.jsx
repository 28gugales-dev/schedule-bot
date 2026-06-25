import { SlideRoot, Em } from '../SlideKit'

// Proportional to the (honest) midpoint of each range — 2.5 min vs 12.5 sec —
// just to size the bars; the labels still show the real ranges, not the
// midpoint. Floored so the "after" bar stays visible at this scale (~12x).
const BAR_MAX_PX = 180
const BEFORE_SEC = 150
const AFTER_SEC = 12.5
const afterHeight = Math.max(14, Math.round((AFTER_SEC / BEFORE_SEC) * BAR_MAX_PX))

function Bar({ value, height, label, tone }) {
  const textColor = tone === 'warm' ? 'text-warm' : 'text-good'
  const barColor = tone === 'warm' ? 'bg-warm/80' : 'bg-good'
  return (
    <div className="flex flex-col items-center">
      <span className={`mb-2 font-display text-lg font-semibold tnum ${textColor}`}>{value}</span>
      <div className={`w-20 rounded-t-lg ${barColor}`} style={{ height }} />
      <span className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{label}</span>
    </div>
  )
}

// The difference beat (blue) — no quote, no testimonial (no deployed schools yet).
// The per-waiver claim, said plainly and shown as a ~12x bar chart, then scaled to
// the annual reality: SFHS's one-month manual window vs. ~5,000 waivers/year — the
// same ~12x gap, now measured in staff hours (250 hrs by hand → ~20 hrs with us).
export default function Proof() {
  return (
    <SlideRoot>
      <div className="mx-auto flex h-full max-w-[1180px] flex-col justify-center px-16">
        <p data-anim className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand-600">
          The difference
        </p>

        <h2
          data-anim
          className="mt-5 max-w-[24ch] font-display text-4xl font-medium leading-[1.06] tracking-tight text-ink md:text-6xl"
        >
          A waiver took 2&ndash;3 minutes. Now it takes <Em>10&ndash;15 seconds</Em>.
        </h2>

        <div className="mt-12 grid grid-cols-1 items-center gap-14 md:grid-cols-[auto_1fr]">
          {/* Per-waiver speed — the bar chart, anchored far left */}
          <div data-anim className="flex items-end justify-center gap-12 md:justify-start">
            <Bar value="2–3 min" height={BAR_MAX_PX} label="By hand" tone="warm" />
            <Bar value="10–15 sec" height={afterHeight} label="With Schedule AI" tone="good" />
          </div>

          {/* Annual volume — the same gap, scaled to SFHS's real workload */}
          <div className="flex flex-col gap-6">
            <p data-anim className="max-w-[48ch] text-lg leading-relaxed text-muted">
              Today, SFHS opens a single <span className="font-semibold text-ink">one-month</span> window to
              clear waivers by hand — then nothing until it reopens for the start-of-year rush. Over{' '}
              <span className="font-semibold text-ink">5,000 waivers</span> move through every year.
            </p>

            <div data-anim className="rounded-xl border border-border bg-panel p-6">
              <div className="flex items-center gap-5">
                <div className="flex-1">
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">By hand</div>
                  <div className="mt-1.5 font-display text-4xl font-semibold tnum text-warm">
                    250<span className="ml-1 text-xl font-medium">hrs/yr</span>
                  </div>
                  <div className="mt-1.5 font-mono text-[12px] tnum text-muted">5,000 × 3 min = 15,000 min</div>
                </div>

                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 shrink-0 text-faint"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>

                <div className="flex-1">
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">With Schedule AI</div>
                  <div className="mt-1.5 font-display text-4xl font-semibold tnum text-good">
                    ~20<span className="ml-1 text-xl font-medium">hrs/yr</span>
                  </div>
                  <div className="mt-1.5 font-mono text-[12px] tnum text-muted">5,000 × 15 sec = 1,250 min</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p data-anim className="mt-9 text-lg leading-relaxed text-muted">
          The same careful review — about <span className="font-semibold text-ink">230 staff hours</span> back
          every year.
        </p>
      </div>
    </SlideRoot>
  )
}
