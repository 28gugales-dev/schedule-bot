# Schedule AI / CCC — Pitch-Day Cheat Sheet
### Forsyth County Schools, GA · Live demo + slideshow · Counselor scheduling SaaS

> **Golden rule for today:** Sound confident about the *architecture* and the *pilot*, honest about what's *live vs. on the roadmap*. This audience (the district that produced 1EdTech's VP of K-12) will respect "here's exactly how it works and here's our pilot path" far more than buzzwords. Never claim an LLM, never claim a cert we don't hold, never claim live IC write-back is in production.

---

## 1. 30-Second Pitch + One-Liner

**The one-liner:** "Schedule AI is a counselor command center for course-request and waiver decisions — it reads the transcript, checks every graduation and prerequisite rule automatically, recommends a decision with transparent reasoning, and lets the counselor approve and push the result back to Infinite Campus with a full audit trail."

**The 30-second pitch:** "Building one student's schedule by hand takes minutes; across a 400-student caseload every fall, it's the biggest time sink in the building — and the place where a missed prerequisite or graduation requirement can cost a kid an on-time diploma. Schedule AI ingests the transcript, runs a **deterministic, fully-auditable rules engine** against your catalog and seat availability, and surfaces a recommendation with **per-rule pass/fail reasoning** and a confidence score. The counselor stays the decision-maker — they review the evidence in one screen, approve, and the system queues the change to sync back to **Infinite Campus** over **OneRoster**. It's **FERPA-built**, with **row-level security**, **role-based access**, and an **immutable audit log** of every decision. We complement IC — we don't replace your system of record."

**If pushed for the wedge:** "Our narrowest wedge is waiver and course-request review — the manual, judgment-heavy workflow IC's scheduler doesn't handle. A waiver that took 2-3 minutes by hand takes 10-15 seconds to review here, with the same human sign-off."

---

## 2. DATA — Where It Comes From & How It Gets In

**Q: Where does the student data come from?**
Two paths. **Counselor/student intake** (the live path): students submit waiver requests through a guided wizard — transcript upload, course list, waiver type — which lands as structured data in our **`requests` table**. And **OneRoster pull from Infinite Campus**: a server-side **edge function** reads `/students` and `/users/{id}/classes` from your IC **OAuth2** endpoint to hydrate rosters and enrollments. **Honest framing:** the intake path is live in our pilot backend today; the OneRoster pull is **built and code-complete but gated off until we have your IC sandbox credentials** — it returns a 503 until configured.

**Q: Do you touch our SIS directly?**
Only through the **standards-based OneRoster REST API**, and only **server-side** — IC credentials live in an encrypted server vault (**Deno Vault**), never in the browser. The pull is mapped **IC `sourcedId` → our local `sis_id`**. We never screen-scrape or hit your database directly.

**Q: Is it read-only?**
The roster/enrollment **pull is strictly read-only** — confirmed against OneRoster v1.1/v1.2 user, class, and enrollment endpoints; **no write API is used on the read side**. Writing changes back is a separate, gated, counselor-approved flow (see §3).

**Q: Real-time or batch?**
**Batch with on-demand override.** We re-read fresh IC enrollment state **at push time** to detect drift, and the queue auto-processes on a configurable cadence (e.g. every 60s in the dashboard) with a "**Force Sync Now**" button. We can support nightly batch or near-real-time depending on your IC contract.
*If pushed:* "We deliberately don't fight IC for real-time write authority — IC stays authoritative; we reconcile against it."

**Q: Do you ingest CSV?**
There's **no inbound CSV ingest in the current build** — intake is via the portal, rostering via OneRoster. (Our outbound *export* can produce a registrar CSV worklist — see §3 — but that's the push side, not ingest.)

---

## 3. PUSHING DATA BACK to Infinite Campus

**Q: Does it write to IC automatically?**
**No — never silently.** Approved changes enter a **push-state machine** with seven states: *queued → claimed → exported → imported → confirmed*, plus *failed* and *superseded*. It's **forward-only** (only `failed → queued` retries). A counselor's approval is what enqueues a row; a dedicated server-side **sync edge function** is the *only* thing that can advance the state — the browser can never forge a "confirmed." **Honest framing:** this state machine is built and stress-tested against a simulated IC; the **end-to-end auto-push is gated off** (the function returns 412 until a compliance flag is explicitly set after legal review). In a pilot we run the **manual export path** by default.

