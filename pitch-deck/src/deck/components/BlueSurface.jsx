import { useRef } from 'react'
import { gsap, useGSAP } from '../anim'

// Saturated brand surface for the "emphasis beat" slides. Deep brand gradient
// (#0058b8 → #0a4794, the product blue) with soft lighter glows for depth, so it
// reads as a lit field rather than a flat fill. Sits above the white aurora and
// crossfades in via `active` (opacity). Drift is disabled under reduced-motion.
export default function BlueSurface({ active }) {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('.glow-a', { xPercent: 10, yPercent: 8, scale: 1.15, duration: 18, ease: 'sine.inOut', repeat: -1, yoyo: true })
        gsap.to('.glow-b', { xPercent: -12, yPercent: -10, scale: 1.2, duration: 22, ease: 'sine.inOut', repeat: -1, yoyo: true })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-700 ease-out"
      style={{
        opacity: active ? 1 : 0,
        background: 'linear-gradient(135deg, #0058b8 0%, #0a4794 58%, #0d3a76 100%)',
      }}
    >
      <div
        className="glow-a absolute -left-[10%] -top-[16%] h-[70vh] w-[70vh] rounded-full opacity-70 blur-[80px]"
        style={{ background: 'radial-gradient(closest-side, rgba(86,160,255,0.55), transparent 70%)' }}
      />
      <div
        className="glow-b absolute -right-[12%] bottom-[2%] h-[66vh] w-[66vh] rounded-full opacity-55 blur-[90px]"
        style={{ background: 'radial-gradient(closest-side, rgba(120,190,255,0.40), transparent 72%)' }}
      />
      {/* subtle top sheen so headlines sit on a slightly brighter band */}
      <div
        className="absolute inset-x-0 top-0 h-1/2"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent)' }}
      />
    </div>
  )
}
