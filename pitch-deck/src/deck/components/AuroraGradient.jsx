import { useRef } from 'react'
import { gsap, useGSAP } from '../anim'

// Soft blue aurora on white — the subtle, premium wash you liked. Mounted once
// in the deck shell and persists while slides swap above it. Low opacity so it
// reads as ambient light on a white page, never as a colored background. Pure
// transform drift, disabled under prefers-reduced-motion.
export default function AuroraGradient() {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('.blob-a', { xPercent: 12, yPercent: -8, scale: 1.15, duration: 16, ease: 'sine.inOut', repeat: -1, yoyo: true })
        gsap.to('.blob-b', { xPercent: -14, yPercent: 10, scale: 1.2, duration: 20, ease: 'sine.inOut', repeat: -1, yoyo: true })
        gsap.to('.blob-c', { xPercent: 9, yPercent: 12, scale: 1.1, duration: 24, ease: 'sine.inOut', repeat: -1, yoyo: true })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-canvas">
      <div
        className="blob-a absolute -left-[12%] -top-[18%] h-[72vh] w-[72vh] rounded-full opacity-70 blur-[70px]"
        style={{ background: 'radial-gradient(closest-side, rgba(74,147,234,0.30), transparent 70%)' }}
      />
      <div
        className="blob-b absolute -right-[10%] top-[6%] h-[58vh] w-[58vh] rounded-full opacity-60 blur-[80px]"
        style={{ background: 'radial-gradient(closest-side, rgba(125,180,240,0.28), transparent 72%)' }}
      />
      <div
        className="blob-c absolute -bottom-[20%] left-[22%] h-[64vh] w-[64vh] rounded-full opacity-50 blur-[90px]"
        style={{ background: 'radial-gradient(closest-side, rgba(10,132,255,0.16), transparent 72%)' }}
      />
    </div>
  )
}
