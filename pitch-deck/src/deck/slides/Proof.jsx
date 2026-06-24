import { SlideRoot, Em } from '../SlideKit'

// Proportional to the (honest) midpoint of each range — 2.5 min vs 12.5 sec —
// just to size the bars; the labels still show the real ranges, not the
// midpoint. Floored so the "after" bar stays visible at this scale (~12x).
const BAR_MAX_PX = 200
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
// Just the core claim stated plainly: a waiver that took 2–3 minutes to review by
// hand now takes 10–15 seconds. The deck's killer metric, said out loud — and
// shown as a bar chart so the ~12x gap reads instantly, not just numerically.
export default function Proof() {
  return (
    <SlideRoot>
      <div className="mx-auto flex h-full max-w-[1160px] flex-col items-center justify-center px-16 text-center">
        <p data-anim className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand-600">
          The difference
        </p>

        <h2
          data-anim
          className="mt-7 font-display text-5xl font-medium leading-[1.05] tracking-tight text-ink md:text-7xl"
        >
          A waiver took 2&ndash;3 minutes.
          <br />
          Now it takes <Em>10&ndash;15 seconds</Em>.
        </h2>

        <div data-anim className="mt-10 flex items-end justify-center gap-14">
          <Bar value="2–3 min" height={BAR_MAX_PX} label="By hand" tone="warm" />
          <Bar value="10–15 sec" height={afterHeight} label="With Schedule AI" tone="good" />
        </div>

        <p data-anim className="mt-8 max-w-[52ch] text-lg leading-relaxed text-muted md:text-xl">
          The same careful review — without the hours of manual work behind it.
        </p>
      </div>
    </SlideRoot>
  )
}
