import { SlideFrame } from '../SlideKit'

// "How it works" — a real connected flowchart: four phases left → right, each
// a vertical chain of circular nodes joined by a spine line, chained between
// phases by arrows. Every node is tagged with what it ACTUALLY is right now —
// browser-side algorithm, local/mock state, real Supabase write, or a stubbed
// integration — so the slide doesn't overclaim a backend that doesn't exist
// yet. Entrance motion reuses SlideKit's stagger (data-anim).

const CATEGORY = {
  browser: { dot: 'bg-brand-500', ring: 'ring-brand-500', label: 'Runs in your browser' },
  mock: { dot: 'bg-faint', ring: 'ring-faint', label: 'Mock data / local state' },
  real: { dot: 'bg-good', ring: 'ring-good', label: 'Real backend (Supabase)' },
  stub: { dot: 'bg-warm', ring: 'ring-warm', label: 'Stubbed — not connected yet' },
  human: { dot: 'bg-warm', ring: 'ring-warm', label: 'Human decision' },
}

function Node({ title, detail, cat, chip, isLast }) {
  const c = CATEGORY[cat]
  return (
    <li data-anim className="relative pb-6 pl-8 last:pb-0">
      {!isLast && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-border-strong" aria-hidden="true" />}
      <span
        className={`absolute left-0 top-0.5 flex h-3.5 w-3.5 -translate-x-px items-center justify-center rounded-full ${c.dot} ring-[3px] ring-canvas`}
        aria-hidden="true"
      />
      <p className="text-[13px] font-semibold leading-tight text-ink">{title}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-muted">{detail}</p>
      {chip && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-warm/40 bg-warm/[0.07] px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-warm" />
          <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.16em] text-warm">{chip}</span>
        </span>
      )}
    </li>
  )
}

function Phase({ n, title, steps }) {
  return (
    <div data-anim className="flex-1">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 font-mono text-[10px] font-semibold text-brand-600 tnum">
          {n}
        </span>
        <h3 className="font-display text-[14.5px] font-semibold leading-tight text-ink">{title}</h3>
      </div>
      <ol>
        {steps.map((s, i) => (
          <Node key={s.title} {...s} isLast={i === steps.length - 1} />
        ))}
      </ol>
    </div>
  )
}

function PhaseArrow() {
  return (
    <div data-anim className="hidden w-7 shrink-0 items-start justify-center pt-[3px] lg:flex">
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-brand-300">
        <path d="M1 7h15M11 2l5 5-5 5" />
      </svg>
    </div>
  )
}

const PHASES = [
  {
    n: '01',
    title: 'Student intake',
    steps: [
      { title: 'Upload transcript', detail: 'PDF text extracted client-side via pdf.js — nothing uploads to a server.', cat: 'browser' },
      { title: 'Type course list', detail: 'Seven boxes, one per period, with live type-ahead suggestions.', cat: 'browser' },
      { title: 'Auto-parse & match', detail: 'Exact match, then Levenshtein + word-overlap fuzzy match against the catalog.', cat: 'browser' },
    ],
  },
  {
    n: '02',
    title: 'Eligibility checks',
    steps: [
      { title: 'Prerequisite + grade graph', detail: 'Directed-graph walk over the course catalog.', cat: 'browser' },
      { title: 'Seat capacity', detail: 'Placeholder data — no live Infinite Campus roster feed yet.', cat: 'mock' },
      { title: 'Schedule conflict', detail: "Interval-overlap check against the rest of the student's periods.", cat: 'browser' },
      { title: 'Dependency impact', detail: 'Warns what else breaks if a course is dropped (graph search).', cat: 'browser' },
    ],
  },
  {
    n: '03',
    title: 'Decision engine',
    steps: [
      { title: 'Dedupe + rate limit', detail: 'Blocks duplicate submissions and throttles spam.', cat: 'browser' },
      { title: 'Rule-engine recommendation', detail: 'Confidence score + a pass/fail reason for every criterion. No ML.', cat: 'browser' },
      { title: 'Session state', detail: 'Held in the browser / localStorage — no live database yet.', cat: 'mock' },
      { title: 'Audit event logged', detail: 'Written to Supabase audit_log — this part is real.', cat: 'real' },
    ],
  },
  {
    n: '04',
    title: 'Counselor review',
    steps: [
      { title: 'Priority-ordered queue', detail: 'Urgency-sorted by grade level + wait time.', cat: 'browser' },
      { title: 'Counselor decides', detail: 'Sees the same breakdown — admits or denies. Final call, always.', cat: 'human', chip: 'You decide' },
      { title: 'Batch sync to Infinite Campus', detail: 'Marked synced locally — no live IC connection yet.', cat: 'stub' },
    ],
  },
]

export default function Flow() {
  return (
    <SlideFrame eyebrow="How it works" title="Here's exactly what happens.">
      <div className="flex items-start gap-2 lg:gap-0">
        {PHASES.map((p, i) => (
          <div key={p.n} className="flex items-start">
            <Phase {...p} />
            {i < PHASES.length - 1 && <PhaseArrow />}
          </div>
        ))}
      </div>

      <div data-anim className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
        {Object.values(CATEGORY)
          .filter((c, i, arr) => arr.findIndex((x) => x.label === c.label) === i)
          .map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${c.dot}`} />
              <span className="text-[11px] text-faint">{c.label}</span>
            </span>
          ))}
      </div>
    </SlideFrame>
  )
}
