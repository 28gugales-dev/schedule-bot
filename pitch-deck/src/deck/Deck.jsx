import { useCallback, useEffect, useState } from 'react'
import { slides } from './slides'
import AuroraGradient from './components/AuroraGradient'
import BlueSurface from './components/BlueSurface'

// The deck engine: full-screen white stage, keyboard-driven, presenter-mode
// notes. The slide layer remounts by key on navigation so each slide replays its
// (restrained) enter animation.
export default function Deck() {
  const total = slides.length
  const [index, setIndex] = useState(0)
  const [notes, setNotes] = useState(false)

  const go = useCallback(
    (n) => setIndex((i) => Math.min(total - 1, Math.max(0, typeof n === 'function' ? n(i) : n))),
    [total],
  )

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight', ' ', 'PageDown'].includes(e.key) || e.key === 'j') {
        e.preventDefault()
        go((i) => i + 1)
      } else if (['ArrowLeft', 'PageUp'].includes(e.key) || e.key === 'k') {
        e.preventDefault()
        go((i) => i - 1)
      } else if (e.key === 'Home') {
        go(0)
      } else if (e.key === 'End') {
        go(total - 1)
      } else if (e.key === 'n' || e.key === 'N' || e.key === 's' || e.key === 'S') {
        setNotes((v) => !v)
      } else if (e.key === 'Escape') {
        setNotes(false)
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, total, toggleFullscreen])

  const current = slides[index]
  const Slide = current.Component
  const nextSlide = slides[index + 1]
  const blue = current.tone === 'blue'

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-canvas">
      <AuroraGradient />
      <BlueSurface active={blue} />

      {/* progress rail — track + fill flip to light on blue beats */}
      <div className="absolute inset-x-0 top-0 z-30 flex gap-1.5 px-6 pt-5">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`h-[3px] flex-1 overflow-hidden rounded-full transition-colors duration-500 ${blue ? 'bg-white/25' : 'bg-border'}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${blue ? 'bg-white' : 'bg-brand-600'}`}
              style={{ width: i <= index ? '100%' : '0%', opacity: i === index ? 1 : i < index ? 0.5 : 0 }}
            />
          </div>
        ))}
      </div>

      {/* slide stage — inset to a chrome-safe band so no slide's content ever
          slides under the top progress rail (~28px) or the bottom chrome bar
          (~56px). The full-bleed background layers (Aurora / BlueSurface) stay
          at inset-0 behind this. data-tone recolors every primitive via the
          token remap. */}
      <div key={index} data-tone={blue ? 'blue' : 'white'} className="absolute inset-x-0 top-8 bottom-14 z-10">
        <Slide />
      </div>

      {/* nav arrows — light on blue beats */}
      <button
        aria-label="Previous slide"
        onClick={() => go((i) => i - 1)}
        disabled={index === 0}
        className={`absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full px-3 pb-2 pt-1 text-3xl transition disabled:pointer-events-none disabled:opacity-0 ${
          blue ? 'text-white/55 hover:bg-white/10 hover:text-white' : 'text-faint hover:bg-panel hover:text-ink'
        }`}
      >
        ‹
      </button>
      <button
        aria-label="Next slide"
        onClick={() => go((i) => i + 1)}
        disabled={index === total - 1}
        className={`absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full px-3 pb-2 pt-1 text-3xl transition disabled:pointer-events-none disabled:opacity-0 ${
          blue ? 'text-white/55 hover:bg-white/10 hover:text-white' : 'text-faint hover:bg-panel hover:text-ink'
        }`}
      >
        ›
      </button>

      {/* bottom chrome — border + text flip to light on blue beats */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-7 py-4 font-mono text-[11px] uppercase tracking-widest transition-colors duration-500 ${
          blue ? 'border-t border-white/15 text-white/55' : 'border-t border-border/70 text-faint'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <span className={`font-sans font-bold normal-case tracking-normal ${blue ? 'text-white' : 'text-ink'}`}>
            Schedule AI
          </span>
          <span className={blue ? 'text-white/30' : 'text-border-strong'}>·</span>
          <span>{current.label}</span>
        </span>
        <div className="flex items-center gap-5">
          <button
            onClick={() => setNotes((v) => !v)}
            className={`tracking-widest transition ${blue ? 'hover:text-white' : 'hover:text-ink'}`}
          >
            notes · N
          </button>
          <span className={`tnum ${blue ? 'text-white/75' : 'text-muted'}`}>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* speaker notes */}
      {notes && (
        <div className="absolute inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 p-7 shadow-[0_-12px_40px_rgba(20,23,31,0.10)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1160px] items-start gap-10">
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-brand-600">
                Speaker notes — {current.label}
              </p>
              <p className="mt-3 max-w-[72ch] whitespace-pre-line text-sm leading-relaxed text-muted">{current.notes}</p>
            </div>
            <div className="w-52 shrink-0 border-l border-border pl-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-faint">Up next</p>
              <p className="mt-3 text-sm font-semibold text-ink">{nextSlide ? nextSlide.label : 'End of deck'}</p>
            </div>
          </div>
          <button
            onClick={() => setNotes(false)}
            className="absolute right-5 top-4 font-mono text-[11px] uppercase tracking-widest text-faint transition hover:text-ink"
          >
            close · esc
          </button>
        </div>
      )}
    </div>
  )
}
