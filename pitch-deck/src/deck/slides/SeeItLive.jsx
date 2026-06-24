import { SlideRoot, Em, ShotFrame } from '../SlideKit'

// The handoff beat (blue) — the presenter's cue to alt-tab into the REAL app.
// No iframe: a static browser-chrome panel (ShotFrame children slot) shows the
// live URL, the headline gives the line, the button is the spoken "let's go".
// Sized to FIT 16:9 (the giant Statement primitive overflowed the button off the
// bottom) — a moderate display headline keeps the CTA on-screen. The .cta-btn
// class is inverted to dark-on-white on the blue field by [data-tone="blue"]
// (attribute+class specificity overrides the bg-brand-600/text-white utilities).
export default function SeeItLive() {
  return (
    <SlideRoot>
      <div className="mx-auto flex h-full max-w-[1160px] flex-col items-center justify-center px-16 text-center">
        <p data-anim className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand-600">
          See it live
        </p>

        <h2
          data-anim
          className="mt-6 font-display text-5xl font-medium leading-[1.04] tracking-tight text-ink md:text-6xl"
        >
          Let&apos;s open the <Em>real</Em> thing.
        </h2>

        <p data-anim className="mt-6 max-w-[50ch] text-lg leading-relaxed text-muted md:text-xl">
          Everything you just saw — running live. I&apos;ll walk you through it.
        </p>

        {/* static browser-chrome panel showing the live URL — no iframe, no img */}
        <ShotFrame addr="app.schedule-ai" className="mt-8 w-full max-w-[500px]">
          <div className="flex flex-col items-center gap-1.5 px-8 py-7">
            <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand-600">
              Live workspace
            </span>
            <p className="font-display text-[1.7rem] font-semibold tracking-tight text-ink">app.schedule-ai</p>
          </div>
        </ShotFrame>

        <a
          data-anim
          href="http://localhost:5173/admin?demo=admin&theme=light&skin=enterprise"
          className="cta-btn mt-7 inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-3.5 font-display text-base font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-px hover:bg-brand-700 hover:shadow-[0_8px_30px_rgba(20,23,31,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Open the app
        </a>
      </div>
    </SlideRoot>
  )
}
