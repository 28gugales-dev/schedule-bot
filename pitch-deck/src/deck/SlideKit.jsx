import { useRef } from 'react'
import { gsap, useGSAP } from './anim'

// Shared primitives for a standard, professional pitch deck: consistent slide
// frame (eyebrow + title + content), filled text boxes, and stat boxes. Motion
// is deliberately restrained (a soft rise + fade) — conventional, not cinematic.

export function SlideRoot({ children, className = '' }) {
  const root = useRef(null)
  useGSAP(
    () => {
      gsap.from('[data-anim]', { opacity: 0, y: 16, duration: 0.55, ease: 'power2.out', stagger: 0.07 })
    },
    { scope: root },
  )
  return (
    <div ref={root} className={`h-full w-full ${className}`}>
      {children}
    </div>
  )
}

// The standard content slide: section label, headline, then a content region.
// Generous, consistent margins so every slide aligns like a real deck.
export function SlideFrame({ eyebrow, title, children, kicker }) {
  return (
    <SlideRoot>
      {/* Vertical rhythm is height-responsive: tight enough to clear the chrome
          band on ~720–800px laptop/projector heights, generous on tall (≥880px)
          displays so big screens don't read sparse. Horizontal padding eases in
          on narrower widths. */}
      <div className="mx-auto flex h-full max-w-[1160px] flex-col justify-center px-10 py-6 sm:px-14 md:px-16 [@media(min-height:880px)]:py-14">
        {(eyebrow || title) && (
          <header>
            {eyebrow && (
              <p data-anim className="font-mono text-[11px] font-medium uppercase tracking-[0.26em] text-brand-600">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 data-anim className="mt-3 max-w-[22ch] font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink md:text-[3rem]">
                {title}
              </h2>
            )}
            {kicker && (
              <p data-anim className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted">
                {kicker}
              </p>
            )}
          </header>
        )}
        <div className="mt-7 [@media(max-height:760px)]:mt-4 [@media(min-height:880px)]:mt-12">{children}</div>
      </div>
    </SlideRoot>
  )
}

// A filled, bordered text box — the deck's core container.
export function Box({ children, className = '', accent = false }) {
  return (
    <div
      data-anim
      className={`rounded-xl border bg-panel p-6 [@media(max-height:760px)]:p-4 ${
        accent ? 'border-brand-200 bg-brand-50' : 'border-border'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// A box that leads with a big number/stat.
export function StatBox({ value, label, sub, tone = 'brand', className = '' }) {
  const toneColor = tone === 'warm' ? 'text-warm' : tone === 'good' ? 'text-good' : 'text-brand-600'
  return (
    <Box className={className}>
      <div className={`font-display text-5xl font-semibold tracking-tight tnum ${toneColor}`}>{value}</div>
      <div className="mt-2 font-sans text-base font-semibold text-ink">{label}</div>
      {sub && <p className="mt-1.5 text-sm leading-relaxed text-muted">{sub}</p>}
    </Box>
  )
}

// Even content grids without per-cell card chrome.
export function Grid({ cols = 3, children, className = '' }) {
  const map = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }
  return <div className={`grid grid-cols-1 gap-5 ${map[cols]} ${className}`}>{children}</div>
}

// Big centered editorial statement — for hero / hook / transition beats.
// Bricolage display + an optional serif-italic emphasis word (the look you liked).
export function Statement({ children, className = '' }) {
  return (
    <h2 data-anim className={`font-display text-6xl font-medium leading-[1.0] tracking-tight text-ink md:text-8xl ${className}`}>
      {children}
    </h2>
  )
}

// Serif-italic emphasis inside a display headline. One accent device, used sparingly.
export function Em({ children }) {
  return <em className="font-serif font-normal italic text-brand-300">{children}</em>
}

// A real product screenshot in browser chrome — the deck's single, consistent
// frame for app imagery (three window dots + a faux address pill + the shot).
// Tokens (border/panel/faint) so it sits right on either tone. `addr` is the
// address-bar text; `size` scales the chrome for hero vs. thumbnail use.
export function ShotFrame({ src, alt, addr = 'app.schedule-ai', size = 'lg', className = '', imgClass = '', children }) {
  const dots = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
  const barPad = size === 'sm' ? 'px-3 py-2' : 'px-4 py-3'
  return (
    <div
      data-anim
      className={`overflow-hidden rounded-2xl border border-border bg-panel shadow-[0_12px_40px_rgba(20,23,31,0.10)] ${className}`}
    >
      <div className={`flex items-center gap-3 border-b border-border ${barPad}`}>
        <div className="flex items-center gap-1.5">
          <span className={`${dots} rounded-full bg-border-strong`} />
          <span className={`${dots} rounded-full bg-border-strong`} />
          <span className={`${dots} rounded-full bg-border-strong`} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-border bg-canvas px-3.5 py-1">
            <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-faint" stroke="currentColor" strokeWidth={1.5} fill="none">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span className="truncate font-mono text-[11px] tracking-tight text-muted">{addr}</span>
          </div>
        </div>
        <div className={size === 'sm' ? 'w-[34px]' : 'w-[42px]'} />
      </div>
      {children ? children : <img src={src} alt={alt} className={`block w-full bg-canvas ${imgClass}`} loading="eager" />}
    </div>
  )
}
