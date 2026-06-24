import { useRef } from 'react'
import { SlideFrame } from '../SlideKit'
import { gsap, useGSAP } from '../anim'

/* ─────────────────────────────────────────────────────────────────────────────
 * "How it works" — a genuine CONNECTED FLOWCHART on white (spine-zigzag).
 *
 * Reference A, elevated: a horizontal connector SPINE links the stages; icon
 * medallions ALTERNATE above/below the spine in a gentle zigzag, each joined by a
 * short curved stub; numbered markers ride the spine. Two input medallions on the
 * far left CURVE-MERGE onto the spine (the app accepts either input), and step 4
 * is a DECISION diamond on the spine — the human anchor, warmer than the machine
 * nodes — whose approved path continues to the final node. Reference B's smooth
 * bezier elegance is imported as a soft brand-tinted glow under every connector.
 *
 * GEOMETRY — single source of truth, provably aligned without a runtime check:
 *   The diagram box is aspect-locked to the SVG viewBox (1200×400). With
 *   preserveAspectRatio="xMidYMid meet" (the default) there is zero letterboxing,
 *   so a viewBox point (x,y) maps EXACTLY to box fraction (x/VB_W, y/VB_H). SVG
 *   <path>s are drawn from the same `C` coords the HTML node divs are positioned
 *   from (left/top %, translate(-50%,-50%)), so connectors terminate at medallion
 *   centers. WIDTH is capped (max-w-[1100px], never height) so the box keeps its
 *   aspect; aspect-ratio drives height down from there. `meet` (not `none`) means
 *   strokes never shear — worst case is gentle letterboxing, not distortion.
 *
 *   Vertical fit was rendered, not assumed: at the worst-case 1280×720 stage
 *   (where the left-aligned title wraps to two lines), every label clears the
 *   wrapped title above and the deck chrome below by ~25px, with no horizontal
 *   label overlap. The decision label sits ABOVE the diamond (the spine puts the
 *   diamond at box-center, so its label can't be pushed down without hitting the
 *   chrome — above-placement uses the empty band to the right of the short title).
 *
 * Connectors animate via pathLength="1" → dashoffset 1→0 (no getTotalLength),
 * sequenced in product order — each glow halo draws WITH its path so the route is
 * never pre-revealed. Medallions carry an OPAQUE fill above the SVG so paths
 * visually terminate at the rim with no edge math. ALL hidden state lives inside
 * the gsap.matchMedia no-preference branch — reduced-motion users get the
 * finished diagram, nothing ever stuck at opacity:0 or path-hidden.
 * ───────────────────────────────────────────────────────────────────────────── */

const VB_W = 1200
const VB_H = 400
const SPINE_Y = 200

// Node anchor coords (viewBox units) — the ONE source of truth for SVG + HTML.
// Y-amplitudes were tuned against a real render so every label fits 1280×720.
const C = {
  inTop: { x: 128, y: 152 }, // input A — Transcript PDF (above)
  inBot: { x: 128, y: 248 }, // input B — Infinite Campus roster (below)
  merge: { x: 300, y: SPINE_Y }, // marker 1 — the merge point on the spine
  s2: { x: 480, y: 148 }, // Reads it automatically (above)
  s3: { x: 690, y: 252 }, // Builds a compliant plan (below)
  s4: { x: 900, y: SPINE_Y }, // Counselor approves — DECISION (on spine)
  s5: { x: 1112, y: 148 }, // Pushes to Infinite Campus (above)
}

const R = 38 // medallion path-anchor radius (viewBox units)
const DIA = 50 // decision diamond half-diagonal (viewBox units)

// Spine markers — the numbered circles that ride the spine. The decision (n=4)
// is intentionally ABSENT: it owns its own number on the diamond, and a marker
// there would be buried under the diamond's opaque fill.
const MARKERS = [
  { n: 1, x: C.merge.x },
  { n: 2, x: C.s2.x },
  { n: 3, x: C.s3.x },
  { n: 5, x: C.s5.x },
]

