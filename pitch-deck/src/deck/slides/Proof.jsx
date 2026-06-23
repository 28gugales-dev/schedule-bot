import { SlideRoot, Em } from '../SlideKit'

// PLACEHOLDER proof beat — no real pilot data yet. A quiet, editorial pull-quote
// over the shell's white + aurora (this slide adds no background of its own). The
// serif-italic is the deck's voice device; here it carries a human testimonial.
// Swap the quote, attribution, and chip stat the day a real pilot closes. Until
// then it stays honestly labelled as a placeholder.
export default function Proof() {
  return (
    <SlideRoot>
      <div className="mx-auto flex h-full max-w-[1160px] flex-col items-center justify-center px-16 text-center">
        {/* One quiet metric chip — sets context above the quote, doesn't repeat it.
            Static and small on purpose: a counting animation here would read fussy. */}
        <div
          data-anim
          className="inline-flex items-center gap-2.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5"
        >
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.28em] text-brand-600">
            Pilot result
          </span>
          <span className="h-3.5 w-px bg-brand-200" aria-hidden="true" />
          <span className="font-display text-sm font-semibold tnum text-ink">
            {/* mock — replace with verified pilot figure */}
            6 schools, one fall season
          </span>
        </div>

        {/* The pull-quote — serif italic, sized to land in 3 lines, the room's eyes
            rest here. One Em accent word, no more. */}
        <blockquote
          data-anim
          className="mt-9 max-w-[40ch] font-serif text-3xl font-normal italic leading-[1.22] text-ink md:text-[2.75rem] md:leading-[1.18]"
        >
          {/* PLACEHOLDER quote — replace with a real, attributed pilot quote */}
          &ldquo;We went from a two-week scheduling scramble to a single afternoon.
          My counselors got their <Em>fall</Em> back.&rdquo;
        </blockquote>

        {/* Attribution + honest placeholder flag */}
        <figcaption data-anim className="mt-8">
          <p className="text-base font-medium text-muted">
            &mdash; Director of Counseling, <span className="text-ink">[Pilot District]</span>
          </p>
          <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            placeholder &mdash; replace with real pilot quote
          </p>
        </figcaption>
      </div>
    </SlideRoot>
  )
}