**Q: Can we review before anything writes?**
Yes — that's the whole design. Nothing reaches IC without (a) a counselor's explicit **Admit** decision and (b) the batch passing **re-validation against a fresh OneRoster pull** (enrollment-active check, GPA floor) at push time. The default transport mode, **`manual_ui_export`**, produces a **registrar worklist CSV** that a human registrar reviews and applies in IC — a human is always the last mile.
*If pushed:* "Our two transport modes are **`oneroster_csv_delta`** (automated OneRoster delta over SFTP) and **`manual_ui_export`** (registrar worklist). The SFTP automated path is stubbed pending district credentials; **the manual worklist is the functional path today** and keeps a registrar in the loop by design."

**Q: What if it pushes a bad change?**
Several guardrails. The push artifact carries **only operational enrollment keys** — `sourcedId`, `status`, `classSourcedId`, `schoolSourcedId`, `userSourcedId`, `role`, dates — **no grades, no demographics**. Pushes are **idempotent by `userSourcedId_classSourcedId` composite**, so a retry can't double-enroll. Rows with **missing IC sourcedIds are refused and routed to the manual worklist** rather than guessed. **Partial-failure handling** maps per-record outcomes; if a batch exceeds a configured row threshold it **fails the whole batch (retryable)** rather than half-applying. And **section Max Students in IC remains authoritative** — our seat holds are soft, application-layer reservations only.

---

## 4. SECURITY & PRIVACY

**Q: Is this FERPA-compliant? What's our liability?**
"We operate as a **school official with legitimate educational interest** under FERPA — you retain full ownership and control of all records; we're a **data processor**, no redisclosure. The strongest control is our **FERPA field allowlist**: when we pull from IC, only **`sisId`, `schoolSourcedId`, `gpa`, `attendanceRate`, `gradeLevel`, `enrollmentStatus`, `completedCourses`, `currentSchedule`** are permitted — we **explicitly block** SSN, birth date, sex, gender, race, ethnicity, address, guardian, free/reduced lunch, and special-ed flags. It's **allowlist-by-construction with a tripwire assertion** that halts persistence if a prohibited field ever appears."
*If pushed on SB 89:* "That allowlist *is* the documented **data-element inventory** Georgia SB 89 requires, and we never use data for advertising, profiling, or selling — prohibited under SB 89, and we contractually commit to it."

**Q: How is access controlled internally?**
**Role-based access with Postgres row-level security (RLS).** Auth is **Google OAuth**; counselors are elevated to an admin role. All data access is gated by an **`is_counselor()`** security check. The **push-state table is write-locked to the service-role sync function** — counselors can only INSERT a `queued` row, never UPDATE or DELETE state, preventing forged confirmations. **Edge functions are service-role (RLS-exempt) but each verifies the caller is an authenticated counselor before running**, and service-role keys never leave the server.

**Q: Encryption and hosting?**
Hosted on **Supabase (Postgres) in US data centers**, **encrypted at rest and in transit (TLS/HTTPS-only)**. Documents live in **access-controlled storage buckets** with **service-role-only access and short-lived signed URLs** for client download. The **`ic-exports` bucket has no authenticated read policy at all** — registrar access is via server-minted signed URLs, and the concentrated-PII OneRoster delta CSV is **deleted immediately after each run**.

**Q: What happens to our data if we leave?**
"We give you a **portable, standards-based export** — your data is in **OneRoster shape**, not a proprietary lock-in format — plus **`purge-student`**, a service-role deletion function, and a written deletion certification within an agreed window. Because rostering is OneRoster-native, nothing is stranded."

**Honest cert status (say this plainly if asked):**
- **Have / built-in:** FERPA-aligned architecture, field minimization, RLS, RBAC, audit log, encryption at rest/in transit, US hosting, documented breach-response policy page.
- **On the roadmap (be upfront):** **SOC 2 Type II** and a **third-party penetration test** are *not yet completed* — "we'll commit to a remediation timeline and can scope a pilot under a signed DPA in the meantime." **School-partitioned RLS** (per-district/per-school data isolation) is **not yet implemented** — today all counselors in a tenant see all requests; **multi-tenant isolation is a tracked roadmap item** we'd harden before a 54k-student rollout.
- **Will sign:** the **SDPC / A4L National DPA (NDPA v2) + a Georgia addendum**, and pursue an **SDPC Resource Registry** listing.

---

## 5. The "AI" Question

