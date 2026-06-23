import { useRef } from 'react'
import { gsap, useGSAP } from '../anim'

// Animated number reveal. Counts from 0 to `value` on mount. Used for the
// before/after and ROI beats where the number IS the message (Warikoo: don't
// state a metric, perform it). Tabular figures keep the width from jittering.
export default function StatCounter({ value, decimals = 0, prefix = '', suffix = '', duration = 1.4, className = '' }) {
  const el = useRef(null)

  useGSAP(
    () => {
      const obj = { n: 0 }
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        el.current.textContent = prefix + value.toFixed(decimals) + suffix
        return
      }
      gsap.to(obj, {
        n: value,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          el.current.textContent = prefix + obj.n.toFixed(decimals) + suffix
        },
      })
    },
    { scope: el, dependencies: [value] },
  )

  return <span ref={el} className={`tnum ${className}`}>{prefix}0{suffix}</span>
}