// Connector paths, ordered to DRAW in product order; endpoints are the coords
// above, so each meets a node center. Uniform brand blue (the one connector hue).
const PATHS = [
  // 1 — two inputs CURVE-MERGE onto the spine
  `M ${C.inTop.x + R} ${C.inTop.y} C ${C.merge.x - 60} ${C.inTop.y}, ${C.merge.x - 70} ${SPINE_Y}, ${C.merge.x} ${SPINE_Y}`,
  `M ${C.inBot.x + R} ${C.inBot.y} C ${C.merge.x - 60} ${C.inBot.y}, ${C.merge.x - 70} ${SPINE_Y}, ${C.merge.x} ${SPINE_Y}`,
  // 2 — merge → up-stub to stage 2
  `M ${C.merge.x} ${SPINE_Y} C ${C.s2.x - 70} ${SPINE_Y}, ${C.s2.x} ${SPINE_Y - 36}, ${C.s2.x} ${C.s2.y + R}`,
  // 3 — stage 2 → down-stub to stage 3
  `M ${C.s2.x} ${C.s2.y + R} C ${C.s2.x} ${SPINE_Y + 48}, ${C.s3.x - 90} ${SPINE_Y}, ${C.s3.x} ${C.s3.y - R}`,
  // 4 — stage 3 → up to the DECISION diamond on the spine
  `M ${C.s3.x} ${C.s3.y - R} C ${C.s3.x + 90} ${SPINE_Y}, ${C.s4.x - DIA - 10} ${SPINE_Y}, ${C.s4.x - DIA} ${SPINE_Y}`,
  // 5 — DECISION "approved" → continues along the spine, then up to final node
  `M ${C.s4.x + DIA} ${SPINE_Y} C ${C.s5.x - 70} ${SPINE_Y}, ${C.s5.x} ${SPINE_Y - 36}, ${C.s5.x} ${C.s5.y + R}`,
]

// Clean inline line icons (stroke ~1.5, currentColor) — no emoji, no library.
const ICONS = {
  transcript: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 16.5h4" />
    </>
  ),
  sis: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </>
  ),
  read: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h9l5 5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M8 11h8M8 14.5h8M8 8h3" />
      <path d="M19 14l-2.5 2.5L15 15" />
    </>
  ),
  plan: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 4v16" />
      <path d="M12 9h5M12 13h5" />
      <path d="M14.5 6.5l1 1 2-2" />
    </>
  ),
  approve: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 11.5l2 2 4-4.5" />
    </>
  ),
  push: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12v5c0 1.66 3.13 3 7 3 .7 0 1.38-.04 2-.13" />
      <path d="M17 21v-7m0 0l-2.5 2.5M17 14l2.5 2.5" />
    </>
  ),
}

// Percent helpers — map viewBox coords to box fractions (the alignment law).
const L = (x) => `${(x / VB_W) * 100}%`
const T = (y) => `${(y / VB_H) * 100}%`

// A circular icon medallion, anchored AT its coord. Heading + subtitle are an
// absolutely-positioned child offset above/below, so label width never moves the
// anchor (paths still meet the rim). Opaque fill sits over the SVG.
function Medallion({ at, icon, n, title, sub, place = 'below', tone = 'brand', lead }) {
  const ring =
    tone === 'brand-strong' ? 'border-brand-500 text-brand-600' : 'border-brand-200 text-brand-600'
  return (
    <div
      data-node
      className="absolute z-20 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-canvas shadow-[0_6px_22px_rgba(20,23,31,0.08)]"
      style={{ left: L(at.x), top: T(at.y) }}
    >
      <span className={`flex h-full w-full items-center justify-center rounded-full border-[1.5px] ${ring}`}>
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      {/* label block — offset off the anchor so its width can't shift the node */}
      <div
        className={`pointer-events-none absolute left-1/2 w-[155px] -translate-x-1/2 text-center ${
          place === 'above' ? 'bottom-full mb-3.5' : 'top-full mt-3.5'
        }`}
      >
        {n != null ? (
          <span className="font-mono text-[11px] font-medium tracking-[0.22em] text-faint tnum">
            {String(n).padStart(2, '0')}
          </span>
        ) : (
          lead && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{lead}</span>
        )}
        <h3 className="mt-0.5 font-display text-[16px] font-semibold leading-[1.2] text-ink">{title}</h3>
        {sub && <p className="mt-1 text-[12px] leading-[1.35] text-muted">{sub}</p>}
      </div>
    </div>
  )
}