**Q: Where's the actual AI? Is this machine learning?**
"Honestly — it's a **deterministic, rules-based decision engine**, not an LLM or a trained model, and that's a deliberate design choice. Every recommendation comes from explicit checks: **GPA and attendance thresholds**, **prerequisite verification** against the course catalog, **schedule-conflict detection via interval-overlap math**, and **seat availability**. The 'AI' is the **explainability layer** — we show you *why* each rule passed or failed with the actual values, and synthesize a **confidence score from the count of passing verifiable checks**. **Same student, same transcript, same rubric = same decision, every time.**"

**Q: Is there a chatbot / could it hallucinate?**
"No chatbot, no neural network, **no hallucinations possible** — there's no generative model in the decision path. It's **pure functions, a directed-acyclic prerequisite graph with Kahn's topological sort, and hash-based seat checks**. We intentionally avoided black-box models so every decision is **fully auditable and defensible to families and appeal boards**."

**Q: How do you weight the score?**
"**Confidence = passing checks ÷ verifiable checks** — e.g. 3 of 4 verifiable checks pass → 0.75. **Hard-fail gates** (no seat, time conflict, unmet prerequisite) force a deny; missing docs force a 'review.' Each check carries a **transparent weight (1/n)** and a signed contribution you can see in the audit view. It's a **transparent stand-in for a model, by design** — and a human can override any recommendation, with the override flagged and logged."
*If pushed on fairness/bias:* "Because there's **no training data and no learned weights**, there's no opaque place for bias to hide — every rule is inspectable, and we test for consistent application across student groups by replaying the same rubric."

---

## 6. Feature Walkthrough (demo-tip forward)

### Student Portal
- **New Request (Waiver Intake)** — Guided multi-step wizard: upload transcript, enter courses, pick waiver type, answer conditional fields, **FERPA-consent** before submit. *Point:* clean structured intake instead of handwritten forms. *Demo:* upload a PDF transcript, watch GPA/grades parse and courses get recognized via **Levenshtein matching**.
- **Course Swap Panel** — Two-column picker; left = current schedule, right = eligible replacements, with ineligible courses **grayed out and labeled** (no seat, conflict, failed prereq). *Demo:* hover a grayed course to see exactly why it's blocked.
- **Upload Zone** — Drag-and-drop with **MIME/type/size validation and dedup**. *Demo:* drag a PDF in, then drop an unsupported file to show the inline error without losing form state.
- **My Requests (Tracker)** — Live status badges per request; if denied for a full class, a **"Notify me when a spot opens" waitlist** button. *Demo:* submit, then view `/student/requests` and click the waitlist subscribe.

### Counselor Command Center
- **Review Queue** — Sortable/filterable **AG Grid** of pending requests: name, ID, grade, GPA, waiver type, **AI recommendation + confidence %**. *Demo:* sort by confidence to surface the AI's most/least certain cases; enterprise skin adds global search.
- **Review Detail Cockpit** — Full-screen review: student profile (OneRoster when available), all submitted docs, **AI reasoning with pass/fail checks**, and **Admit / Deny / Flag** with a note. *Demo:* click a row → cockpit goes full-width → decide → **auto-advances to the next request**.
- **Rejected History** — Date-sorted archive of denials with reason + counselor note, for **appeals and institutional memory**. *Demo:* deny in the queue, watch it appear in `/admin/rejected`.

### Form & Rubric Builder
- **Form Builder (unified)** — Build/edit intake forms from a **15-type field palette**, drag-reorder, live preview, active/archive toggle; embedded **rubric/decision logic** so rules scale with the form. *Demo:* add a shortText + a select field, reorder, toggle active — it appears in student intake immediately. *Point:* counselors design new waiver types **without code**, and **form versions are snapshotted at request time** so rule changes never rewrite history.
- **Rubric / Decision Logic** — Eligibility checks (seat, GPA, prereq, conflict) with **pass/fail status shown in the cockpit**. *Demo:* expand "AI Reasoning" to see each check; the counselor's decision is logged as following or overriding.

### Team Analytics → see §7

### Audit
- **Activity Log** — School-wide trail: timestamp, actor (counselor/registrar/AI), action, student, waiver type, reason, device; **filterable + CSV export**. *Demo:* filter by actor, search a student, export CSV.
- **Counselor Decisions** — Decision-only slice with **override flags**. *Demo:* spot where a counselor disagreed with the AI.
- **Student Submissions** — Intake-completeness view. **AI Reasoning** — full per-check log with confidence and override. **Overview** — decisions today, **AI agreement rate**, override rate, pending sync.

