import { Fragment } from 'react'
import { SlideFrame, Box } from '../SlideKit'

// "How it works" beat: a horizontal three-step flow from transcript to approved
// schedule. Reuses Box (inherits tokens + data-anim stagger). Thin chevron
// connectors between steps read as static rails. One blue accent = the step
// numbers; no warm/good semantics — a process has no positive/negative.
const STEPS = [
  {
    n: '01',
    title: 'Ingest the transcript',
    body: 'Upload a PDF. It parses courses, credits, and GPA automatically — no data entry.',
  },
  {
    n: '02',
    title: 'Build a compliant plan',
    body: 'It checks graduation requirements and resolves conflicts in seconds.',
  },
  {
    n: '03',
    title: 'Counselor approves',
    body: 'You review, adjust, and make the final call. Human-in-the-loop, always.',
  },
]

// A single-stroke chevron — the only glyph on the slide, kept subtle so it never
// competes with the step numbers.
function Connector() {
  return (
    <div className="hidden shrink-0 self-center px-1 text-brand-300 md:block" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <SlideFrame eyebrow="How it works" title="From transcript to approved schedule — in three steps.">
      <div className="flex flex-col items-stretch gap-5 md:flex-row md:gap-0">
        {STEPS.map((s, i) => (
          <Fragment key={s.n}>
            <Box className="flex flex-1 flex-col md:mx-2.5">
              <span className="font-mono text-sm font-medium tracking-[0.18em] text-brand-600 tnum">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-ink">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
            </Box>
            {i < STEPS.length - 1 && <Connector />}
          </Fragment>
        ))}
      </div>
    </SlideFrame>
  )
}