// The DECISION node — a rotated square (diamond) on the spine, warm accent so it
// reads as the human anchor, with a "YOU DECIDE" chip for human-in-the-loop. Its
// label sits ABOVE the diamond: the spine pins the diamond at box-center, so a
// below-label would collide with the deck chrome — the band above is clear.
function Decision({ at, icon, n, title, sub }) {
  return (
    <div data-node className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: L(at.x), top: T(at.y) }}>
      <div className="relative flex h-[92px] w-[92px] items-center justify-center">
        <span className="absolute inset-0 rotate-45 rounded-[14px] border-[1.5px] border-warm bg-canvas shadow-[0_8px_26px_rgba(217,72,15,0.16)]" />
        <span className="absolute inset-[7px] rotate-45 rounded-[10px] bg-warm/[0.06]" />
        <svg viewBox="0 0 24 24" className="relative h-8 w-8 text-warm" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-4 w-[180px] -translate-x-1/2 text-center">
        <span className="font-mono text-[11px] font-medium tracking-[0.22em] text-warm tnum">{String(n).padStart(2, '0')}</span>
        <h3 className="mt-0.5 font-display text-[16px] font-semibold leading-[1.2] text-ink">{title}</h3>
        {sub && <p className="mt-1 text-[12px] leading-[1.35] text-muted">{sub}</p>}
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-warm/40 bg-warm/[0.07] px-2.5 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-warm" />
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-warm">You decide</span>
        </span>
      </div>
    </div>
  )
}