### Batch Sync → see §3
- **Batch Sync Dashboard** — Queue of admitted requests awaiting IC sync with per-row state (**pending / synced / failed / superseded**); auto-sync countdown + **Force Sync Now**. *Demo:* admit a few, open `/admin/batch`, force a push.

### Resources
- **Shared Staff Library** — Upload/organize catalogs, prereq charts, policy docs by category, with size/date metadata. *Point:* single source of truth, kills email-attachment version chaos. *Demo:* add a "2026-27 Catalog" under "Course lists."

---

## 7. Team View — Why an Administrator Cares

**Q: What does the Team area give an administrator?**
"Three things. **Overview** is district KPIs — total requests, admit/deny/flag counts, **average decision time**, **AI agreement rate**, **override rate**, and **pending-sync count**. **Counselors** is the roster with each counselor's decisions, speed, override rate, and a **capability matrix** of which waiver types they're authorized to decide. **Activity** is a filterable, actor-based log of who did what, when."

**Q: Why do those numbers matter to me as an admin?**
"**Override rate and AI agreement** tell you whether the engine is calibrated to *your* district's standards — a high override rate is a signal to tune the rubric, not blindly trust automation. The **capability matrix lets you load-balance** — route waiver types to the counselors with authority and bandwidth. And **pending-sync count is an early warning** that the registrar push is lagging before it becomes a backlog."
*If pushed:* "It turns a black-box workflow into something an administrator can actually *manage* and defend in an audit."

---

## 8. Integration & IT

**Q: How do you integrate with Infinite Campus?**
"Through **OneRoster (v1.1/1.2)** — the **1EdTech** interoperability standard — for reading students, sections, and enrollments, and for the enrollment-change delta we write back. We map **IC `sourcedId` to our local IDs** and **re-validate against a live IC pull at push time**. IC stays your **system of record**; we reconcile to it."
*Tailoring hook (use it):* "We built deliberately to the **1EdTech / OneRoster** standard — which we know matters here given Forsyth's role in that community."

**Q: SSO — do staff need new passwords?**
"No new passwords is the goal. Auth today runs on **Google Workspace OAuth**, which your 1:1 Chromebook fleet already uses. **Clever, ClassLink, and SAML 2.0** for SSO and rostering are on our integration roadmap — standards-based, so wiring them is configuration, not custom code."
*Honest:* "Google SSO is live; Clever/ClassLink/SAML are roadmap — we'd confirm your preferred IdP in scoping."

**Q: Accessibility — WCAG / 508?**
"We build to **WCAG 2.1 AA** patterns — keyboard-navigable components, focus traps on dialogs, system-aware dark mode, custom accessible listboxes — and it runs cleanly in **Chrome on Chromebooks**. We'll provide a current **VPAT/ACR** as part of procurement."
*Honest:* "A formal third-party VPAT is something we complete during the procurement cycle — we'll commit to delivering it."

**Q: Can it handle all 8 high schools at once?**
"Architecturally yes — it's on **Supabase/Postgres** with stateless edge functions and **atomic, idempotent batch processing**, and seat contention is handled with **`pg_advisory_xact_lock`** so concurrent claims on the same section can't race. We've validated the internal pipeline under simulated load; for a 54,000-student rollout we'd run a **peak-concurrency test against your IC sandbox** during the pilot before district-wide go-live."
*If pushed:* honest — "Live IC-contract load against all 8 schools is exactly what the pilot proves; we won't claim it before we've measured it."

**Q: Uptime / where hosted?**
"**US-based Supabase infrastructure**, encrypted, with documented sub-processors. We'll commit to a concrete uptime SLA (targeting **99.9%**) and a named support contact in the agreement."

---

## 9. Commercial

**Q: What's the pricing model?**
"We price as an **annual district subscription**, scalable **per-school** so it grows with your footprint. For Forsyth that's the **8 high schools** in scope. We'll quote an **all-in Year 1** (license + implementation + training) separately from renewal so there are no surprises, and we're transparent about what's not in the base."

**Q: Can we pilot first?**
"Yes — and it's how we'd recommend starting. A **low-cost or no-cost pilot at one or two high schools for a semester**, with **defined success metrics** (decision time, counselor hours saved, override rate) and a **clean exit** if it doesn't hit them. One counselor at a time, at your pace."

