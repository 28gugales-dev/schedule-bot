import { SlideRoot } from '../SlideKit'
import AppFrame from '../components/AppFrame'

// The "show, don't tell" beat — the LIVE app embedded, not a screenshot. Compact
// header so the browser-framed embed takes all remaining height (fills cleanly at
// any window size); the app renders at desktop width and stays crisp. You can
// scroll/click it during the pitch. Requires the app dev server on :5173 — the
// ?demo=admin param seeds the demo role/theme/skin.
const APP_URL = 'http://localhost:5173/admin?demo=admin&theme=light&skin=enterprise'

export default function Demo() {
  return (
    <SlideRoot>
      <div className="flex h-full w-full flex-col px-10 py-8 md:px-14">
        <header>
          <p data-anim className="font-mono text-[11px] font-medium uppercase tracking-[0.26em] text-brand-600">
            See it in action
          </p>
          <h2 data-anim className="mt-2.5 font-display text-3xl font-semibold leading-[1.06] tracking-tight text-ink md:text-[2.5rem]">
            The real product, doing real work.
          </h2>
        </header>

        {/* Browser-framed live embed — flexes to fill the remaining height. */}
        <div
          data-anim
          className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-[0_18px_50px_rgba(20,23,31,0.12)]"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-canvas px-3.5 py-1">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-good" />
                <span className="font-mono text-[11px] tracking-tight text-muted">app.schedule-ai / Review Queue · live</span>
              </div>
            </div>
            <div className="w-[42px]" />
          </div>
          <div className="relative min-h-0 flex-1">
            <AppFrame src={APP_URL} title="Schedule AI — live review queue" />
          </div>
        </div>

        <p data-anim className="mt-3.5 text-center text-[13px] leading-relaxed text-muted">
          The live app — scroll and click it. An AI recommendation &amp; confidence on every request; the counselor makes the final call.
        </p>
      </div>
    </SlideRoot>
  )
}
