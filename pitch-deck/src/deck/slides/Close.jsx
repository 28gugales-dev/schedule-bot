import { SlideRoot, Statement, Em } from '../SlideKit'

// Closing call-to-action, on white over the aurora. Warikoo's close: make the
// ask small and obvious. One promise, one button, one way to reach us.
export default function Close() {
  return (
    <SlideRoot>
      <div className="mx-auto flex h-full max-w-[1160px] flex-col items-center justify-center px-16 text-center">
        <p data-anim className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand-600">
          The ask
        </p>

        <Statement className="mt-7">
          Give your counselors
          <br />
          their <Em>time</Em> back.
        </Statement>

        <p data-anim className="mt-8 max-w-[48ch] text-lg leading-relaxed text-muted md:text-xl">
          Book a pilot — we&apos;ll have you scheduling in a week.
        </p>

        <a
          data-anim
          href="mailto:hello@schedule-ai.example"
          className="cta-btn mt-10 inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-3.5 font-display text-base font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-px hover:bg-brand-700 hover:shadow-[0_8px_30px_rgba(20,23,31,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Book a pilot
        </a>

        <p data-anim className="mt-7 font-mono text-[12px] tracking-wide text-muted">
          {/* placeholder */}
          hello@schedule-ai.example&nbsp;&nbsp;/&nbsp;&nbsp;schedule-ai.example
        </p>
      </div>
    </SlideRoot>
  )
}
