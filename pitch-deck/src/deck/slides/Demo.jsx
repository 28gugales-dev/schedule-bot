import { SlideFrame } from '../SlideKit'

// The "show, don't tell" beat: a browser-chrome-framed screen that stands in for
// the live product demo. The frame is premium but obviously a placeholder.
//
// PLACEHOLDER: the aspect-video body is where the real screen-recording footage
// drops in — replace the play-affordance block below with a <video>/<img> of the
// actual flow (upload transcript → parsed courses & GPA → schedule → audit view).
export default function Demo() {
  return (
    <SlideFrame eyebrow="See it in action" title="The real product, doing real work.">
      <div className="mx-auto w-full max-w-[760px]">
        {/* Browser chrome */}
        <div
          data-anim
          className="overflow-hidden rounded-2xl border border-border bg-panel shadow-[0_8px_30px_rgba(20,23,31,0.06)]"
        >
          {/* Top bar: three window dots + a faux address pill */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-border bg-canvas px-3.5 py-1">
                <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-faint" stroke="currentColor" strokeWidth={1.5} fill="none">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <span className="truncate font-mono text-[11px] tracking-tight text-muted">
                  app.schedule-ai<span className="text-faint"> / Transcript to Schedule</span>
                </span>
              </div>
            </div>
            {/* spacer to balance the dots, keeps the pill optically centered */}
            <div className="w-[42px]" />
          </div>

          {/* Screen body: labeled 16:9 placeholder */}
          <div className="relative flex aspect-video items-center justify-center bg-panel-2">
            <div className="flex flex-col items-center">
              {/* Play affordance: triangle in a ring — brand blue only */}
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-200 bg-canvas shadow-sm">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 text-brand-600" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.28em] text-faint">
                Live product demo
              </p>
            </div>
          </div>
        </div>

        {/* One-line caption: the flow the footage will show */}
        <p data-anim className="mt-5 text-center text-sm leading-relaxed text-muted">
          Real screen recording: upload transcript <span className="text-brand-400">→</span> parsed
          courses &amp; GPA <span className="text-brand-400">→</span> schedule generated{' '}
          <span className="text-brand-400">→</span> audit view.
        </p>
      </div>
    </SlideFrame>
  )
}
