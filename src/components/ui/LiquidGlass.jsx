/* ──────────────────────────────────────────────────────────────────────────
   LiquidGlassCard — layered frosted-glass surface (Brenda v1 lineage).

   Ported verbatim from Brenda v1 (src/components/ui/liquid-glass.tsx), itself
   ported from the Civic map's Nearby panel. Four stacked layers inside a
   clipped, rounded container:
     1. Bend  — backdrop-blur + an SVG feTurbulence/feDisplacementMap filter that
                warps whatever sits behind the panel (the "liquid" refraction).
     2. Face  — outer glow / drop shadow that lifts the panel off the page.
     3. Edge  — inset white highlight that paints the glassy rim.
     4. Content — the actual children. The card carries NO fill — supply a
                  translucent tint via `contentClassName` (e.g. "bg-white/60").

   Over our ambient aurora the Bend layer refracts the gradient, giving the
   floating panel its liquid-glass character instead of flat milky white.
   ────────────────────────────────────────────────────────────────────────── */

import { useSkin } from '../../features/skin/SkinProvider.jsx'

const blurClasses = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
}

/* Inset rim highlight. The color is a theme var (`--lg-highlight-rgb`, an r,g,b
   triplet) so dark mode can dim the blazing-white edge to a soft cool grey while
   keeping the per-size alpha ramp identical. */
const shadowStyles = {
  none: 'inset 0 0 0 0 rgba(var(--lg-highlight-rgb), 0)',
  xs: 'inset 1px 1px 1px 0 rgba(var(--lg-highlight-rgb), 0.3), inset -1px -1px 1px 0 rgba(var(--lg-highlight-rgb), 0.3)',
  sm: 'inset 2px 2px 2px 0 rgba(var(--lg-highlight-rgb), 0.35), inset -2px -2px 2px 0 rgba(var(--lg-highlight-rgb), 0.35)',
  md: 'inset 3px 3px 3px 0 rgba(var(--lg-highlight-rgb), 0.45), inset -3px -3px 3px 0 rgba(var(--lg-highlight-rgb), 0.45)',
  lg: 'inset 4px 4px 4px 0 rgba(var(--lg-highlight-rgb), 0.5), inset -4px -4px 4px 0 rgba(var(--lg-highlight-rgb), 0.5)',
  xl: 'inset 6px 6px 6px 0 rgba(var(--lg-highlight-rgb), 0.55), inset -6px -6px 6px 0 rgba(var(--lg-highlight-rgb), 0.55)',
  '2xl': 'inset 8px 8px 8px 0 rgba(var(--lg-highlight-rgb), 0.6), inset -8px -8px 8px 0 rgba(var(--lg-highlight-rgb), 0.6)',
}

/* Outer drop shadow that lifts the panel. Color is the theme var `--lg-glow-rgb`
   (near-black in both modes — on the dark canvas the negative-spread offsets plus
   the inset rim above carry the lift). */
const glowStyles = {
  none: '0 4px 4px rgba(var(--lg-glow-rgb), 0.05), 0 0 12px rgba(var(--lg-glow-rgb), 0.05)',
  xs: '0 6px 16px -6px rgba(var(--lg-glow-rgb), 0.18), 0 2px 6px rgba(var(--lg-glow-rgb), 0.08)',
  sm: '0 12px 32px -10px rgba(var(--lg-glow-rgb), 0.22), 0 4px 10px rgba(var(--lg-glow-rgb), 0.08)',
  md: '0 18px 44px -12px rgba(var(--lg-glow-rgb), 0.26), 0 6px 14px rgba(var(--lg-glow-rgb), 0.10)',
  lg: '0 24px 56px -12px rgba(var(--lg-glow-rgb), 0.30), 0 8px 18px rgba(var(--lg-glow-rgb), 0.12)',
  xl: '0 30px 64px -12px rgba(var(--lg-glow-rgb), 0.34), 0 10px 22px rgba(var(--lg-glow-rgb), 0.14)',
  '2xl': '0 36px 80px -14px rgba(var(--lg-glow-rgb), 0.38), 0 12px 26px rgba(var(--lg-glow-rgb), 0.16)',
}

// The displacement filter def. Render this ONCE near the app root; every
// LiquidGlassCard references it by url(#liquid-glass-blur). Keeping a single
// instance avoids duplicate-id collisions when multiple cards are on screen.
export function LiquidGlassFilter() {
  return (
    <svg className="hidden" aria-hidden="true">
      <defs>
        <filter
          id="liquid-glass-blur"
          x="0"
          y="0"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.003 0.007"
            numOctaves="1"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="120"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

export function LiquidGlassCard({
  children,
  className = '',
  contentClassName = '',
  blurIntensity = 'xl',
  shadowIntensity = 'md',
  glowIntensity = 'sm',
  borderRadius = '20px',
  style,
  ...props
}) {
  const { skin } = useSkin()

  // Enterprise skin: no frost. Collapse the layered blur/glow/displacement stack
  // to a single flat, hairline-bordered panel so it matches the console chrome.
  if (skin === 'enterprise') {
    return (
      <div
        className={`relative max-w-full overflow-hidden border border-border bg-surface ${className}`}
        style={{ borderRadius: 'var(--radius-md)', ...style }}
        {...props}
      >
        <div className={`relative h-full w-full ${contentClassName}`}>{children}</div>
      </div>
    )
  }

  return (
    <div
      className={`relative max-w-full overflow-hidden ${className}`}
      style={{ borderRadius, ...style }}
      {...props}
    >
      {/* Bend — refraction */}
      <div
        className={`absolute inset-0 z-0 ${blurClasses[blurIntensity]}`}
        style={{ borderRadius, filter: 'url(#liquid-glass-blur)' }}
      />
      {/* Face — outer glow / lift */}
      <div
        className="absolute inset-0 z-10"
        style={{ borderRadius, boxShadow: glowStyles[glowIntensity] }}
      />
      {/* Edge — inner highlight */}
      <div
        className="absolute inset-0 z-20"
        style={{ borderRadius, boxShadow: shadowStyles[shadowIntensity] }}
      />
      {/* Content */}
      <div className={`relative z-30 h-full w-full ${contentClassName}`}>
        {children}
      </div>
    </div>
  )
}
