import Hook from './slides/Hook'
import Stakes from './slides/Stakes'
import Meet from './slides/Meet'
import HowItWorks from './slides/HowItWorks'
import Demo from './slides/Demo'
import BeforeAfter from './slides/BeforeAfter'
import Compliance from './slides/Compliance'
import Proof from './slides/Proof'
import Pricing from './slides/Pricing'
import Rollout from './slides/Rollout'
import Close from './slides/Close'

// The full Schedule AI sales deck, on white. Narrative arc (Warikoo): pain →
// cost → solution → how → proof it works → trust → social proof → price →
// rollout → ask. `label` shows in the chrome + notes; `notes` are the presenter's
// spoken talking points (press N).
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
    id: 'how',
    label: 'How it works',
    Component: HowItWorks,
    notes: `Keep it to three sentences — one per step. The point of this slide is "no data entry, no rule-checking by hand, and you still approve everything." If someone worries about accuracy, that's step three: it proposes, the counselor disposes.`,
  },
  {
    id: 'demo',
    label: 'See it in action',
    Component: Demo,
    notes: `This is where you stop talking and play the recording (or run it live). Narrate the flow once: "Here's a real transcript going in… courses and GPA parsed… a compliant schedule out… and the audit view that shows why." Let the product carry the slide. (Placeholder frame until the real screen-capture is dropped in.)`,
  },
  {
    id: 'beforeafter',
    label: 'Before / After',
    Component: BeforeAfter,
    tone: 'blue',
    notes: `Let the two numbers do the work. 2–3 minutes to review a waiver by hand, 10–15 seconds with Schedule AI — about 12× faster. The line that matters: multiply that across a term's waivers and it's hours of a counselor's time back. (2–3 min is the real manual figure; the seconds is our measured run.)`,
  },
  {
    id: 'compliance',
    label: 'Built for compliance',
    Component: Compliance,
    notes: `This slide is for the procurement and IT people in the room, not the counselors. Lead with FERPA and stop there if they nod. The rest — audit trail, RLS, role-based access — is there so their security review has nothing to flag. Calm and brief; you're removing objections, not selling.`,
  },
  {
    id: 'proof',
    label: 'The difference',
    Component: Proof,
    tone: 'blue',
    notes: `State the core claim plainly and let it land: a waiver that took two to three minutes to review by hand now takes ten to fifteen seconds — the same careful review, without the manual hours. No quote, no testimonial (no deployed schools yet); the metric itself is the proof.`,
  },
  {
    id: 'pricing',
    label: 'Pricing & ROI',
    Component: Pricing,
    notes: `Don't sell the price — sell the math. Say one number and stop: roughly twelve hundred a year per counselor, everything included. Then flip it: it gives each of them about forty hours back a term. At their loaded hourly rate, the seat is paid off in the first week. You're not asking for budget, you're handing back time. (All figures are placeholders — swap in their real seat count and loaded hourly cost before you walk in.)`,
  },
  {
    id: 'rollout',
    label: 'Rollout',
    Component: Rollout,
    notes: `Make adoption feel small. "Live in a week, one counselor at a time, at your pace." The word that lands with cautious districts is "Ongoing — Support": they're not buying software and being left alone, they get a named contact and a security review.`,
  },
  {
    id: 'close',
    label: 'Get started',
    Component: Close,
    tone: 'blue',
    notes: `Make the ask small and obvious: one pilot, one week. Don't add new information here — restate the promise ("give your counselors their time back") and point at the one button. Then stop talking and let them respond.`,
  },
]