export default function Flow() {
  const diagram = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const paths = gsap.utils.toArray('[data-path]')
        const glows = gsap.utils.toArray('[data-glow]')
        const nodes = gsap.utils.toArray('[data-node]')
        const markers = gsap.utils.toArray('[data-marker]')

        // Hidden initial state lives ONLY here — reduced-motion skips this branch
        // and keeps the rendered (final) state, so nothing is ever stuck hidden.
        gsap.set([...paths, ...glows], { strokeDashoffset: 1 })
        gsap.set(nodes, { opacity: 0, scale: 0.8, transformOrigin: '50% 50%' })
        gsap.set(markers, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' })

        // Draw a connector together with its glow halo so the route is never
        // pre-revealed (glow[i] is paired to path[i] by render order).
        const draw = (tl, i, duration, at) =>
          tl.to([paths[i], glows[i]], { strokeDashoffset: 0, duration }, at)

        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
        // Inputs pop, their merge paths draw, then each stage reveals in order.
        tl.to([nodes[0], nodes[1]], { opacity: 1, scale: 1, duration: 0.4, stagger: 0.12 })
        draw(tl, 0, 0.7, '-=0.15')
        draw(tl, 1, 0.7, '<')
        tl.to(markers[0], { opacity: 1, scale: 1, duration: 0.35 }, '-=0.25')
        draw(tl, 2, 0.55)
        tl.to([nodes[2], markers[1]], { opacity: 1, scale: 1, duration: 0.4 }, '-=0.2')
        draw(tl, 3, 0.55)
        tl.to([nodes[3], markers[2]], { opacity: 1, scale: 1, duration: 0.4 }, '-=0.2')
        draw(tl, 4, 0.55)
        tl.to(nodes[4], { opacity: 1, scale: 1, duration: 0.45 }, '-=0.2') // decision
        draw(tl, 5, 0.6)
        tl.to([nodes[5], markers[3]], { opacity: 1, scale: 1, duration: 0.45 }, '-=0.2')
      })
      return () => mm.revert()
    },
    { scope: diagram },
  )

  return (
    <SlideFrame eyebrow="How it works" title="Here's exactly what happens.">
      <div ref={diagram} className="relative mx-auto w-full max-w-[1100px]">
        {/* aspect-locked to the viewBox, overflow-visible so edge labels never clip */}
        <div className="relative aspect-[1200/400] w-full overflow-visible">
          {/* connector layer — viewBox maps 1:1 to this box (meet, no letterbox) */}
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="absolute inset-0 h-full w-full overflow-visible"
            fill="none"
            aria-hidden="true"
          >
            {/* the SPINE — a calm hairline the markers ride on */}
            <line
              x1={C.merge.x}
              y1={SPINE_Y}
              x2={C.s5.x}
              y2={SPINE_Y}
              className="text-brand-200"
              stroke="currentColor"
              strokeOpacity="0.7"
              strokeWidth="1.5"
              strokeDasharray="2 7"
              strokeLinecap="round"
            />
            {/* soft brand-tinted GLOW under every connector — Reference B's curve
                quality on white. pathLength + dasharray let it draw WITH its
                path (timeline), so it never pre-reveals the route. */}
            {PATHS.map((d, i) => (
              <path
                key={`glow-${i}`}
                data-glow
                d={d}
                pathLength="1"
                strokeDasharray="1"
                className="text-brand-100"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeOpacity="0.6"
              />
            ))}
            {/* connector paths — uniform brand blue, draw in product order */}
            {PATHS.map((d, i) => (
              <path
                key={i}
                data-path
                d={d}
                pathLength="1"
                strokeDasharray="1"
                className="text-brand-400"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* numbered markers — ride the spine, above the SVG */}
          {MARKERS.map((m) => (
            <span
              key={m.n}
              data-marker
              className="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-brand-200 bg-canvas font-mono text-[11px] font-semibold text-brand-600 shadow-[0_3px_10px_rgba(20,23,31,0.08)] tnum"
              style={{ left: L(m.x), top: T(SPINE_Y) }}
            >
              {m.n}
            </span>
          ))}

          {/* ── STAGE 1 (the MERGE): two input medallions on the far left ── */}
          <Medallion
            at={C.inTop}
            icon={ICONS.transcript}
            title="Transcript PDF"
            sub="Drop in the student's record"
            place="above"
            lead="Input A"
          />
          <Medallion
            at={C.inBot}
            icon={ICONS.sis}
            title="Infinite Campus roster"
            sub="…or pull straight from the SIS"
            place="below"
            lead="Input B"
          />

          {/* ── STAGE 2 — reads it automatically (above the spine) ── */}
          <Medallion
            at={C.s2}
            n={2}
            icon={ICONS.read}
            title="Reads it automatically"
            sub="Parses courses, credits, GPA. Zero data entry."
            place="above"
          />

          {/* ── STAGE 3 — builds a compliant plan (below the spine) ── */}
          <Medallion
            at={C.s3}
            n={3}
            icon={ICONS.plan}
            title="Builds a compliant plan"
            sub="Checks grad requirements + live seats in seconds."
            place="below"
          />

          {/* ── STAGE 4 — DECISION node (the human anchor, on the spine) ── */}
          <Decision
            at={C.s4}
            n={4}
            icon={ICONS.approve}
            title="Counselor approves"
            sub="Sees the AI recommendation + confidence — makes the final call."
          />

          {/* ── STAGE 5 — pushes to Infinite Campus (above the spine) ── */}
          <Medallion
            at={C.s5}
            n={5}
            icon={ICONS.push}
            title="Pushes to Infinite Campus"
            sub="Approved schedule syncs back, with a full audit trail."
            place="above"
            tone="brand-strong"
          />
        </div>
      </div>
    </SlideFrame>
  )
}