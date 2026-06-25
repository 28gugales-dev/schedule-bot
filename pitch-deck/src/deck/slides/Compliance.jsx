import { useState, useEffect, useRef } from 'react'
import { SlideFrame, ShotFrame } from '../SlideKit'
import { gsap } from '../anim'

// Compliance & security beat — the procurement / IT gatekeeper. On white.
// "Show, don't tell": instead of a row of small thumbnails, ONE big screen that
// auto-plays the click-through their security reviewer would actually do —
// the audit trail, then drilling into a single student's full AI-scored record.
// Two real screens, same 3:2 frame, crossfading every 4s with a stacked-deck
// look behind. Then a lean control-badge strip.
const FRAMES = [
  {
    src: '/shots/audit-trail.png',
    addr: 'app.schedule-ai / Audit Trail',
    label: 'The access trail',
    line: 'Every record access — who, what, when, which device — logged and exportable.',
  },
  {
    src: '/shots/ai-reasoning.png',
    addr: 'app.schedule-ai / AI Reasoning',
    label: 'Open any AI decision',
    line: 'Every recommendation shows its score breakdown, the rules it checked, and a confidence number. No black box.',
  },
]

const ROTATE_MS = 6000

const BADGES = ['FERPA-aligned', 'Role-based access', 'Full audit trail', 'Row-level security', 'CSV / JSON export']

// Auto-advancing screenshot deck. The active frame rides on top in browser
// chrome; two offset ghost panels sit behind it for a stacked-card look. Both
// images stay mounted (preloaded) and crossfade on opacity, so the fixed 3:2
// frame never jumps. setTimeout keyed on `i` means a manual dot-click also
// resets the 4s clock. Reduced-motion swaps instantly but keeps rotating —
// the second frame is information, not decoration.
function ScreenDeck({ active, setActive }) {
  const [reduce, setReduce] = useState(false)
  const imgRefs = useRef([])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduce(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Dwell on each frame, then advance. Keyed on `active`, so a manual dot-click
  // also restarts the timer (no double-advance).
  useEffect(() => {
    const id = setTimeout(() => setActive((i) => (i + 1) % FRAMES.length), ROTATE_MS)
    return () => clearTimeout(id)
  }, [active, setActive])

  // The swap: a soft cross-dissolve with a gentle zoom — incoming eases up from
  // a touch larger, outgoing eases away slightly larger, both clipped by the
  // frame's overflow. Reduced-motion cuts straight to the next frame.
  useEffect(() => {
    imgRefs.current.forEach((el, i) => {
      if (!el) return
      gsap.killTweensOf(el)
      if (reduce) {
        gsap.set(el, { opacity: i === active ? 1 : 0, scale: 1 })
      } else if (i === active) {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 1.05 },
          { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.inOut' },
        )
      } else {
        gsap.to(el, { opacity: 0, scale: 1.03, duration: 0.85, ease: 'power2.inOut' })
      }
    })
  }, [active, reduce])

  return (
    <div data-anim className="relative">
      {/* Stacked-deck ghosts — peek out behind the live frame for depth */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl border border-border bg-panel shadow-[0_10px_30px_rgba(20,23,31,0.07)]"
        style={{ transform: 'translate(18px, 16px) rotate(2deg)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl border border-border bg-panel shadow-[0_8px_24px_rgba(20,23,31,0.06)]"
        style={{ transform: 'translate(-14px, 10px) rotate(-1.6deg)' }}
      />

      {/* Live frame — browser chrome with an address bar that tracks the screen */}
      <ShotFrame addr={FRAMES[active].addr} className="relative">
        <div className="relative aspect-[1.89] w-full bg-canvas">
          {FRAMES.map((f, i) => (
            <img
              key={f.src}
              ref={(el) => { imgRefs.current[i] = el }}
              src={f.src}
              alt={f.line}
              loading="eager"
              style={{ opacity: 0, willChange: 'opacity, transform' }}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ))}
        </div>
      </ShotFrame>
    </div>
  )
}

export default function Compliance() {
  const [active, setActive] = useState(0)
  const frame = FRAMES[active]

  return (
    <SlideFrame
      eyebrow="Built for compliance"
      title="Proof your security team can click through."
    >
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1.35fr_0.65fr]">
        {/* Left — the big, live click-through */}
        <ScreenDeck active={active} setActive={setActive} />

        {/* Right — caption tracks the on-screen frame; dots show / drive rotation */}
        <div data-anim className="flex flex-col">
          <div className="flex items-center gap-2.5">
            {FRAMES.map((f, i) => (
              <button
                key={f.src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show ${f.label}`}
                aria-current={i === active}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === active ? 'w-7 bg-brand-600' : 'w-2 bg-border-strong hover:bg-faint'
                }`}
              />
            ))}
            <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              {active + 1} / {FRAMES.length}
            </span>
          </div>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.24em] text-brand-600">{frame.label}</p>
          <p className="mt-2.5 text-lg leading-relaxed text-muted">{frame.line}</p>
        </div>
      </div>

      {/* Lean control-badge strip — named standards only (no padlock soup). */}
      <div data-anim className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {BADGES.map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-good" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {b}
          </span>
        ))}
      </div>
    </SlideFrame>
  )
}
