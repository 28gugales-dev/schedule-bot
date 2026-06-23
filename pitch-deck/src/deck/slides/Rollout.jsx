import { SlideFrame } from '../SlideKit'

// Rollout & onboarding beat. A horizontal timeline — distinct from every other
// slide — reads left-to-right: a thin connecting line BEHIND four evenly-spaced
// brand-blue nodes, each a step with a mono week-label, bold title, and one line.
const STEPS = [
  {
    week: 'Week 1',
    title: 'Onboard & import',
    detail: 'We import your course catalog and graduation rules.',
  },
  {
    week: 'Week 1',
    title: 'Pilot',
    detail: 'One counselor, one grade level.',
  },
  {
    week: 'Week 2+',
    title: 'Roll out',
    detail: 'School-wide, at your pace.',
  },
  {
    week: 'Ongoing',
    title: 'Support',
    detail: 'Dedicated success contact + data-security review.',
  },
]

export default function Rollout() {
  return (
    <SlideFrame eyebrow="Rollout" title="Live in a week. Supported the whole way.">
      <div className="relative">
        {/* Connecting line, behind the nodes. Inset to the center of the first
            and last node columns so it spans dot-to-dot, not edge-to-edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[5px] h-px bg-border-strong"
        />

        <ol className="relative grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-6">
          {STEPS.map((s) => (
            <li key={s.title} data-anim className="relative">
              {/* Node dot sits on the line */}
              <span className="block h-[11px] w-[11px] rounded-full border-2 border-white bg-brand-500 shadow-sm" />
              <p className="mt-5 font-mono text-[11px] font-medium uppercase tracking-[0.26em] text-brand-600">
                {s.week}
              </p>
              <p className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight text-ink">
                {s.title}
              </p>
              <p className="mt-2 max-w-[26ch] text-sm leading-relaxed text-muted">{s.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </SlideFrame>
  )
}
