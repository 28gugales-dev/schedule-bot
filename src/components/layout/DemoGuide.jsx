import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

/* Demo-only "Start here" guide. A glowing sidebar button (rendered above the
 * nav) opens a modal explaining what Schedule AI is, who it's for, and how to
 * navigate the demo. Only mounted when demoMode is true (see shells). */

const IconSpark = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 1.8l1.5 3.9 3.9 1.5-3.9 1.5L8 12.6 6.5 8.7 2.6 7.2l3.9-1.5L8 1.8Z" />
    <path d="M12.8 11.2l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5.5-1.3Z" />
  </svg>
)

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="4" x2="12" y2="12" />
    <line x1="12" y1="4" x2="4" y2="12" />
  </svg>
)

const NAV_GUIDE = [
  { k: 'Review Queue', v: 'The home base. Pending waiver requests, each with the AI recommendation and a confidence score. Click one to see every rule it checked, then admit or deny — you make the final call.' },
  { k: 'Form Builder', v: 'Configure the waiver forms students fill out and the rubric the AI scores against. No code.' },
  { k: 'Audit', v: 'Activity, Counselor Decisions, Student Submissions, AI Reasoning, Overview — the explainable, FERPA-style trail. Every decision is logged with who, what, and why.' },
  { k: 'Batch Sync', v: 'The approved schedules queued to push back to the school SIS (Infinite Campus). Stubbed in the demo.' },
]

export function DemoGuide({ collapsed = false, variant = 'enterprise' }) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, close])

  const radius = variant === 'glass' ? 'rounded-xl' : 'rounded-md'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="What is this app? Start here"
        aria-label="What is this app? Start here"
        className={`demo-glow group relative flex w-full items-center bg-brand-600 text-white transition-colors hover:bg-brand-700 ${radius} ${
          collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-2'
        }`}
      >
        <span className="shrink-0 text-white/95">
          <IconSpark />
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col text-left leading-tight">
            <span className="truncate text-[13.5px] font-semibold">Start here</span>
            <span className="truncate text-[10.5px] font-medium text-white/75">What is this app?</span>
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="About this demo"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm fade-in"
            onClick={close}
            aria-hidden="true"
          />

          {/* panel */}
          <div className="glass-card animate-toast-in relative z-10 flex max-h-[88vh] w-full max-w-[680px] flex-col overflow-hidden" style={{ borderRadius: '20px' }}>
            {/* header */}
            <div className="relative shrink-0 overflow-hidden px-7 pt-7 pb-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60"
                style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.22), transparent 70%)' }}
              />
              <div className="relative flex items-start gap-3.5">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-[0_2px_12px_rgba(10,132,255,0.4)]">
                  <IconSpark size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-brand-600">You're in the demo</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">Schedule AI — the counselor's copilot</h2>
                </div>
              </div>
            </div>

            {/* scrollable body */}
            <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-7 pb-2">
              <Section eyebrow="What it does">
                Schedule AI reads a student's transcript, checks a course-waiver or schedule-change request against
                the graduation rubric in seconds, and hands the counselor a clear recommendation with a confidence
                score. The counselor always makes the final call — the AI explains, it never decides.
              </Section>

              <Section eyebrow="Who it's for">
                High-school <span className="font-semibold text-ink">counselors and registrars</span> drowning in
                waiver requests — prerequisite overrides, course swaps, schedule changes. A review that takes 2–3
                minutes by hand drops to about 10–15 seconds here, with a full audit trail behind every call.
              </Section>

              <Section eyebrow="The use case">
                It's start-of-year and hundreds of waiver requests land at once. Instead of reading each transcript
                by hand, the counselor works the priority queue: the AI has already scored each request against the
                rules, so they approve the clean ones fast and spend their attention on the edge cases.
              </Section>

              <Section eyebrow="How to navigate this demo">
                <div className="mt-1 space-y-2.5">
                  {NAV_GUIDE.map((row) => (
                    <div key={row.k} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                      <p className="text-[14px] leading-relaxed text-muted">
                        <span className="font-semibold text-ink">{row.k}</span> — {row.v}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>

              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3.5 dark:border-brand-200/30">
                <p className="text-[13.5px] leading-relaxed text-ink">
                  <span className="font-semibold">Try this first:</span> open <span className="font-semibold">Review Queue</span>,
                  pick <span className="font-semibold">Avery Mitchell</span>, read the AI's reasoning, and admit her.
                  Then check <span className="font-semibold">Audit → Counselor Decisions</span> to see the trail — and
                  search her name in the command bar (⌘K) to find her record.
                </p>
              </div>

              <p className="pb-1 text-[12px] leading-relaxed text-muted/80">
                This is a live demo: all data is local and seeded, there's no real backend, and a page reload resets
                everything to its starting state.
              </p>
            </div>

            {/* footer */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-7 py-4">
              <button
                type="button"
                onClick={close}
                className="rounded-md bg-brand-600 px-4 py-2 text-[14px] font-medium text-white transition hover:bg-brand-700"
              >
                Got it — explore
              </button>
            </div>

            {/* corner close */}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-scrim hover:text-ink"
            >
              <IconClose />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function Section({ eyebrow, children }) {
  return (
    <div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
      <div className="mt-2 text-[14px] leading-relaxed text-muted">{children}</div>
    </div>
  )
}
