import { useRef, useState, useLayoutEffect } from 'react'

// Embeds the LIVE app (its own dev server) at a fixed desktop width, scaled to
// exactly fill its parent box. Rendering at DESIGN_W guarantees the full console
// layout (sidebar + grid) rather than the app's narrow breakpoint; scaling keeps
// it crisp (vector, not a downscaled raster) at any size. Fills the parent, so the
// host slide controls the size via flex — no fixed aspect to overflow the slide.
// A ResizeObserver re-fits on window / fullscreen changes.
const DESIGN_W = 1440

export default function AppFrame({ src, title = 'Live app' }) {
  const box = useRef(null)
  const [dim, setDim] = useState(null) // { scale, h } in design px

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) setDim({ scale: w / DESIGN_W, h: (h * DESIGN_W) / w })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden bg-canvas">
      <iframe
        title={title}
        src={src}
        loading="eager"
        className="absolute left-0 top-0 origin-top-left border-0"
        style={{
          width: DESIGN_W,
          height: dim ? dim.h : DESIGN_W * 0.6,
          transform: `scale(${dim ? dim.scale : 1})`,
          visibility: dim ? 'visible' : 'hidden', // avoid a giant-iframe flash pre-measure
        }}
      />
    </div>
  )
}