**Q: Implementation timeline & training?**
"Onboarding is fast because rostering is OneRoster-native — Week 1 is configuration, IC sandbox connection, and piloting with one counselor; Week 2+ is school-wide rollout with ongoing support. Training is **live plus train-the-trainer** for counselors, registrars, and admins, included in the engagement."
*Honest framing:* "We say 'live in a week' about onboarding a counselor in the pilot — **a full production IC write-back integration follows the security review and sandbox validation**, not day one."

**Q: References — who else uses this?**
"We're early — **I won't pretend we have a live Georgia district to call yet.** That's exactly why we lead with a **paid pilot and hard success metrics** rather than overclaiming production scale. What we can show you today is the working product, the architecture, and our security posture — and you'd be a founding district partner shaping the roadmap."
*If pushed:* don't bluff — "Reference depth is our honest gap; the pilot structure is how we de-risk it for you."

**Q: What if you get acquired or shut down?**
"Three protections: your data is **OneRoster-standard and exportable** (no proprietary lock-in), we'll agree to **source-code escrow** and a **data-return + deletion plan** in the contract, and the pilot scope means you're never betting 54,000 students on us mid-year before we've earned it."

---

## 10. Hard / Skeptical Questions & Objection Handling

**Q: Why not just use Infinite Campus's own scheduler and Campus Workflow? We already pay for it.** *(The #1 objection.)*
"You should keep using IC for scheduling — **we complement it, we don't replace it.** IC schedules; we handle the **judgment-heavy review layer it doesn't**: counselor waiver workflow, **prerequisite/eligibility rule enforcement**, **seat-hold and waitlist logic**, batch review with an **audit trail**, and **explainable recommendations**. Then we **write the approved result back into IC over OneRoster** so it stays your system of record. We make IC's data more usable, not redundant."

**Q: Where's the real AI? This is just rule evaluation.**
"Correct, and that's intentional — see it as a feature. A **deterministic, auditable rules engine** means **no hallucinations, every decision traceable, and human-overridable.** For a workflow that can affect a student's diploma, **defensibility beats a black box.** We'd rather be honest that the 'AI' is transparent reasoning than oversell a model we don't use." *(This audience rewards this answer — do not bluff an LLM.)*

**Q: This is just a form builder with nicer UI — we could build a Google Form.**
"A Google Form can't **enforce prerequisites against your catalog**, **check live seat availability**, **write enrollment changes back to IC**, keep an **immutable FERPA audit trail**, or manage **seat holds and waitlists**. The form is the front door — the value is the **rules engine, SIS reconciliation, and audit layer** behind it."

**Q: You're a startup — what if you disappear mid-year?**
"**OneRoster-standard exportable data, source-code escrow, and a contractual data-return + deletion plan** — nothing's locked in a proprietary format. And we scope a **pilot** precisely so you never strand students before we've proven ourselves."

**Q: What's our FERPA / SB 89 liability if you mishandle data?**
"We sign as a **school official**, our **field allowlist** means demographics and identifiers like SSN, race, and guardian data **never leave IC**, we encrypt at rest and in transit on US hosting, and we'll sign the **NDPA + Georgia addendum** with breach-notification and indemnification terms. **We minimize the blast radius by construction** — the safest data is data we never pull."

**Q: SOC 2? Pen test? Will you sign our DPA before any pilot?**
"DPA — **yes, before any pilot, no question.** SOC 2 Type II and a third-party pen test are **not complete yet** — I won't tell you otherwise. We'll bring a **concrete remediation timeline** and scope the pilot under your signed DPA and security review in the meantime."

**Q: Can you handle every school's course-request window in the same two weeks?**
"The architecture is built for concurrency — **atomic advisory-lock seat claims, idempotent batch pushes, stateless functions.** We've proven the internal pipeline under simulated load; the **pilot includes a peak-load test against your IC sandbox** before we'd ever claim district-wide readiness."

**Q: We're reducing student screen time — why another student app?**
"Reframe: this is primarily a **staff-side tool for counselors and registrars** on managed Chromebooks. It **removes manual paperwork** and aligns with your distraction-free direction — students touch it briefly to submit a request, not to live in another app."

---

## 11. Landmines — Do NOT Overclaim

> Each item: the tempting-but-false claim, then the safe honest phrasing.

- **"It's AI / machine learning / it learns."** ❌ — It's a **deterministic rules engine**; there are no model weights or training data. ✅ Say: *"Transparent rules-based decisioning with an explainability layer — by design, so it's auditable."*

