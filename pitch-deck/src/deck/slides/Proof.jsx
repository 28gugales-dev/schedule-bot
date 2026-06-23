import { SlideRoot, Em } from '../SlideKit'

// The difference beat (blue) — no quote, no testimonial (no deployed schools yet).
// Just the core claim stated plainly: a waiver that took 2–3 minutes to review by
// hand now takes 10–15 seconds. The deck's killer metric, said out loud.
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

        <p data-anim className="mt-8 max-w-[52ch] text-lg leading-relaxed text-muted md:text-xl">
          The same careful review — without the hours of manual work behind it.
        </p>
      </div>
    </SlideRoot>
  )
}
