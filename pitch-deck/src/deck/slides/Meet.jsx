import { SlideRoot, Statement } from '../SlideKit'
import FloatingAppScreens from '../components/FloatingAppScreens'

// Meet beat, on white: real product screens (review queue, dashboard, AI, policy,
// intake, audit) drifting in little window cards behind the name + the one-line
// promise. The reveal frame — now showing the actual app, not abstract shapes.
export default function Meet() {
  return (
    <div className="relative h-full w-full">
      <FloatingAppScreens />
      {/* tight white spotlight behind the wordmark only — keeps the title crisp
          without washing out the (now larger) app screens around the edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(42% 34% at 50% 50%, rgba(255,255,255,0.94) 38%, rgba(255,255,255,0.7) 62%, transparent 84%)' }}
      />
      <div className="relative z-10 h-full">
        <SlideRoot>
          <div className="mx-auto flex h-full max-w-[1160px] flex-col items-center justify-center px-16 text-center">
            <p data-anim className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-brand-600">
              Meet
            </p>
            <Statement className="mt-6">Schedule&nbsp;AI</Statement>
            <p data-anim className="mt-8 max-w-[52ch] text-lg leading-relaxed text-muted md:text-xl">
              The counselor&apos;s scheduling copilot. It reads each transcript, builds a
              graduation-compliant schedule in seconds, and hands you the final call.
            </p>
          </div>
        </SlideRoot>
      </div>
    </div>
  )
}
