import Hook from './slides/Hook'
import Stakes from './slides/Stakes'
import Meet from './slides/Meet'
import Flow from './slides/Flow'
import BeforeAfter from './slides/BeforeAfter'
import Proof from './slides/Proof'
import Compliance from './slides/Compliance'
import Rollout from './slides/Rollout'
import SeeItLive from './slides/SeeItLive'
import Close from './slides/Close'

// The full Schedule AI sales deck, on white. Narrative arc (Warikoo): pain →
// cost → solution → how → proof it works → trust → social proof → rollout → live
// → ask. `label` shows in the chrome + notes; `notes` are the presenter's spoken
// talking points (press N).
export const slides = [
  {
    id: 'hook',
    label: 'The reality',
    Component: Hook,
    notes: `Open on the pain, not the product (Warikoo). Ask the room how long one student's schedule takes by hand — the number is always bigger than leadership thinks. Then land the multiplier: one schedule × a 400-student caseload × every time a class fills. This is the workload nobody budgets for.`,
  },
  {
    id: 'stakes',
    label: 'Why it matters',
    Component: Stakes,
    tone: 'blue',
    notes: `Make it about students and staff, not software. Wrong courses = lost instructional time and angry parents. Missed graduation requirements = the nightmare scenario every director loses sleep over. Burnout = turnover in a role that's already hard to staff. You're naming the cost of the status quo.`,
  },
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
    notes: `Walk the line left to right, one node at a time. Two inputs merge into one pipeline: "drop a transcript PDF, and type in the course list — seven boxes, one per period." Then: it reads the record automatically — fuzzy-matches every course against the catalog, zero manual lookup. Next it runs the rule engine: prerequisites, grade level, live seat counts, and schedule conflicts, checked instantly. Stop on the warm diamond — that's the whole pitch: it proposes, the counselor disposes. The human makes the final call, sees the AI's recommendation and confidence broken down check-by-check, and can say no. Last node: the approved schedule pushes back to Infinite Campus with a full audit trail. End by pointing at the diamond again, then: "let me just show you live."`,
  },
  {
    id: 'beforeafter',
    label: 'Before / After',
    Component: BeforeAfter,
    tone: 'blue',
    notes: `Let the two numbers do the work. 2–3 minutes to review a waiver by hand, 10–15 seconds with Schedule AI — about 12× faster. The line that matters: multiply that across a term's waivers and it's hours of a counselor's time back. (2–3 min is the real manual figure; the seconds is our measured run.)`,
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
    id: 'rollout',
    label: 'Rollout',
    Component: Rollout,
    notes: `Make adoption feel small. "Live in a week, one counselor at a time, at your pace." The word that lands with cautious districts is "Ongoing — Support": they're not buying software and being left alone, they get a named contact and a security review.`,
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