- **"Row-level security isolates each school's data."** ❌ *(The deck says this — it's false per our own architecture: RLS is NOT school-partitioned today; all counselors in a tenant see all students.)* ✅ Say: *"We use Postgres RLS and role-based access; per-school data isolation is the next hardening step on our roadmap before a multi-school production rollout."*

- **"It writes back to Infinite Campus automatically, live, today."** ❌ — The auto-push (SFTP/OneRoster delta) is **built but gated off and the SFTP transport is stubbed**; the functional path is the **manual registrar worklist**. ✅ Say: *"The write-back architecture and state machine are built and tested; in a pilot we run the **counselor-approved registrar worklist** path, with automated OneRoster delta push enabled after your security review and sandbox validation."*

- **"OneRoster pull / batch sync / seat holds are live in production."** ❌ — Those migrations (0008/0009/0011/0012) are **written and idempotent but not yet confirmed applied**; the app still runs **demo localStorage paths** for batch/OneRoster/IC push. ✅ Say: *"That's code-complete and ready to enable against your IC credentials — live in the pilot once we connect your sandbox."*

- **"We're SOC 2 certified / pen-tested / WCAG-audited."** ❌ — Not yet. ✅ Say: *"On our compliance roadmap with a committed timeline; we'll sign your DPA now and complete those during procurement."*

- **"A Georgia district / IC district is already live on us."** ❌ — No live reference exists. ✅ Say: *"You'd be a founding district partner — which is why we lead with a metrics-driven pilot."*

- **"Live in production within one week."** ❌ as stated. ✅ Say: *"A counselor can be onboarded and piloting within a week; full production IC integration follows the security review."*

- **"Clever/ClassLink/SAML SSO is built."** ❌ — Only **Google OAuth** is live. ✅ Say: *"Google Workspace SSO today; Clever/ClassLink/SAML are standards-based roadmap items."*

---

## 12. Power Phrases / Glossary

Drop these naturally to sound fluent:

- **OneRoster** — the 1EdTech/IMS Global interoperability standard for exchanging rosters, courses, and enrollments between an SIS and an app. Our integration language.
- **SIS (Student Information System)** — Infinite Campus, here. Your **system of record**; we reconcile to it, never override it.
- **1EdTech (IMS Global)** — the body that maintains OneRoster. Forsyth's institutional DNA — name-drop it.
- **`sourcedId`** — OneRoster's stable unique identifier for a student/section/enrollment. We map it to our local IDs; rows missing one are refused, not guessed.
- **FERPA** — federal student-privacy law; we operate as a **"school official with legitimate educational interest."**
- **Georgia SB 89** — GA's student-data-privacy act; bans selling PII, ad targeting, non-educational profiling; requires a **data-element inventory** (our field allowlist is exactly that).
- **NDPA v2 (SDPC / A4L)** — the National Data Privacy Agreement districts sign; GA negotiates district-by-district, so bring it ready + a GA addendum.
- **RLS (Row-Level Security)** — Postgres-enforced access control at the row level. (Honest: role-based today, school-partitioning on roadmap.)
- **RBAC (Role-Based Access Control)** — student vs. counselor/admin permissions.
- **Field allowlist / field minimization** — only an approved short list of fields ever leaves IC; everything else is blocked by construction. *The* security headline.
- **Idempotent push** — re-sending the same change can't double-apply (keyed on `userSourcedId_classSourcedId`).
- **Push-state machine** — the 7-state, forward-only lifecycle (queued → claimed → exported → imported → confirmed / failed / superseded) governing every write-back.
- **Reconciliation / re-validation** — re-reading fresh IC enrollment at push time to catch drift before applying.
- **Audit trail** — immutable, actor-stamped log of every decision, submission, and AI evaluation; CSV-exportable for appeals.
- **Deterministic rule engine** — same inputs → same output, every time; the honest description of our "AI."
- **Confidence score** — passing verifiable checks ÷ total verifiable checks; transparent, not a model output.
- **Prerequisite graph / Kahn's topological sort** — the DAG we use to validate course prerequisites and dependency impact.
- **`pg_advisory_xact_lock`** — the Postgres lock guaranteeing two counselors can't grab the same last seat simultaneously.
- **Edge function (Deno, service-role)** — server-side code holding IC credentials and the only thing allowed to advance push-state or pull from IC.
- **Signed URL** — short-lived, server-minted link for document/registrar-worklist access; no standing read access to private buckets.
- **`purge-student`** — our service-role deletion function for data-return/right-to-be-forgotten on exit.
