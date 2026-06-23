import { SlideRoot, Statement, Em } from '../SlideKit'

// The editorial hook you liked — big centered statement, serif-italic emphasis,
// on white over the soft aurora. Warikoo's open: lead with the pain.
export default function Hook() {
  return (
    <SlideRoot>
      <div className="mx-auto flex h-full max-w-[1160px] flex-col items-center justify-center px-16 text-center">
        <p data-anim className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand-600">
          The counselor&apos;s reality
        </p>
        <Statement className="mt-7">
          One schedule.
          <br />
          <Em>Hours</Em> by hand.
        </Statement>
        <p data-anim className="mt-8 max-w-[54ch] text-lg leading-relaxed text-muted md:text-xl">
          Every course plan is built by hand, checked against graduation rules by hand, and redone the
          moment a class fills up. Now multiply it by a caseload of 400.
        </p>
      </div>
    </SlideRoot>
  )
}
