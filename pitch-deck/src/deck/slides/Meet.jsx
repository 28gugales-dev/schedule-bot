import { SlideRoot, Statement } from '../SlideKit'
import ScheduleBlocks3D from '../components/ScheduleBlocks3D'

// Original Meet beat, on white: 3D glass schedule blocks behind the name + the
// one-line promise. The signature "reveal" frame.
export default function Meet() {
  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-0">
        <ScheduleBlocks3D />
      </div>
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
