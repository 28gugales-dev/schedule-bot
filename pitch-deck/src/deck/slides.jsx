import Meet from './slides/Meet'
import Flow from './slides/Flow'
import BeforeAfter from './slides/BeforeAfter'
import Proof from './slides/Proof'
import Compliance from './slides/Compliance'
import SeeItLive from './slides/SeeItLive'
import Close from './slides/Close'

// The full Schedule AI sales deck, on white. Narrative arc (Warikoo): pain →
// cost → solution → how → proof it works → trust → social proof → live → ask.
// `label` shows in the chrome + notes; `notes` are the presenter's spoken
// talking points (press N).
export const slides = [
  {
    id: 'meet',
    label: 'Meet Schedule AI',
    Component: Meet,
    notes: `Now the turn. Say the promise in one sentence and stop: "Schedule AI reads the transcript, builds a graduation-compliant schedule in seconds, and you make the final call." Emphasize "final call" — counselors fear being replaced; this keeps them in control. Pause here before the demo.`,
  },
  {
    id: 'flow',
    label: 'How it works',
    Component: Flow,
    notes: `Walk the four columns left to right. Column 1: the student drops in a transcript and types the course list — parsed and fuzzy-matched against the catalog entirely in the browser. Column 2: eligibility checks run instantly — prerequisites, grade level, schedule conflicts, dependency impact. Be upfront on seat capacity: that's placeholder data today, no live Infinite Campus roster feed yet. Column 3: dedupe and rate-limit guards, then the rule engine produces a recommendation with a confidence score and a pass/fail reason for every criterion — no ML, fully explainable. Session state is local for now; the one piece that's genuinely real backend today is the audit log, written straight to Supabase. Column 4: the counselor sees the same breakdown in a priority-ordered queue and makes the final call — "you decide" is the whole trust pitch. Batch sync to Infinite Campus is the one stub left — be honest that it's marked synced locally, not yet wired to a live IC connection. End with: "let me just show you live."`,
  },
  {
    id: 'beforeafter',
    label: 'Data security',
    Component: BeforeAfter,
    tone: 'blue',
    notes: `This is the slide that gets you past IT and procurement, not just the counselors. Four concrete facts, not badge soup: FERPA-compliant by design — access controls and audit trails built in, not bolted on. Hosting infrastructure is independently certified to both SOC 2 Type II and ISO 27001. Every record is AES-256 encrypted at rest and TLS in transit, end to end. And sign-in is Google OAuth only — students and staff use their existing school account, and we never see or store a password. Land on: "this is security your IT director signs off on."`,
  },
  {
    id: 'proof',
    label: 'The difference',
    Component: Proof,
    notes: `State the core claim plainly and let it land: a waiver that took two to three minutes to review by hand now takes ten to fifteen seconds — the same careful review, without the manual hours. No quote, no testimonial (no deployed schools yet); the metric itself is the proof.`,
  },
  {
    id: 'compliance',
    label: 'Built for compliance',
    Component: Compliance,
    notes: `This slide is for the procurement and IT people in the room, not the counselors. Lead with FERPA and stop there if they nod. The rest — audit trail, RLS, role-based access — is there so their security review has nothing to flag. Calm and brief; you're removing objections, not selling.`,
  },
  {
    id: 'seeitlive',
    label: 'See it live',
    Component: SeeItLive,
    tone: 'blue',
    notes: `Stop talking. This is the handoff — alt-tab into the real app and walk the exact flow you just drew on the diagram: a real transcript going in, courses and GPA parsed, a compliant schedule out, the AI recommendation with its confidence, your approval, the push back to Infinite Campus. Don't narrate features — narrate the same five steps in the same order. Let the live product close the gap between "here's how it works" and "here it is working."`,
  },
  {
    id: 'close',
    label: 'Get started',
    Component: Close,
    tone: 'blue',
    notes: `Make the ask small and obvious: one pilot, one week. Don't add new information here — restate the promise ("give your counselors their time back") and point at the one button. Then stop talking and let them respond.`,
  },
]