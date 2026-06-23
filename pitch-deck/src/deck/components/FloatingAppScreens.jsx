import { useRef } from 'react'
import { gsap, useGSAP } from '../anim'

// The "Meet" reveal backdrop: real product screens in window cards, drifting and
// gently tilted around the wordmark. Sized large with strong borders + shadows so
// each reads clearly as the app against the white slide (light UI needs the lift).
const SCREENS = [
  { src: '/shots/review-queue.png',   pos: 'left-[-6%] top-[3%]     w-[clamp(280px,31vw,540px)]', rot: -5, f: 'fa-1' },
  { src: '/shots/audit-overview.png', pos: 'right-[-6%] top-[2%]    w-[clamp(280px,31vw,540px)]', rot: 5,  f: 'fa-2' },
  { src: '/shots/student-intake.png', pos: 'left-[-7%] top-[44%]    w-[clamp(220px,24vw,420px)]', rot: 4,  f: 'fa-3' },
  { src: '/shots/rubric.png',         pos: 'right-[-7%] top-[42%]   w-[clamp(220px,24vw,420px)]', rot: -4, f: 'fa-4' },
  { src: '/shots/audit-ai.png',       pos: 'left-[7%] bottom-[-9%]  w-[clamp(250px,27vw,470px)]', rot: 4,  f: 'fa-5' },
  { src: '/shots/audit-activity.png', pos: 'right-[7%] bottom-[-10%] w-[clamp(250px,27vw,470px)]', rot: -4, f: 'fa-6' },
]

function Card({ src, pos, rot, f }) {
  return (
    <div
      className={`fa-card ${f} absolute ${pos} overflow-hidden rounded-2xl border border-border-strong bg-panel shadow-[0_26px_70px_rgba(20,23,31,0.22)]`}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-canvas px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-border-strong" />
        <span className="h-2 w-2 rounded-full bg-border-strong" />
        <span className="h-2 w-2 rounded-full bg-border-strong" />
      </div>
      <img src={src} alt="" className="block w-full" loading="eager" />
    </div>
  )
}

export default function FloatingAppScreens() {
  const root = useRef(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('.fa-1', { yPercent: -5, xPercent: 2, rotation: '-=1.5', duration: 14, ease: 'sine.inOut', repeat: -1, yoyo: true })
        gsap.to('.fa-2', { yPercent: 6, xPercent: -2, rotation: '+=1.5', duration: 16, ease: 'sine.inOut', repeat: -1, yoyo: true })
        gsap.to('.fa-3', { yPercent: -6, xPercent: 3, rotation: '+=1.5', duration: 18, ease: 'sine.inOut', repeat: -1, yoyo: true })
        gsap.to('.fa-4', { yPercent: 6, xPercent: -3, rotation: '-=1.5', duration: 17, ease: 'sine.inOut', repeat: -1, yoyo: true })
        gsap.to('.fa-5', { yPercent: -5, xPercent: -2, rotation: '-=1.5', duration: 19, ease: 'sine.inOut', repeat: -1, yoyo: true })
        gsap.to('.fa-6', { yPercent: 5, xPercent: 2, rotation: '+=1.5', duration: 15, ease: 'sine.inOut', repeat: -1, yoyo: true })
      })
      gsap.from('.fa-card', { opacity: 0, scale: 0.92, duration: 0.7, ease: 'power2.out', stagger: 0.08 })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {SCREENS.map((s) => (
        <Card key={s.f} {...s} />
      ))}
    </div>
  )
}
