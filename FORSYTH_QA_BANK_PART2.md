# Part 2 — Extended Question Bank (by stakeholder)

> Companion to `FORSYTH_PITCH_CHEATSHEET.md`. Same honesty rules apply: never claim an LLM, never claim a cert we don't hold, never claim live IC write-back in production. Where an answer is gated/demo/roadmap, the truthful framing is kept. This bank deliberately retains as many distinct, useful questions as possible — skim it live by section.

---

### ⚠️ Needs a founder decision before pitch

Pre-decide these so you give a firm answer in the room (each = the one call to make):

- **Per-school list price** — fix a per-school annual number you can multiply on a board slide.
- **One-time vs recurring split** — is there a platform/setup fee, or is it folded into implementation? What recurs.
- **Add-school mid-term pricing** — price-locked, pro-rata, co-terminus rate when 8→10 schools.
- **No-overage guarantee** — will you put "no usage-based overage" (syncs/storage/parse) in writing?
- **Multi-year discount + price lock** — the discount ladder and whether you lock price for 3 years.
- **Renewal escalation cap** — CPI-or-X% ceiling so there's no renewal-shock.
- **Most-favored-customer / founding-partner discount** — full MFN, or founding discount + cap?
- **Payment terms** — Net-30 on acceptance? milestone billing? no full annual prepay to a startup.
- **Accept district paper** — invoice against district PO + master terms, no auto-renew clickwrap?
- **Termination-for-convenience + non-appropriation** — confirm you'll accept both (GA often requires).
- **Pro-rata refund on exit** — refund of prepaid fees on termination, or use-it-or-lose-it?
- **Cooperative purchasing vehicle** — pursue Sourcewell/GA DOAS/E&I listing? on what timeline?
- **E-Verify + GA registration + W-9** — confirm enrolled/registered (O.C.G.A. 13-10-91 requires affidavit).
- **Cyber-liability + tech E&O insurance** — current limits, and will you name district as additional insured (have COI ready).
- **Indemnification / liability cap structure** — accept a privacy/breach carve-out (uncapped or super-cap) vs fees-paid cap?
- **Breach-notification SLA** — the hard hour-count (recommend ≤72h) and who bears notification/forensics/credit-monitoring cost.
- **Bond requirement** — can you bond, or substitute escrow + milestone billing as the exposure cap?
- **SLA service-credit ladder** — concrete credit bands tied to the license fee, plus P1/P2/P3 severity matrix and response/resolution times.
- **Peak-window support** — is war-room support during scheduling windows included or an upsell? business-hours-only or extended/on-call?
- **Named CSM + backup** — who is the named success contact, their backup, and the coverage chain.
- **Status page + incident-comms** — commit to a hosted status page and incident runbook before district-wide go-live?
- **Source-code escrow terms** — agent, release triggers (insolvency/cease/uncured breach), who funds it, quarterly deposits + self-host runbook.
- **Change-of-control clause** — district consent to assignment; DPA + pricing + escrow survive acquisition.
- **Data retention windows** — default per-element retention mapped to GA records-retention; build per-element TTL automation?
- **De-identified reuse** — is it on the table at all? If not, flat contractual "no" (costs nothing — engine needs no aggregate data). If yes, the suppression standard/threshold.
- **US data-residency clause** — verify edge-function region pinning + backup residency before committing to "no non-US processing."
- **Audit-log immutability mechanism** — Postgres-permission-enforced append-only, hashed, or both; who can read/export; retention term.
- **IP in audit log** — retain full IP, truncate, or drop? (home-Chromebook IP adds PII for marginal value).
- **Metadata minimization** — document each audit metadata element in Exhibit E; drop/hash what fails minimization.
- **PPRA form governance** — add a protected-category guardrail/approval gate to the no-code Form Builder + contractual no-collect clause.
- **Self-declared disability field** — allow an "I have an IEP/504" intake field at all? if yes, add encryption/retention terms; if no, keep it counselor-side in IC.
- **Verify no third-party OCR/parser** — confirm transcript parsing is fully in-environment before signing Exhibit F (sub-processors).
- **Waitlist notification transport** — confirm whether the waitlist sends external email/SMS; if a third-party vendor, disclose as sub-processor.
- **Training hours** — publish a firm per-counselor figure (e.g. 90-min session + office hours) and whether new-hire re-training is bundled or billed.
- **Georgia grad-requirement starter rubric** — ship a GA/Forsyth requirement starter set at onboarding, or blank slate?
- **Capability matrix enforcement** — is it a hard permission gate or a routing recommendation? (matters for true approval restrictions).
- **Queue aging/escalation** — add time-based auto-escalation for stale pending requests, or rely on dashboard monitoring?
- **Counselor reassignment workflow** — build reassign/delegation for a sick counselor's queue, or rely on IC?
- **Read-only principal role + per-school dashboards** — add a principal-scoped oversight role and per-building reporting (gated on per-school RLS)?
- **Specialist counselor roles** — model named roles (504/ESOL counselor) or is waiver-type authorization enough?
- **Parent-facing layer** — build parent login / notifications / appeals portal, or rely on IC Campus Parent + counselor?
- **Spanish/multilingual UI** — commit to at least Spanish UI + assisted-intake as the official LEP path, and a timeline.
- **Save-and-resume intake draft** — commit to durable cross-session draft (extended-time accommodation)?
- **VPAT timeline** — commit a date (recommend ≤30 days post-kickoff) for a third-party VPAT incl. AG Grid a11y pass.
- **Company disclosure** — decide what runway / funding stage / headcount / team bios / K-12 background you'll state; a board will ask directly.
- **District pipeline disclosure** — how to honestly describe other district conversations (this audience can verify).
- **Money-back-on-miss** — offer a fee credit/refund tied to missing agreed pilot thresholds?
- **Community-engagement owner** — who owns the parent-communication timeline (recommend district leads, you support).
- **Liability allocation for registrar-applied errors** — DPA language on who bears a wrong-change-applied error.
- **Per-school RLS remediation date** — the committed date for school-partitioned isolation, written into the DPA.
- **K-8 roadmap** — commit a rough timeline or keep open (recommend earn the HS win first).
- **Compliance milestone dates** — hard dates for SOC 2 / pen test / per-school RLS, with termination triggers if missed.
- **Who flips the auto-push gate** — district consent (mutual), not unilateral vendor flip.

---

### IT & Infrastructure

**Q: What are your API rate limits, and can the backend handle 500+ concurrent intake submissions if all 8 schools hit the portal at once during waiver windows?**
No published rate limits yet — the architecture is stateless with **Postgres advisory locks** for seat contention, not request throttling. We need a **peak-load test against your IC sandbox** during the pilot to measure real concurrency; that test is a required gate before production. Recommend staggering school onboarding to validate the load profile.
*If pushed:* the pilot framework gives you visibility before any district-wide commitment.

**Q: What happens if IC is behind a proxy/firewall that blocks outbound to unknown hosts — how do we allowlist your IPs?**
Our **edge functions** run on Supabase-managed infra, so your network team allowlists outbound HTTPS to Supabase's domains (routed through Cloudflare; we don't provide static IPs). We give you the exact domains and cert pins during onboarding and validate the connection in your IC sandbox before go-live. Static-IP allowlisting would be a custom request scoped with Supabase.
*If pushed:* dynamic infra behind a CDN is the standard SaaS trade-off for uptime and DDoS protection.

**Q: How much bandwidth does the student portal use per request — can we estimate monthly Chromebook impact?**
We haven't profiled end-to-end bandwidth yet. Intake is low-volume (text form + one PDF per student per fall cycle); for a 54k district that's maybe 100-200 submissions per school per year, so impact should be negligible. We'd profile real Chromebook clients in the pilot and optimize (lazy-load previews, compress uploads) if your connectivity is constrained.

**Q: How does this integrate with our Google Workspace MDM — sandboxing, clipboard, custom CAs?**
It's a **web app over HTTPS** — you don't install it, so MDM governance applies at the browser/Chromebook-OS level, not as a special integration. Your MDM can enforce Chrome policies, block insecure origins, pin certs, and "block unmanaged devices" via our Google OAuth identity. Custom root CAs just need to be in your Chromebook trust store; our traffic flows through them.

**Q: What's your logging/observability story — can you trace a "I approved but it never synced" request, and do you export to our SIEM?**
The **audit table is queryable from the admin dashboard** (filterable activity log, CSV export), and we log all edge-function invocations internally. Honest gap: **no syslog stream or SIEM integration yet** (roadmap for larger districts). For the pilot you'd use dashboard logs plus read-only audit-table query access; real-time SIEM streaming is custom, scoped during procurement.

**Q: Do you have a public status page for outages during waiver season?**
Not yet (roadmap). For the pilot we commit to a **named support contact** notifying you of outages within 15 minutes; Supabase publishes its own infra status page. Before production we'd stand up a branded status page and an SLA in the contract.

**Q: When you pull OneRoster, what if IC is slow or times out — do you retry, and what does the counselor see?**
The pull is server-side. A counselor's review loads the **cached roster snapshot** from the last successful pull; if IC times out, the review shows "enrollment status unknown — contact admin" rather than failing silently. We retry with **exponential backoff** (3 attempts over ~30s). At push time, if IC is unreachable the push fails and routes to manual review rather than racing IC's real state. Review is fast (cached), push is conservative (verified live) — safer, not faster.
*If pushed:* we favor correctness over speed — a delayed push beats a bad one.

**Q: How are the IC OAuth credentials in "Deno Vault" rotated — who reissues an expired refresh token?**
We store the IC OAuth token (and refresh token if IC issues one) in Deno Deploy's **encrypted KV store** and auto-refresh before expiry. If IC requires manual re-auth, you re-grant OAuth in our admin dashboard. **No automated credential rotation yet** — IC's OAuth policy determines the cadence, and we'll follow their pattern. *(See founder list: secret-access policy + rotation cadence.)*

**Q: What if IC makes a OneRoster schema change — new required field, deprecated field, changed sourcedId format?**
OneRoster is a **1EdTech standard**, so IC shouldn't break schema unilaterally. We map `sourcedId → sis_id`, so we're safe as long as it's present; new fields we ignore unless needed. A deprecated field we use is a breaking change — we'd update, test against your sandbox, and deploy. No automated schema-change detection yet; a pilot gives us time to build the IC-coordination partnership.
*If pushed:* OneRoster stability is IC's commitment; we stay current and notify you.

**Q: Can I export a complete audit trail for a single student — every API call, OneRoster read, document download?**
The audit log captures **intake submissions, counselor decisions, push state changes, and AI reasoning**, filterable by student with CSV export. Honest gap: we **don't yet log individual OneRoster API calls or row-level document downloads**. For a FERPA response or subpoena the dashboard audit is solid; forensic API-call logging is a hardening request scoped during procurement.

**Q: What's your data-retention policy by data type, and can we adjust it?**
No formal published policy yet. Honest default thinking: audit logs indefinite; **OneRoster snapshots ~30 days rolling**; intake documents per your FERPA record-keeping rule. You own the retention decision — we encode your windows into the contract and onboarding config. *(Founder list: per-element retention + TTL automation.)*

**Q: Can I export audit data for a legal hold in a tamper-proof, locked format?**
We export **timestamp-signed audit CSV** (hash-verifiable, tamper-evident) — but that's a point-in-time snapshot, not a legally-locked hold. True legal-hold immutability needs custom setup (DB write-locking audit rows, WORM/immutable-blob storage, or a signed DB backup), scoped with your compliance team. *(Founder list: audit immutability mechanism.)*

**Q: What's your minimum browser version — will IE 11 or JS-disabled work?**
Modern **Chrome, Firefox, Safari (2+ back), Edge**. **IE 11 won't work** (ES2020), and the app requires JavaScript (React). Chromebooks are golden. Safari-on-iPad works but touch-keyboard behavior isn't fully tested — we'd validate in the pilot. Legacy-IE users would need a modern browser.

**Q: What's the latency from a counselor clicking submit to the registrar's worklist being ready?**
Submit → DB insert is **<500ms**; batch push to build the worklist is **~5-10s** (re-validate against IC, build + sign CSV) — happy-path, without real IC load. True end-to-end needs a sandbox load test; if your IC API is slow, that dominates. We'd commit a measurable SLA once we've measured your IC performance.

**Q: How do you handle sandbox vs production IC environments — can we flip without reconfiguration?**
Today we **don't separate environments** — you provide one set of OAuth creds (sandbox OR production), updated in the admin dashboard. Recommend piloting against your IC test environment, then migrating creds to production. Parallel sandbox + production instances (keep testing while live) is custom, scoped in procurement.

**Q: What if the push-state machine gets stuck — a batch "claimed" but never completes?**
State transitions are logged DB updates. A sync that times out mid-claimed **retries on the next batch cycle**; stale `claimed` locks older than ~15 min are reclaimed and re-queued. Honest gap: **no stuck-row alert wired yet**. Today you see stuck rows in `/admin/batch` and an IT-restricted server function can reset a row to `queued`. For production we'd add stale-threshold alerting + a safe reset/cancel button.

**Q: A counselor floats across schools — what stops School A's counselor from seeing Schools C–H?**
Honest: **it's not isolated yet.** Today all counselors in a tenant see all requests — RLS is role-based, not school-partitioned. School-level isolation is a **tracked roadmap item** to harden before multi-school production. Fine for a 1-2 school pilot; for all 8 you'd want counselor-to-school assignments, school-filtered RLS, or separate tenant instances.
*If pushed:* it's a real architectural gap for district-wide rollout — a multi-school pilot exposes exactly what isolation you need.

**Q: How do I add a counselor — does it auto-sync from Google Workspace / Clever?**
Today a district admin **manually creates** the counselor user in the admin dashboard; we read Google OAuth on login to confirm identity but **don't auto-sync your directory**, and **Clever/ClassLink sync isn't built**. Manual provisioning is a friction point at 30+ counselors — Workspace directory sync or Clever rostering is a roadmap item scoped in enrollment planning.

**Q: When a counselor leaves or moves, how is their data handled?**
**Audit entries are immutable** — their decisions remain logged with their name. Login access is revoked on roster deletion; their pending requests stay in queue for another counselor to re-review (no auto-archive). We have `purge-student` but **no `purge-counselor` yet** — full personal-data erasure for a departing counselor is custom offboarding work.

**Q: Can Schedule AI provision/deprovision users via SCIM from our IdP?**
Not yet — we support **Google Workspace OAuth** for login; **Clever/ClassLink/SAML are roadmap**, SCIM 2.0 inbound is not built. It's a standard enterprise feature that would solve manual provisioning at scale; if SCIM is a requirement we'd scope and prioritize it (likely Q2–Q3 2026 depending on funding).

**Q: Webhooks vs polling — does IC push to you or do you poll?**
We **poll** (configurable, default ~60s) and re-read at push time. IC webhooks aren't built and many IC deployments don't expose them to third parties; polling is simpler and safer (no inbound API). Downside: a closed seat may not appear until the next poll + refresh. We'd consider webhooks if your IC exposes them — an enhancement, not a pilot requirement.

**Q: Do you have a VPAT — can a blind counselor use it with a screen reader?**
We build to **WCAG 2.1 AA** (keyboard nav, focus management, semantic HTML, ARIA). A **formal third-party VPAT isn't completed** — that's a procurement deliverable. Have your accessibility team test with NVDA/JAWS in the pilot; we fix findings and commit a VPAT before production. Honest gap: dense **AG Grid** data grids are the hardest surface and haven't had a dedicated a11y audit. *(Founder list: VPAT timeline incl. AG Grid pass.)*

**Q: Can a parent see their kid's waiver is pending, or is this internal-only?**
Currently **internal staff** (counselors, registrars, admins). Students get a basic intake portal (submit + status badge); there's **no two-way comms, parent notification, or appeals portal**. A parent layer (email/SMS/IC parent-portal integration) is a roadmap item scoped in procurement.

**Q: How do we know about breaking changes to your OneRoster sync or audit API — do we update custom dashboards?**
No **formal API versioning strategy yet**. The OneRoster integration follows 1EdTech versioning; our internal endpoints aren't published as a stable public API. If you build custom dashboards on direct DB queries you'd depend on our Postgres schema. For production we'd commit to an API changelog, semantic versioning, and a deprecation window.

**Q: Two counselors review the same student at once — do you lock the record?**
We **don't lock during review** — both can open the detail view, but only the first Admit/Deny is accepted; the second sees "already processed." No pessimistic record-lock UI yet (e.g., "locked by Counselor A"); for a large team that could cause rework, and we'd add claim-on-review if it's a pilot pain point.
*If pushed:* first-decision-wins is simple; record locking is an enhancement if you need it.

**Q: What's your disaster-recovery/backup story — RTO/RPO, tested restores, scheduled copies?**
Supabase runs on **AWS US** with automatic daily backups in geo-redundant S3; restore is hours, not minutes. We **don't have a tested/published RTO/RPO yet**. For production we'd publish tested RTO/RPO, run quarterly restore drills, and offer automated daily exports to storage you control. *(Negotiated in the enterprise agreement.)*

**Q: If IC swaps REST for GraphQL, are we stuck until you release?**
IC has committed to **OneRoster v1.1/v1.2 long-term**, so a full API swap is unlikely without years of notice. A field change or new auth requirement we'd address in weeks, tested against your sandbox first. We'd commit to monthly checks of IC's OneRoster changelog, sandbox compatibility testing, and advance notice to you.

**Q: What's your incident-response plan and notification timeline for a breach?**
We sign a **DPA with breach-notification and indemnification terms** and commit to notifying you **within 24–48 hours** of discovery, with a summary of data accessed, containment steps, forensic timeline, and FERPA-notification recommendations. Honest: **no third-party IR team on retainer yet** and the runbook isn't tabletop-tested — that's a maturity item we'd formalize before production. *(Founder list: breach SLA + IR plan.)*

**Q: Who else touches our data besides Supabase and Deno Deploy?**
Main sub-processors are **Supabase** (Postgres + storage) and **Deno Deploy** (edge functions). GitHub holds code only (not data). We may add a logging/monitoring vendor (Sentry/Datadog) and a helpdesk tool — all listed in the **DPA sub-processor addendum** before pilot, with notice of changes. No payment processor touches student data. *(Founder list: verify no third-party OCR.)*

**Q: What's your support response time and channels — phone or email?**
Pilot: **email support, 2-hour response target, business hours (M–F 8–5 ET)**. Production scales up to priority email + Slack + an account manager depending on contract size. Phone isn't staffed yet. SLA goes in the contract. *(Founder list: SLA + support model.)*

**Q: Can we export our custom forms, rubrics, and decision logic on exit — not just rosters?**
Forms and rubric logic are **JSON-defined**; on exit we provide JSON form/rule definitions, request/decision CSV, and audit logs in CSV/JSON. The JSON is vendor-neutral (readable, but our schema). Not portable: our Postgres field names — you'd map those to another system. **Source-code escrow** means you could rebuild the forms if needed.
*If pushed:* data is exportable; full re-implementation elsewhere needs your engineering effort.

---

### Privacy, Legal & Compliance

**Q: Your field allowlist governs the IC pull — but students free-type course lists and upload full transcripts. How do you keep prohibited PII out of the request record?**
Correct distinction: the **FERPA field allowlist** constrains only the OneRoster pull. The student-submitted path (transcript PDF, free-text fields) is a separate ingestion surface where demographics could be volunteered. Today the uploaded transcript is **stored whole** in an access-controlled bucket and parsed for GPA/grades/courses; we don't strip race/DOB from the PDF. Honest remediation: add **intake-side minimization** (server-side redaction/scrubbing of parsed transcripts) and document the transcript bucket as in-scope concentrated PII in the data-element inventory.
*If pushed:* the safe claim is "allowlist-by-construction on the SIS pull"; the human-supplied transcript is retained intact today — a remediation item I won't paper over.

**Q: Will you produce a complete data-element inventory (Exhibit E) and sub-processor list (Exhibit F) across ALL four collection points before pilot signature?**
Yes — a four-surface inventory: (1) the OneRoster pull (eight allowlisted fields), (2) intake-wizard fields + transcript contents, (3) audit-log records, (4) the outbound push payload (`sourcedId`, status, class/school/user sourcedIds, role, dates — no grades/demographics). Pull and push are tightly specified; intake and audit surfaces need formal enumeration for Exhibit E. Exhibit F sub-processors: **Supabase (US Postgres) + the IC OneRoster endpoint**.

**Q: Who's controller vs processor for a transcript a STUDENT uploads directly — does that create an independent relationship with the student?**
The **district stays controller** (functionally owns the education record) and we're the **school official** on the district's behalf for both paths. The student upload doesn't create an independent data relationship — it's an education record entering a district-sanctioned workflow under "legitimate educational interest," with no redisclosure. Cleanest DPA framing: define us as processor for **all** ingestion surfaces and have the district explicitly authorize the student-intake channel.

**Q: Does COPPA apply to under-13 dual-enrollment students, and do you rely on the school as consent agent?**
COPPA is triggered because the portal collects personal info **directly from a child online**; FTC guidance lets the **school provide consent** when use is strictly the educational purpose. We rely on the district as the **COPPA consent agent** under the school-consent mechanism and contractually limit collection-from-children to the scheduling purpose — no behavioral advertising, no commercial use, deletion on request (aligns with SB 89). Most users are 13+, but the contract should still carry the COPPA school-consent clause.

**Q: Can you fulfill a FERPA parental inspection and amendment request against data in YOUR system within 45 days?**
Inspection: a counselor pulls a student's request history, documents, per-rule AI reasoning, and decision/override records — a scoped export of what we hold. Amendment: the **audit log is intentionally immutable**, so corrections **append** a corrected record + counselor annotation rather than rewriting history (the FERPA-defensible approach). Honest gap: **no one-click "parent inspection packet" export today** — a straightforward feature; we'd commit contractually to your 45-day inspection/amendment obligations.

**Q: Families may call a confidence-scored Admit/Deny an "automated decision about a student." How do you ensure a human is the real decision-maker, with evidence?**
The **counselor is the legal decision-maker** — nothing advances without an explicit Admit/Deny/Flag, and every decision logs whether it followed or overrode the engine. **Override-rate and agreement-rate telemetry** is the evidence of independent judgment; a 100% agreement rate is itself a rubber-stamp red flag we surface. Because the logic is **deterministic and inspectable** (per-rule pass/fail with actual values), an appeal board can reconstruct exactly why a recommendation read the way it did — more defensible than an opaque model. No GDPR-Art.22-style automated decision: there's always meaningful human involvement.

**Q: What's your written retention schedule mapped to Georgia's records-retention rules?**
Today the one hard, documented window is that the **concentrated-PII OneRoster delta CSV is deleted immediately after each sync run**. Intake submissions, transcripts, and audit logs aren't yet governed by an automated schedule — they persist until `purge-student` is invoked. **Needs decision:** implement configurable per-element retention windows mapped to Georgia's schedule, written into the DPA. The deletion primitive exists; the time-based automation and policy mapping don't yet.

**Q: When we invoke right-to-be-forgotten, does purge-student reach backups and the immutable audit trail, or does PII survive in recoverable backups?**
Honest: `purge-student` deletes **live records**, but two layers need explicit treatment. The **immutable audit log** is retained for evidentiary integrity, so true erasure must **tombstone/pseudonymize** the student identifier in audit rows (or be governed by a documented exception). **Managed Postgres point-in-time backups** retain prior states for the provider's backup window, so erased PII persists in backups until they roll off — a standard processor reality we disclose, not hide. Defensible commitment: live deletion + certification immediately, audit pseudonymization on request, backup expiry within the documented window — no false "instantly gone everywhere" claim.

**Q: What's your contractual maximum time-to-notify on a breach — not "as required by law"?**
**Needs decision.** We have a documented breach-response policy; the notify-SLA, named contact, and cost allocation are DPA terms. Defensible commitment: notify the district's designated contact without undue delay and **no later than a fixed window (many GA districts demand ≤72 hours)** after discovery or reasonable suspicion; provide forensic detail for your own notifications; reimburse legally required notification/remediation costs caused by us. Founder sets the firm hour-count and the cost-coverage cap.

**Q: Can you place a per-student litigation hold, and will you refuse to respond directly to third-party legal demands for our students' data?**
On non-response: **yes, unconditionally and contractually** — as school official we don't own the records, so we won't respond to any third-party subpoena or records request; we notify the district promptly and let you direct the response (no redisclosure). On the hold: a per-student freeze of purge/TTL is the right capability — trivially satisfiable today (nothing auto-purges except the delta CSV), but we'd add a **formal hold flag** that overrides future TTL deletion when we build the retention scheduler. Both go in the DPA.

**Q: Will you contractually prohibit using our student data for product development, cross-district benchmarking, or model training?**
**Yes** — student data used solely to deliver the service to your district: no cross-district benchmarking, no product-improvement use, no model training (consistent with SB 89). Genuinely easy to honor because **there is no model to train** — the engine is deterministic with no learned weights, so no technical incentive to harvest. Aggregate analytics are computed **within your tenant**, not pooled. We'll accept a clause that any de-identified aggregate use requires your prior written consent.

**Q: If you ever de-identify, what standard prevents re-identification of a small, longitudinal student population?**
Default: we **don't de-identify/reuse data**, so the safest stance is no de-identified datasets without your written approval and agreed method. If ever, FERPA requires removing direct + indirect identifiers and a reasonable no-re-identification determination — for small populations that means **k-anonymity-style small-cell suppression** (suppress cells below a threshold like 10) and avoiding the grade+GPA+waiver-type+school quasi-identifier combo you flagged. **Needs decision:** whether de-identified reuse is even on the table; cleanest answer is a flat contractual no (costs nothing — the engine needs no aggregate data).

**Q: When you change a sub-processor, what notice do we get and can we object or terminate?**
We commit to a **change-notice clause**: a current published sub-processor list, **advance written notice (commonly 30 days)** before adding/replacing a sub-processor touching student data, and a right to object and terminate without penalty for a material change. The surface is intentionally small today — **Supabase + the IC OneRoster endpoint**, no third-party analytics or ad tech in the student-data path. Any addition updates Exhibit F so your SB 89 inventory stays accurate.

**Q: Confirm all student data — at rest, in transit, in backups, and processing — stays in the US.**
Hosting is **US-based Supabase** (Postgres + storage); records live at rest in the US. The honest nuance: **edge functions and authentication** are the surfaces to pin down. We must confirm and contractually commit that edge functions are **region-pinned to the US**, backups remain US-resident, and Google OAuth handles only the auth token exchange (not student-record processing). **Needs verification before signing a US-residency clause** — the data store is US, but I won't assert zero non-US edge/auth processing until regions are pinned and documented.

**Q: Will you indemnify the district for breach claims, penalties, and notification costs — capped at fees, or uncapped for data breaches?**
**Needs decision** (commercial term). Defensible posture: accept indemnification for third-party claims and breach costs from our DPA breach or negligence, including legally required notification expense. The contested point is the cap — districts increasingly require **data-breach/privacy liability carved OUT of the general cap** (uncapped or a super-cap) while ordinary contract liability stays capped at fees. As an early company, expect to negotiate a super-cap backed by cyber-insurance limits; we'll be transparent that our insurance informs what we can responsibly sign.

**Q: Do you carry cyber-liability and tech E&O insurance, at what limits, and will you name us as additional insured?**
**Needs decision** — not asserted in product facts. Honest: the founder must confirm whether cyber-liability and tech E&O are in force and at what limits and commit to a **certificate of insurance** during procurement. For a 54k-student footprint districts typically expect cyber coverage in the low-millions; an early company should be candid and willing to scale coverage as a contractual condition tied to rollout phase. A 1-2 school pilot reduces exposure.
*If pushed:* state real current coverage — a CPO will verify with a COI request, so have it ready or be candid that coverage scales with contract phase.

**Q: Your pulled fields aren't directory information. Do you treat everything as protected, and do you honor a FERPA directory-info opt-out flag?**
Yes — we treat **every pulled field as protected education-record data**, never directory information; GPA, attendance, enrollment status, completed courses are squarely protected, never published or redisclosed, so we don't rely on the directory exception. We **don't currently ingest a directory-info opt-out flag** because we make no directory-style disclosures (all access is internal to authorized counselors). If your workflow needed to surface that flag, it's not in the allowlist today and we'd add handling. We minimize risk by treating all pulled data as protected by default.

**Q: Whose consent does your in-wizard FERPA step actually capture — and is it the legally correct party?**
The consent step captures the **submitting user's acknowledgment** (for a high-schooler, typically the student). Because the FERPA right rests with the parent until 18 (then transfers to the **eligible student**), a student-only click is acknowledgment of process, not a substitute for required parental consent. The correct framing: most of this workflow needs **no parental FERPA consent at all** — it's internal use by a school official with legitimate educational interest (a FERPA exception). So the click is a **transparency/notice artifact**, not the legal basis. Honest improvement: label it acknowledgment/notice, capture an age-aware record (parent vs eligible student), retain it as evidence, and rely on the **school-official exception** as the lawful basis.

**Q: Your audit log records the actor's "device" — what metadata, and justify it under data minimization?**
The log captures actor, action, student, waiver type, reason, timestamp, and a device descriptor for **non-repudiation**. We should disclose precisely what "device" resolves to — likely user-agent and IP — and justify it: it makes the decision trail evidentiary for appeals, a legitimate purpose, but **IP and geolocation aren't strictly necessary** for a counselor-side decision log and should be minimized/truncated for student-side submissions. **Needs decision:** document each element in Exhibit E, drop/hash what fails a minimization test (truncate IP, omit geolocation).

**Q: When a counselor leaves, does deprovisioning in Google Workspace immediately cut access, or do you keep a separate list that goes stale?**
Access is gated two ways: **Google Workspace OAuth** for authentication and an internal role (`is_counselor()`) for authorization. **Disabling a user in Workspace cuts authentication immediately at your IdP** — the strongest lever, in your hands. The nuance: the elevated role is a separate record on our side, so a fully clean offboarding means Workspace deprovisioning **and** role removal. We'd document the runbook and, on the roadmap, support SCIM so role revocation tracks your directory automatically.

**Q: RLS isn't school-partitioned — a School A counselor can open a School H student. Isn't that over-broad access? Timeline and interim control?**
Correct, stated plainly: **per-school RLS partitioning isn't implemented**, so all counselors in a tenant currently see all requests. Under FERPA, legitimate educational interest is meant to be **need-to-know specific**, so cross-school visibility exceeds that — a genuine pre-rollout gap, not a feature. Interim controls: scope the pilot to **one or two schools**, restrict counselor accounts administratively, and rely on the immutable audit log to detect out-of-scope access. The fix — school-partitioned RLS as a hard boundary — is a tracked roadmap item we commit to completing **before any multi-school production rollout**, with a remediation date in the DPA.
*If pushed:* I won't call cross-school visibility a non-issue — it's an over-broad-access finding; the honest mitigation is narrow pilot scope + audit logging until partitioned RLS ships.

**Q: Where are IC OAuth and service-role keys stored, who can access them, and what's your insider-threat control? A compromised service-role key bypasses all RLS.**
IC credentials live in an **encrypted server-side vault (Deno Vault)**, never in the browser; service-role keys are server-only and RLS-exempt by design — the crown jewels. Honest: who can read the vault, separation of duties, rotation cadence, and access logging on the keys themselves are **operational items not fully specified today** ("few people, but we need to formalize it"). **Needs decision:** least-privilege secret access, a rotation schedule, audit logging on privileged key use, documented in the DPA security section — exactly what roadmap **SOC 2 Type II + a third-party pen test** are meant to validate (both not yet complete).

**Q: Will you sign that the district owns all student data and you acquire no surviving license — including no perpetual rights to "aggregated" or "derived" data?**
**Yes** — a clean ownership clause: the district owns all data; we acquire only a **limited license** to process it to deliver the service; the license terminates on contract end except to complete the agreed export and deletion; **no perpetual or surviving license** to aggregated or derived data. Straightforward because there's **no business model premised on owning your data** — no training, no resale (also barred by SB 89), aggregate analytics computed in your tenant. We're comfortable with the strictest version.

**Q: Does your transcript parsing call any external OCR/API — i.e., does a student's transcript leave your environment to an undisclosed sub-processor?**
The described parsing — **Levenshtein** course matching and GPA/grade extraction — is **deterministic in-process logic**, not a generative model and, as built, not an external AI call. The point to nail down is whether PDF text extraction uses any third-party OCR/document API. If fully in-environment, no extra sub-processor and no redisclosure; if any component ships the transcript out, that vendor must appear on Exhibit F. **Needs verification** — our design intent is to keep transcript processing entirely within our US Supabase/Deno environment with no third-party parser.
*If pushed:* an undisclosed transcript handler would be a redisclosure violation — verify before signing Exhibit F.

**Q: Enrolling a student in a credit-recovery or special-program section can itself reveal sensitive status. Have you assessed that inference risk, and who at IC sees it?**
Sharp point — **inference risk**, not field-level PII. The payload carries only operational enrollment keys, but placing a student into a specific section can imply sensitive status. Two mitigations: the push writes back into **IC, your own system of record**, so the recipient is the district's own registrar/IC environment under your existing access controls — no new external audience; and we only enqueue **counselor-approved** changes a district staffer already decided. We haven't formally documented this as an inference-disclosure assessment — honest commitment to include it in the privacy review and confirm the push audience is district-internal.

**Q: Give me your actual incident-response runbook — has it been tabletop-tested?**
Honest: we have a documented **breach-response policy page**, but a full, **tabletop-tested IR runbook** with defined roles, detection sources, containment, forensic preservation, and the district-notification workflow is a **maturity item, not yet exercised** — consistent with SOC 2 Type II and a pen test still being roadmap. **Needs decision:** produce a NIST-style written IR plan, define the notification SLA/contact, and run at least one tabletop before district-wide rollout. For a pilot we share the current policy + draft runbook and commit to maturing and testing it under the DPA timeline.

**Q: On exit, what's the return-then-destroy sequence and window — we need the export verified BEFORE destruction.**
Agreed — **return-verify-then-destroy**, not simultaneous. Mechanics exist: a **OneRoster-shape export** + `purge-student`. Commitment: deliver the full export within an agreed period (e.g., 30 days), allow a **verification/hold window** to confirm completeness and request re-export, then run `purge-student` and issue **written deletion certification** within a defined window after your sign-off. Exact day-counts are a DPA term; the principle — no destruction before a confirmed-good export — we accept and will build the workflow to enforce.

**Q: Does the waitlist "notify me" feature send email/SMS — introducing a communications sub-processor and contact-data obligation?**
The waitlist implies an outbound notification, so a real surface to pin down. If delivered, we'd store a contact identifier (likely the **district Google email**) and send via some transport — any third-party email/SMS provider becomes a **sub-processor on Exhibit F**. The minimizing design: use the existing district Google identity and **in-app status badges**, avoid SMS/personal-phone collection. **Needs verification:** confirm whether the waitlist currently sends external notifications and via what vendor; keep contact data to district-issued identifiers so no new personal PII enters the inventory.

**Q: Will the DPA grant us audit rights — security assessment, SOC 2 review, controls inspection — and will you complete our HECVAT before pilot?**
**Yes** — an audit-rights clause: complete your security questionnaire (**HECVAT-Lite** or GA equivalent) before the pilot, share **SOC 2 Type II** once obtained, and permit a reasonable assessment/third-party audit under NDA, scoped to protect other tenants. We're upfront that SOC 2 and a pen test aren't complete — interim transparency via the questionnaire, architecture review, field-allowlist + RLS docs, and a committed remediation timeline. This is also how a founding-partner district keeps leverage while we mature.

**Q: Do you assess PPRA, and what stops a counselor from building a Form Builder field that collects a PPRA-protected category (income, beliefs, psych data)?**
Strong governance point. The **no-code 15-type field palette** lets counselors add arbitrary fields, so **nothing technically prevents** a well-meaning field touching a protected category (e.g., family income for a hardship waiver). Today the guardrail is **policy and training, not a technical block**. PPRA mainly governs surveys/protected-info collection; for a waiver workflow the risk is incidental but real. **Needs decision:** add Form Builder governance — a restricted-field warning or admin approval for protected-category fields — plus a contractual no-collection clause. We'd surface this in the privacy review rather than claim a control that doesn't exist.

**Q: How do you reconcile audit immutability with a deletion request when a student's decision is referenced in an immutable log and a snapshotted form version?**
A genuine tension we name rather than hide. **FERPA actually favors retaining the decision record** — districts have records-retention obligations, and an audit trail supporting a diploma-affecting decision generally must persist for the retention term and any litigation hold; right-to-be-forgotten isn't absolute against those duties. Resolution: on a deletion request we **erase/pseudonymize the student's identifying data in live records and remove the source transcript**, but **pseudonymize rather than destroy** the audit and form-version snapshot so decision integrity and your retention duty survive without direct identifiers. The DPA states this explicitly — pseudonymize the audit, fully delete the rest — so neither obligation silently overrides the other.

---

### Counseling & Workflow

**Q: How do I sell this to a veteran counselor who's done waivers on paper for 15 years and doesn't trust software near a kid's schedule?**
Lead with the **time math, not the tech**: a waiver that takes 2-3 minutes by hand reviews in 10-15 seconds, and the counselor still makes every call. The framing that lands: "the engine does the rule-checking grunt work, you keep the judgment." Pilot with one willing counselor per building first; let peer proof, not a mandate, drive adoption.
*If pushed:* we never auto-decide — the counselor's Admit/Deny/Flag is what moves anything, so it's an assistant, not a replacement.

**Q: When the engine is wrong, who has final authority, and how hard is it to override?**
The **counselor has final authority** on every request; the engine only recommends. Override is a **one-click Admit/Deny/Flag with a note** in the Review Detail cockpit, logged in the audit trail as "counselor overrode AI." Disagreement is a first-class, defensible action, not a hack.
*If pushed:* because recommendations are deterministic rule checks, a counselor can see exactly which rule fired and decide it doesn't apply to this kid — no black box to argue with.

**Q: How many hours of training before a counselor is productive, and what does train-the-trainer look like across 8 buildings?**
Core training is short because the workflow mirrors what they already do — review evidence, decide, note — and Google login means no new password. The model is live training + **train-the-trainer** for counselors, registrars, and admins, included in the engagement; the design goal is a counselor piloting within their first week. *(Founder list: publish a firm per-counselor hour figure, e.g. a 90-min session + office hours.)*

**Q: Our ratio is ~400:1. Is this built for that load, or for a boutique caseload?**
Built for **400:1**: the Review Queue is a sortable AG Grid where you can **sort by confidence** to triage most/least certain cases first, and the cockpit **auto-advances** after each decision so you work a batch without re-navigating. The engine does the repetitive rule-checking so scarce minutes go only where judgment is needed.
*If pushed:* sorting by confidence is the load-balancing move — routine approvals clear fast, low-confidence cases get human attention.

**Q: We build the master schedule in IC over the summer. Where does this sit relative to that?**
**Downstream of your master schedule, not in competition.** IC builds and owns sections; we read section/seat data over OneRoster and operate on the request/waiver layer — moving an approved student into an existing section. IC stays the system of record and we reconcile to it at push time.
*If pushed:* Section Max Students in IC stays authoritative — our seat holds are soft application-layer reservations, so we can't oversubscribe.

**Q: The hardest cases have social-emotional context no rules engine can see. How do you keep counselors from deferring to a context-blind recommendation?**
By design the human stays decider precisely because the engine is **blind to SEL context** — it only checks GPA, attendance, prerequisites, seats, conflicts, and shows that's all it checked. There's no chatbot telling a counselor what to do; there's a transparent checklist plus a confidence score, and the counselor adds the context the engine can't see in the decision note. The **override-rate metric** is your early warning if counselors are rubber-stamping sensitive case types.
*If pushed:* we surface the rule evidence and stop — we don't manufacture a narrative about the student.

**Q: Can a counselor leave notes another counselor sees later — and is the note permanent record or a scratchpad?**
Yes — every decision carries a counselor note captured in the **immutable audit trail** (decision, actor, timestamp, reason), and denied requests keep reason + note in **Rejected History** for appeals. Honest caveat: today all counselors in a tenant share visibility, so notes are effectively collaborative — good for handoffs, but there's **no private scratchpad** separate from the official record yet.

**Q: When a student is reassigned between counselors mid-year, does the new person inherit full history?**
Yes — request, documents, AI reasoning, prior notes, and decision history live in **shared structured tables**, not one counselor's inbox; Rejected History and the audit log preserve why prior decisions were made. Trade-off: there's **no per-student counselor assignment or partitioned ownership** yet — frictionless handoffs, but no "this is your caseload only." *(Same roadmap as per-school RLS.)*

**Q: Am I opening counselors to liability if they approve a recommendation that denies a kid a graduation requirement?**
Accountability stays with the counselor as decision-maker, but the system **reduces** exposure. Because the engine is deterministic and shows the actual transcript values per check, the decision is fully documented and defensible to a family or appeal board — you can show exactly which graduation/prerequisite rules were checked. The immutable audit trail records what was known at decision time, which is the counselor's best protection.
*If pushed:* a black-box AI would increase liability; a transparent rule engine that shows its work decreases it.

**Q: Is this trying to replace counselors? If my board reads it as "cut positions," it's a non-starter.**
No — and that framing would be a misuse. It's a **staff-side productivity tool** that removes paperwork from the most repetitive part of the job so counselors spend more time on relationships, SEL, parent conferences, judgment calls. It never decides; the counselor does. The board pitch is "same headcount, more time freed for students."
*If pushed:* reframe for the board as capacity recovery — it gives existing counselors back the hours a 400:1 ratio steals.

**Q: Our worst pinch is the summer crunch — thousands of requests in two-three weeks. Does this help or just move the bottleneck?**
This is the window it's designed for — throughput gains compound when volume spikes. Sort by confidence to clear high-certainty approvals fast and concentrate hours on judgment cases; batch review + auto-advance is built for a large queue. The architecture handles concurrency — **`pg_advisory_xact_lock` seat claims** and **idempotent batch pushes** — so counselors don't collide on the last seat.
*If pushed:* peak-load against all 8 schools' real IC contract is exactly what the pilot's peak-concurrency test proves before district-wide go-live.

**Q: In an angry-parent conference, can I pull up exactly why a waiver was denied, in plain language?**
Yes — the Review Detail cockpit and audit view show each rule as a plain **pass/fail with actual values** ("Grade level >= 11: failed, student is grade 10"), plus the counselor's note and decision. Because it's deterministic, the explanation is the same every time and isn't a generated narrative that drifts.
*If pushed:* you can export the audit record as CSV for an appeals board, so documentation goes beyond what you say verbally.

**Q: How do I know recommendations are equitable across student groups? In Georgia that's real scrutiny.**
The equity story is structural: **no training data, no learned weights**, so no opaque place for bias to hide — every recommendation applies the same explicit rules identically, and you can replay the same rubric to verify consistent application across groups. And the **FERPA field allowlist** means race, ethnicity, sex, free/reduced lunch, and special-ed flags never enter the engine — it literally can't key on a protected characteristic it never sees.
*If pushed:* same student, same transcript, same rubric, same decision — that reproducibility is what lets you audit for disparate impact, which a black-box model can't offer.

**Q: Counseling is full of legitimate exceptions. Does this fight those or accommodate them?**
Built so **typical-but-not-mandatory bands are advisories, not gates** — the catalog's upper grade range is display metadata, not a hard ceiling, so a junior taking a course listed for 9-10 isn't blocked. Where a rule does fail, it surfaces the failure and the counselor can **override with a logged note**. The system encodes routine rules so the human focuses on the exceptions that need a person.
*If pushed:* hard-fail gates (no seat, time conflict, unmet prerequisite) force a deny recommendation, but the counselor can still override even those — the gate informs the human, it doesn't bind them.

**Q: If counselors lean on this, what happens to their skill over time?**
Because the tool **shows its reasoning** rather than hiding it, it reinforces rather than erodes skill — a counselor sees every prerequisite and graduation check spelled out, closer to a teaching aid than a black box. It surfaces the same evidence they'd gather manually, faster, and the override/audit design keeps them in the reasoning loop.
*If pushed:* watch the override rate — if it trends to zero on cases that should have nuance, that's your signal to coach against rubber-stamping.

**Q: Can I configure which counselors decide which waiver types? Some I want restricted to leads or to me.**
Yes — the Team area includes a **capability matrix** showing which waiver types each counselor is authorized to decide, plus role-based access (student vs counselor/admin). Honest limit: the depth of that permissioning today vs a full delegated-approval workflow. *(Founder list: is the matrix a hard permission gate or a routing recommendation?)*
*If pushed:* decide whether the matrix is enforced as a hard gate — that distinction matters for a director who wants true approval restrictions.

**Q: Counselors are out all summer and stretched in fall. If a request sits unactioned, does it rot or escalate?**
Today the safeguard is **visibility, not automated escalation**: the Review Queue shows all pending requests with live status, and Team Analytics surfaces pending counts, average decision time, and pending-sync count so an admin sees a backlog forming. There's **no automatic reassignment or SLA-timer escalation** yet. *(Founder list: add time-based auto-escalation?)*
*If pushed:* an aging/escalation rule (flag requests pending >N days to a lead) is a clean pilot ask — not in the build today.

**Q: How does a counselor know whether to trust a 75% confidence score?**
Confidence is **not a mysterious probability** — it's literally passing verifiable checks ÷ total verifiable checks, so 3 of 4 = 0.75, and you can expand to see which check didn't pass. It's a **completeness indicator**, not a gut feeling. Low confidence usually means missing documentation or an unmet check needing human review — exactly when to slow down.
*If pushed:* hard-fail gates force a deny and missing docs force a "review" regardless of the percentage, so the score never overrides the gating logic.

**Q: What does this do to my relationship with registrars, who own IC data entry?**
It keeps the registrar **in the loop by design**: the default transport is a **registrar worklist CSV** — the counselor approves, but a human registrar reviews and applies the change in IC, so the registrar stays the last mile. They get a clean, validated worklist instead of ad-hoc emails and handwritten forms. The fully automated push exists but is **gated off until your security review**.
*If pushed:* the worklist carries only operational enrollment keys — no grades, no demographics — so the registrar sees exactly what they need.

**Q: If a counselor approves a change and the parent later disputes it, how far back can I reconstruct, and how long is history kept?**
You can reconstruct the full chain: the **immutable audit trail** captures the submission, every document, the AI reasoning with actual values, the counselor's decision and note, the actor, the device, and the timestamp — CSV-exportable. Because the log is append-only and counselors can't edit state, the record is tamper-evident. Open item: the **contractual retention period** is a DPA term to set, alongside `purge-student` for exit. *(Founder list: retention window.)*

**Q: Will this feel familiar to counselors who live in IC, or a new mental model?**
It maps onto the existing mental model — review evidence, decide, note — rather than IC's section-building paradigm. The vocabulary is the work they already do: transcript, prerequisite, seat, waiver, approve. The Google login they already use slots it into the Chromebook workflow without a new credential.
*If pushed:* we complement IC, not replace it — counselors keep their IC habits and gain a faster review layer on top.

**Q: How do I keep my rubric in sync with our real graduation requirements and catalog, which change yearly — and who maintains it?**
Your staff maintain it **without code**: the Form Builder lets counselors edit intake forms and embedded decision logic, and rules are **data-driven off your course catalog** (prerequisites, minimum grade). Form versions are **snapshotted at request time**, so changing a rule mid-year never rewrites a past decision. The Resources library holds your authoritative catalog and prereq charts.
*If pushed:* annual catalog rollover is something we'd handle together in onboarding the first year, then your staff owns it — no engineering ticket to change a prerequisite.

**Q: What stops the override-rate metric from being used punitively against a counselor exercising good judgment?**
The metric is explicitly a **calibration signal for the rubric, not a counselor scorecard** — a high override rate is a signal to tune the engine to your district's standards, not to discipline. As director you set how it's used; tell counselors it's there to fix the rules, not police them, or you'll poison adoption.
*If pushed:* if overrides cluster on one rule, that's the rubric talking, not the counselor — the data points you at the rule to fix.

**Q: We have differentiated counseling roles — 504, college/career, grade-level. Does the tool understand those or treat everyone as one "counselor"?**
Today it primarily distinguishes **student vs counselor/admin**, with the capability matrix adding which waiver types each can decide — so you can route categories to the right specialist. Honest limit: it **doesn't yet model rich role types** like "504 counselor" as a first-class concept. *(Founder list: model named specialist roles or rely on waiver-type authorization?)*

**Q: If we pilot and counselors hate it, how do I walk it back without disrupting a cycle or stranding data?**
The exit is built into the pilot: one or two schools for a semester with defined success metrics and a **clean exit**. Because the default path is a registrar worklist a human applies to IC, **IC remains your source of truth** — walking away doesn't unwind enrollments. Data exports in **OneRoster shape** with a deletion certification, so nothing's stranded in a proprietary format.
*If pushed:* running the manual worklist path means there's no automated write-back to disentangle — the off-ramp is just stopping; IC was never overwritten.

**Q: Counselors huddle on tough cases. Does this support collaboration or silo each decision?**
Shared visibility makes collaboration the default: today all counselors see all requests, documents, AI reasoning, and prior notes, so a team can huddle with the same evidence. Flip side: there's **no formal "request a second opinion" or co-sign workflow** yet — collaboration is via shared access and notes, not a structured consult feature.
*If pushed:* a structured second-counselor sign-off would be a clean pilot enhancement; today collaboration is informal via shared access.

**Q: How does this handle a student appealing a denied request? Appeals are real and high-stakes.**
The appeal-support pieces exist even without a formal appeal state machine: **Rejected History** is a date-sorted archive of every denial with reason + note, and the full audit record is **CSV-exportable** to hand a board the exact basis. Because the engine is deterministic, you can re-run the same rubric to show consistent application. What's not built is a **dedicated appeal-request workflow** with its own status — a candidate enhancement.
*If pushed:* a first-class appeals workflow with its own states is a reasonable roadmap ask; today the documentation and reproducibility are already in place.

**Q: Does the AI ever auto-decide on its own, even for obvious cases, to save me time?**
**No** — there is no auto-decide, even for high-confidence routine cases. A counselor's explicit Admit/Deny/Flag is the only thing that resolves a request, by design, so every decision has a named human owner in the audit trail.
*If pushed:* auto-approval would be the easy feature and the wrong one — keeping a human on every decision is the whole defensibility model.

**Q: At onboarding, do my counselors hand-build the rubric from scratch, or do you bring Georgia graduation requirements pre-loaded?**
Rules are **data-driven off your catalog**, and onboarding is where we configure that together (Week 1: configuration + IC sandbox connection). Honest: I shouldn't claim a pre-loaded Georgia template exists out of the box — the engine enforces the prerequisite/grade rules in your catalog plus the rubric your staff defines. *(Founder list: build a GA/Forsyth requirement starter rubric to cut config time?)*

**Q: Counselors are mandated reporters. If a counselor sees something concerning, does the tool create a record that complicates that — or is it neutral?**
**Neutral by construction**: it only ingests an allowlisted set of academic fields and explicitly blocks demographics, guardian data, and special-ed flags, so it isn't surfacing or recording the sensitive personal context a mandated-reporter situation involves. It logs scheduling decisions, not welfare observations; those duties live entirely outside this system.
*If pushed:* the safest data is data we never pull — by not ingesting welfare-relevant fields, we stay clear of anything that intersects with reporting obligations.

---

### Registrar & SIS Mechanics

**Q: What fields are in the registrar worklist CSV so I can action it in IC without cross-referencing another system?**
The manual export includes **operational enrollment keys** (`sourcedId`, status, `classSourcedId`, `schoolSourcedId`, `userSourcedId`, role, dates) plus the human-readable course name and student name from our local data, so you can search and enroll directly in IC. *(Founder list: finalize the exact field set in pilot scoping — minimal PII vs human actionability.)*
*If pushed:* if the worklist proves hard to action, we add reconciliation columns (IC section name, seat count, conflict notes).

**Q: Do you flag courses carrying Georgia Milestones EOC assessments or HOPE weighting?**
Today the engine reads IC's `gpa` field as a threshold input — if your IC course record carries a Milestone flag or HOPE weight, it's already baked into that GPA — but we **don't re-render those flags** in our decision UI; that's IC's domain. Surfacing Milestones/HOPE metadata in the cockpit is a roadmap item scoped during pilot.
*If pushed:* we could pull the flag from OneRoster's course metadata if IC populates it and add a visual indicator.

**Q: How do you handle dual-enrolled / MOWR students so we don't double-seat them or break a college transcript?**
Honest gap: today the engine checks enrollment conflicts **within our IC pull scope** — if IC records the college enrollment in a parallel section, conflict detection catches it — but **MOWR sync and college-enrollment dedup is uncovered**. We'd need your district's college-enrollment source and sync cadence to scope it.
*If pushed:* pilot scope could include a dedicated MOWR intake form and manual cross-check with college partners.

**Q: When a student transfers in mid-year, how do you ingest their transcript to validate prerequisites — student PDF or automated request from the prior district?**
**Student-supplied PDF upload** via the transcript-intake wizard is live (Levenshtein fuzzy matching parses course names and GPA). **Automated inter-district OneRoster pull is not built** — you'd upload the transcript or contact the sending school. The audit log tracks the decision chain.
*If pushed:* if you have an automated inter-district transcript service (e.g., a GA-DOE student-records portal), we can scope a connector during pilot.

**Q: We map course codes to GaDOE state course numbers. Can I store both, and do you respect that mapping on push?**
The push artifact carries IC's **`sourcedId`** and doesn't invent or crosswalk course codes — so an IC→GaDOE mapping stays in IC and we just push the sourcedId. A dual-code catalog reconciler is a roadmap item, not in scope today.
*If pushed:* we could add a course-metadata field in the rubric builder to store GaDOE codes for reference — wouldn't affect the push, but helps your audit.

**Q: How do you handle transcript parsing errors so a student isn't wrongly denied or admitted on bad data?**
Misparses are caught at the **human review stage**: the counselor sees the parsed GPA, transcript image, and matched courses before deciding, and can flag "review" or "deny" so the student resubmits/corrects. We also **refuse any request missing a sourcedId or with unresolvable course matches** — those route to manual review, never auto-admit. A systemic parse bug would need a rerun or manual correction.
*If pushed:* the pilot should include a test set of district transcripts with known-good parses to validate accuracy before live use.

**Q: At semester/year end, how do catalogs, seat counts, and prereq rules roll over — re-upload each term or versioning?**
Form versions are **snapshotted at request time** (rule changes don't rewrite history), but the **annual catalog swap** sits at the boundary between your IC maintenance cycle and our app — you'd likely upload a fresh catalog each term, and we'd nail down the rollover process and cutoff dates in onboarding. *(Founder list / pilot scoping item.)*
*If pushed:* we could add a "Catalog Version" toggle and a dated archive — pilot defines the workflow.

**Q: If a section has 30 seats and three counselors review simultaneously, can two claim the last seat and overenroll?**
No — we use **`pg_advisory_xact_lock`** (atomic row-level locking) to serialize seat claims on the same section, so concurrent approvals can't race; the second sees the section full and is denied atomically. The hard authority is always **IC's Max Students** — our holds are app-layer reservations, and IC's `enrollmentStatusDetails` rejects anything past it.
*If pushed:* pilot load-testing against your IC sandbox confirms concurrency behavior under peak registration.

**Q: If a counselor admits a student and then I override it in IC (drop/change grade), how do you detect drift and avoid re-pushing the old approval?**
At push time we **re-validate against a fresh OneRoster pull** — if the enrollment is no longer active or GPA dropped below threshold, we halt that row and mark it **`superseded`**. A still-valid stale decision pushes idempotently by sourcedId; a conflicting one routes to the manual worklist for registrar review. True rollback of a confirmed push is a new superseding change — IC remains authoritative.
*If pushed:* if a correction is needed, the registrar unenrolls in IC directly and we detect it on next sync.

**Q: For prerequisites, how do you handle an out-of-district course not in our catalog — block the student or require manual override?**
If the prior-school course doesn't fuzzy-match (Levenshtein) any catalog course, it stays unresolved and may force a **"review" flag** if it's critical to a prerequisite chain; the counselor then decides — accept as equivalent, ask for GaDOE equivalency, or deny. There's **no auto-fallback** to accept unmatched courses.
*If pushed:* we could add a manual equivalency-override field in the cockpit for counselors to document their call.

**Q: Does the system know Georgia's grade-level promotion rules (age, credits, EOC) and warn if an enrollment change puts a student off track?**
Honest gap: **promotion is computed by IC and GaDOE** based on age, credits, and Milestone status. We consume IC's `gradeLevel` but **don't re-implement GA promotion logic**. Flagging off-track enrollments would require integrating GaDOE promotion rules — a roadmap item scoped once we see your criteria.
*If pushed:* pilot scope could include a registrar checklist — "verify this student is on track to graduate."

**Q: In the cockpit, if a student's GPA is 3.4 but AP needs 3.5, can the counselor document an override, and does it affect future decisions?**
Yes — the cockpit has a **note field** for override rationale, written to the immutable audit log and surfaced as override rate per counselor in analytics. The override **doesn't retroactively reweight** future decisions — each request is evaluated fresh against the same ruleset (consistency over learned behavior; we're not an ML model).
*If pushed:* pilot analytics should track whether override patterns suggest the AP GPA threshold should be tuned.

**Q: If an approved waiver sits in the push queue a week and attendance drops below threshold, do you catch it before syncing?**
Yes — push-time re-validation includes **`attendanceRate`**; if it's now below threshold the enrollment is rejected and routed to manual review rather than silently pushing a stale decision. The queue shows pending-sync counts so an admin spots backlog early.
*If pushed:* registrars should check the pending-sync dashboard daily to prevent week-long queues.

**Q: Can each school's registrar review only their school's requests, or does central office see all 8 at once?**
Today **all counselors/registrars in a tenant see all requests** — RLS is role-based (counselor vs admin), **not per-school**. For 8 schools that's a gap; **school-partitioned isolation is a tracked roadmap item** to harden before live production. *(Founder list: per-school RLS remediation date.)*
*If pushed:* pilot starts with one school or a trusted group; school isolation is implemented before multi-school rollout.

**Q: How do you handle withdrawn / homebound / alternative-school enrollment statuses so you don't re-enroll someone who's gone?**
OneRoster's **`enrollmentStatusDetails`** carries active/withdrawn/custom statuses; we respect IC's authoritative status at pull and re-check at push. Mapping your specific homebound/alternative codes is a pilot question — you'd map your IC status values to our engine and define which auto-deny vs flag for review.
*If pushed:* pilot checklist — map all your IC enrollment statuses and define which auto-block re-enrollment.

**Q: Can a parent at home upload a malicious file, or is there file-type/size validation?**
**MIME/type/size validation** is live — the upload zone rejects unsupported files before form state is lost; files land in an access-controlled bucket with **service-role-only access** and student/parent access via short-lived signed URLs. The student portal is public-facing, so standard web security (XSS/CSRF) is in scope — a **third-party pen test (roadmap)** verifies those before production.
*If pushed:* the pen test confirms all student-facing inputs are sanitized.

**Q: For a FERPA records request, can I export a student's waiver history and audit in a usable format quickly?**
Yes — the **Activity Log and Counselor Decisions** are CSV-exportable, filterable by student (timestamp, actor, action, notes) — built for exactly this. For a full FERPA response you'd export what we hold, and `purge-student` is the inverse for data-return/deletion.
*If pushed:* test the export format against your FERPA-response template during the pilot.

**Q: If the OneRoster connection drops during the day, do requests pile up silently or fail-fast?**
The pull is server-side and cached; if IC is unreachable the system returns a **503** and the cockpit alerts counselors that IC data is stale. A sync that detects unreachable IC is marked **`failed` (retryable)** and escalates to the admin dashboard. *(Founder list: exact retry-backoff and alert UX are pilot-time tunings.)*
*If pushed:* onboarding should include defining your escalation path if the IC connection fails.

**Q: Is the seat count live, or could a student miss out because a seat freed up 5 minutes ago but it still shows full?**
Seat availability is pulled **fresh at OneRoster-read time** (configurable cadence, e.g. every 60s) and at push time, so there's a **lag window** — we deliberately don't poll IC continuously (that'd hammer their API), but re-read at push time to catch drift. *(Founder list: tune cadence to your IC's acceptable polling frequency.)*
*If pushed:* talk to your IC admin about acceptable API polling frequency — we'll tune to it.

**Q: When the worklist CSV is loaded into IC, what if a sourcedId doesn't match the current IC enrollmentId (re-enrolled under a new ID)?**
The push is keyed on the composite **`userSourcedId_classSourcedId`** pair (stable IC canonical IDs). If a sourcedId doesn't resolve in IC at push time, we **refuse that row and route it to the manual worklist** rather than guessing — so you catch and correct the mismatch by hand. Honest: a data-quality risk for mid-year transfers or IC ID resets.
*If pushed:* if your IC issues new IDs under certain conditions, that's a pre-pilot conversation with your IC vendor.

**Q: Does this integrate with IC's transcript-generation / diploma-audit features for a GPA recount or graduation-impact view?**
**No integration** with IC's transcript or diploma-audit workflows today. We consume IC's `gpa` and validate prerequisites; you'd run your IC diploma-audit separately. Adding a graduation-audit cockpit or IC diploma API connector is a roadmap item.
*If pushed:* run IC's diploma audit on every admit decision during early pilot to catch gaps.

**Q: If we stop using Schedule AI mid-year, how fast can we export everything, and is there a retention window before deletion?**
Export is **OneRoster-standard** (portable, no lock-in) plus full audit-log CSV. Deletion is immediate via **`purge-student`** — no forced retention window; we sign a data-return + deletion plan with written certification. Pilot exit is clean by design.
*If pushed:* test the export and deletion flow in the pilot sandbox before full implementation.

**Q: What dashboards exist for superintendent/board reporting — change volume, counselor productivity, approval rates by school — and can it break down by school and counselor?**
The Team view has **Overview** (total requests, admit/deny/flag, average decision time, AI agreement rate, override rate, pending-sync), **Counselors** (per-counselor decisions, speed, override rate, capability matrix), and **Activity** (actor-based, filterable). Today it's role-based (all see all schools), **not school-partitioned**; a per-school slice follows once school RLS is in place. *(Founder list: per-school dashboards.)*

**Q: If a counselor is out sick with 30 pending requests, can I reassign them without losing the audit trail?**
**Reassignment is not a built feature today** — the audit log is actor-specific. Low-priority at pilot scale (1-2 counselors per school), operationally necessary at district scale. *(Founder list: add reassign/delegation, or rely on IC's native counselor-queue management?)*
*If pushed:* a pilot at one school shows if reassignment is critical; if so we add it before multi-school rollout.

**Q: For an appeal, can I see exactly what GPA and attendance data the system used, with timestamps, to verify it was correct at that moment?**
Yes — the audit log includes the full **per-check reasoning** (GPA value, attendance rate, prerequisite status, seat count) with timestamps and the **rule thresholds in effect at decision-time**. Because form versions are snapshotted at request time, you see the exact rubric the counselor used — the immutable appeal record.
*If pushed:* export the appeal-specific log entries and attach to your response to the parent or board.

**Q: We keep a manual spreadsheet of standing exceptions — can we import those as standing rules, or re-approve each one?**
The Form & Rubric Builder lets you **encode standing policy as conditional fields and rubric logic** (e.g., "if student already has the AP Calc waiver, auto-admit to AP Stat"). The engine doesn't consume a legacy exceptions sheet as-is — you'd translate it into rubric rules during onboarding (a ripe pilot task).
*If pushed:* first full pilot week should include a registrar-led audit of your exceptions and a rubric update to match.

---

### Leadership / Board / ROI

**Q: What's the one-sentence board-table justification for spending on this instead of leaving it to counselors + IC?**
"It gives every counselor back the hours they lose to manual waiver and course-request review every fall, and it catches missed prerequisites and graduation-requirement gaps before they cost a student an on-time diploma — with a full audit trail." It's a **counselor-productivity and diploma-protection** tool, not an AI experiment.
*If pushed:* it complements IC — it doesn't replace anything you already pay for, so this is additive capability, not duplicate spend.

**Q: What's the payback period — show me counselor hours turning into defensible dollars?**
The mechanism: a waiver that takes 2-3 minutes by hand reviews in 10-15 seconds, across ~400-student caseloads each fall. The dollar conversion is **hours reclaimed × loaded counselor salary**, but we won't put a defensible payback number on it until a **pilot measures your actual baseline** decision-time and volume. We instrument exactly that so the renewal decision rests on your data, not our projection. *(Founder list: hold all ROI claims until pilot baselines — recommended for credibility.)*

**Q: What fund pays for this? ESSER is gone — what happens at renewal if we start on one-time money?**
It's a **recurring annual subscription**, so it must sit on a sustainable recurring fund (general/local Title/technology allocation), not a one-time source that creates a renewal cliff. We deliberately structure a **low- or no-cost single-semester pilot** first so you prove value before committing recurring dollars. *(Founder list: offer multi-year price-lock to avoid renewal shock.)*

**Q: Compared to doing nothing, what gets worse if we wait a year or two?**
Doing nothing keeps counselor time consumed every scheduling window and keeps missed-prerequisite catches dependent on a human noticing under pressure — the cost is diploma-risk and counselor-hour drain that recur every fall. Honest: there's **no fire** — waiting is defensible; we're asking to prove value at low cost, not warning of a crisis.
*If pushed:* one semester of pilot data costs almost nothing and de-risks a future decision either way.

**Q: How does this align with our strategic plan and graduation goals? I don't buy point tools that don't ladder up.**
It maps to **on-time graduation and counselor-capacity** goals: the engine enforces every graduation/prerequisite rule automatically so eligibility gaps surface before they become diploma problems, and it reclaims counselor time for direct student support. Tie it to your portrait-of-a-graduate or grad-rate target.
*If pushed:* it's not a standalone initiative competing for attention — it's infrastructure under an existing graduation goal you already own.

**Q: If this tool denies a high-profile student's waiver and it lands at a board meeting, what's my exposure?**
Contained by design: the tool **never makes the final decision** — a counselor does, and every denial carries transparent **per-rule reasoning** (which rule failed, with actual values) plus the counselor's note, archived for appeals. At the board table you're defending a human counselor's documented decision with a complete audit trail, not an opaque algorithm.
*If pushed:* every recommendation is auditable and human-overridable, so "the computer decided" is never the true answer.

**Q: What about our reputation if the local paper runs "Algorithm decides which students graduate"?**
The accurate counter: it's a **transparent rules engine, not a black box**, and it decides nothing — counselors do. The public line: "It checks the same graduation and prerequisite rules a counselor checks by hand, shows its work, and a counselor signs every decision." We avoided opaque AI precisely so you can answer that headline honestly.
*If pushed:* get ahead of it with a proactive community explainer — transparency is your strongest defense and only works if said first.

**Q: Parents and equity advocates here are wary of "AI deciding things for kids." What do I tell them?**
Three things: a **counselor makes every final decision** and can override any case; the rules are the same **published graduation/prerequisite requirements applied identically** to every student; and any family can be shown exactly which rule applied and why. The honest equity story is **consistency** — the same rules replayed the same way, with a human always in the loop and an inspectable paper trail.
*If pushed:* it reduces the risk of inconsistent human judgment across counselors — the counselor then adds judgment on top, never less of it.

**Q: My worry is the opposite of efficiency — that automating review means vulnerable kids get less human attention. Answer that.**
The design intent is the reverse: by collapsing mechanical rule-checking from minutes to seconds, it gives counselors **more** time for students who need a conversation. It removes paperwork, not the counselor — who still reviews every case and signs every decision.
*If pushed:* track counselor-time-on-task in the pilot; if it doesn't free time for direct student contact, that's a measurable pilot-failure signal and a clean exit trigger.

**Q: Why should we be your founding district instead of waiting for IC or a proven vendor?**
Honestly: a founding partner **shapes the roadmap** and gets founding-partner pricing and influence, and our wedge — the judgment-heavy waiver/course-request review layer — is the gap IC's scheduler doesn't fill, so waiting on IC may be a long wait. The de-risking is structural: a **low-cost metrics-driven pilot with a clean exit**, not a 54,000-student bet.
*If pushed:* if IC ships an equivalent during your pilot, you've lost only a low-cost semester — the downside is bounded by design.

**Q: Be straight about company viability — funded or bootstrapped, how much runway, how big the team?**
This is the founder's call on disclosure, and this audience respects candor over spin. Honest posture: **early-stage, no live district reference yet** — which is exactly why we lead with a pilot. At minimum we commit to **source-code escrow** and a **data-return plan** so district continuity doesn't depend on company survival. *(Founder list: decide what runway/funding/headcount you'll state — "I'd rather not say" reads worse than an honest "we're early, here's our continuity protection.")*

**Q: If you run out of money or get acquired mid-year, what's my continuity plan — concretely?**
Concretely: data is **OneRoster-standard and exportable** (nothing stranded in a proprietary format); we agree to **source-code escrow** and a **data-return + deletion plan**; and because the functional pilot path is the **manual registrar worklist**, counselors revert to their current process immediately without depending on our servers.
*If pushed:* reverting to manual isn't a rebuild — it's the workflow your counselors run today, so a mid-year failure degrades to status quo, not chaos.

**Q: Can you actually move our graduation rate? Give me a number.**
**No — I won't give you a graduation-rate number**, because we have no live district outcome data and claiming a causal lift would be dishonest. The defensible mechanism is that catching missed prerequisites/requirements earlier protects on-time diplomas, but the only numbers we'll stand behind from a pilot are **operational**: decision-time reduced and counselor-hours saved.
*If pushed:* a vendor who promises a grad-rate lift with zero deployments is overselling — our refusal is a credibility signal.

**Q: What does success look like at the end of Year 1, in board-reportable numbers?**
Average counselor decision-time (before vs after), total counselor hours saved, the **override rate** (engine calibration), and pending-sync backlog health — straight from the Team Overview KPIs. We agree the target thresholds with you up front so success is a number **you** set.
*If pushed:* if those agreed thresholds aren't hit, that's your clean-exit trigger — success is defined before we start.

**Q: Who holds you accountable to those metrics, and what's the consequence if you miss?**
Accountability runs through the pilot agreement: thresholds defined jointly before launch, metrics produced by the **tool's own KPI dashboard** (not self-reported), and the consequence of a miss is a clean, contractually-defined exit with your data returned. *(Founder list: offer a fee credit/refund tied to missing thresholds — strengthens board confidence.)*

**Q: If the pilot fails mid-semester, how do we unwind without disrupting students or counselors?**
Cleanly — the pilot runs the **manual registrar worklist** path by default, so counselors are doing their existing workflow with a faster review screen, not depending on automated IC writes. Unwinding means counselors stop using the screen and continue as today, and we run the data-return/deletion plan. **IC always remained authoritative**, so there's no half-migrated state.
*If pushed:* because IC stays authoritative the whole time, a mid-pilot stop is reversible by definition — nothing was ever taken out of your system of record.

**Q: We'll want this at elementary/middle eventually. Does it scale down to K-8 or is it high-school-only?**
Today it's built and pitched for the **high-school** waiver/course-request workflow — where prerequisite chains and graduation enforcement create the pain. K-8 scheduling rules differ enough (fewer prerequisites, different placement logic) that it'd need real scoping; it's a **roadmap conversation, not current capability**. *(Founder list: commit a rough K-8 timeline or keep open — recommend earning the HS win first.)*

**Q: Is your data subject to the Georgia Open Records Act — can a parent or reporter pull what's in your system?**
The records **remain the district's** — we operate as a **data processor** and you retain ownership, so an Open Records request runs through the district as for any education record, and we provide a portable standards-based export to satisfy it. We don't become a separate records custodian; the audit log is exportable, which makes responding **easier**, not harder.
*If pushed:* confirm with district counsel, but because we hold records only as your processor, your existing Open Records process and exemptions apply unchanged.

**Q: Our counselors' union/staff may see this as replacing jobs. How do I message it?**
As a **workload tool that protects counselor jobs** by making them more effective — the counselor remains the decision-maker on every case and the tool removes clerical paperwork, not judgment. "It gives you your fall scheduling weeks back." Bring counselors into the pilot design and let them see override + audit features early.
*If pushed:* the override-rate metric exists precisely so counselors prove the tool serves their judgment — they're auditing the engine, not the reverse.

**Q: What's total cost of ownership beyond the license — implementation, training, our staff time — in Year 1?**
We quote an **all-in Year 1** (license + implementation + training) separately from renewal, and onboarding is fast because rostering is OneRoster-native (~Week 1 config, Week 2+ rollout). District-side cost is mainly counselor and IT time during onboarding plus the IC sandbox connection. *(Founder list: finalize the all-in Year 1 quote and implementation/training breakdown — a board wants the full number.)*

**Q: If a better-funded vendor emerges in two years, are we locked in?**
No — lock-in is **engineered out**. Rostering data lives in **OneRoster shape**, so switching means a clean standards-based export, not an extraction project; combined with **source-code escrow** and a contractual data-return plan, switching cost is low by design.
*If pushed:* low switching cost is also our discipline — it forces us to keep earning the renewal on value, not on you being trapped.

**Q: Districts get burned by ed-tech that gets bought and shelved, or nobody uses after month one. Why is this different?**
Two honest differentiators: adoption is **gated on real value** because the pilot defines success metrics up front with a clean exit if usage/time-savings don't materialize — you don't pay to keep shelfware alive; and the data is **OneRoster-portable** with escrow + data-return, so an acquisition doesn't strand you. We can't promise we'll never be acquired; the contract protects you if we are.
*If pushed:* the clean-exit-on-missed-metrics structure is the anti-shelfware mechanism — shelfware survives on auto-renewal regardless of use; ours is built to be cut if unused.

**Q: How do I know the time-savings number you report isn't massaged to win renewal?**
The metrics come from the tool's own **audit and KPI instrumentation** — timestamped decision records, not a vendor slide — so the underlying log is auditable by your own staff and IT. We agree the measurement method (baseline capture, what counts as a decision, before/after window) before the pilot, so there's no redefining the metric after the fact.
*If pushed:* have your IT or research-and-evaluation office own the baseline capture independently — that removes any vendor self-grading question.

**Q: What's the worst realistic thing in a pilot, and what's our maximum downside?**
Realistic worst case: counselors find the review screen doesn't save meaningful time or fit their workflow, so adoption stalls. Maximum downside is bounded: counselors revert to their current manual process (never left as authoritative), **IC was never given automated write authority** during the pilot, and you exit at semester end with data returned. No scenario mis-enrolls students at scale because automated write-back is gated off and a registrar is the last human in the loop.
*If pushed:* the downside is capped at "we spent a low-cost semester and learned the workflow didn't fit" — not any student-facing harm.

**Q: Who is actually behind this product, and what's their K-12 track record? I'm trusting people I don't know with student records.**
A founder-disclosure decision this audience weighs heavily — answer it directly. Honest baseline: **early-stage, no live district reference yet**, which is why we lead with a metrics-driven pilot and sign your DPA up front. *(Founder list: prepare team bios, prior K-12 experience, advisor relationships — "trust us" doesn't work with a board; specific people and specific protections do.)*

**Q: Is this the best use of this money versus other priorities competing for the same dollars?**
Weigh it as a **low-commitment, high-information bet**, not a large capital allocation: the pilot is low/no-cost and produces hard counselor-time data, so the real spend decision (the recurring subscription) only happens after you have evidence. The question isn't "is this worth a full rollout" but "is a low-cost semester of data worth more than the uncertainty of doing nothing."
*If pushed:* the pilot is structured so you're buying information cheaply, not committing capital — the expensive decision is deferred until you have proof.

**Q: If a student is harmed — misses a graduation requirement because of this tool — who is liable, you or the district?**
Because a counselor reviews and signs every decision and the tool surfaces the same rules a counselor checks by hand, the **decision of record is always a district employee's**, with a complete reasoning trail. Allocation of liability is a contract-and-counsel matter to settle in the agreement, but the design keeps a human accountable for every outcome. *(Founder list: decide the indemnification posture with counsel before signing.)*

**Q: What's the community-engagement plan? Rolling out anything with "AI" without telling parents first is a board crisis here.**
Brief **staff and counselors first**, then a plain-language parent explainer leading with "a counselor decides every case, this tool just checks the rules and shows its work" before any student-facing rollout. The design is transparent and human-in-the-loop, so the story is defensible — but it has to be told proactively. *(Founder list: who owns the parent-communication timeline — recommend district leads with our technical-accuracy support.)*

**Q: How many other districts are you talking to — will we be at the back of the line if a bigger district signs?**
A candor question — the honest framing is that being **early means a founding district gets outsized attention and roadmap influence**, not the back of the line. *(Founder list: decide how to describe your current district pipeline honestly — overstating traction to a 1EdTech-savvy district that can verify it would be a credibility loss.)*

**Q: Walk me through the renewal decision a year out — what evidence, and what would make us walk away?**
On the table: measured before/after decision-time, total hours saved, override rate, pending-sync health, and counselor/registrar adoption. You walk away if agreed time-savings thresholds weren't met, adoption stalled, or the security roadmap (**SOC 2, pen test, school-partitioned isolation**) wasn't progressing on the committed timeline.
*If pushed:* set the walk-away thresholds in writing now — a renewal you can credibly decline is your strongest accountability position.

**Q: Will adopting an unproven AI tool make us look reckless to the state, GaDOE, or peer districts?**
The opposite is defensible: piloting a **transparent, human-in-the-loop, standards-based (OneRoster/1EdTech)** tool under a signed DPA, with **no automated SIS writes**, is a measured move. Given Forsyth's own role in the 1EdTech interoperability community, building deliberately to OneRoster signals rigor, not recklessness.
*If pushed:* leading with a DPA, a metrics-gated pilot, and no live SIS writes is exactly what a cautious district does — the recklessness narrative only fits a full rollout on unproven tech, which is not what we propose.

**Q: What's your honest single biggest weakness I should worry about before championing this?**
The honest biggest gap is **reference depth** — no live Georgia or IC district running this in production yet, so you can't call a peer superintendent. The pilot-with-hard-metrics-and-clean-exit structure exists precisely to de-risk being our founding partner. Secondary gaps we're upfront about: not-yet-complete **SOC 2 and pen test**, committed on a timeline under your DPA.
*If pushed:* a vendor who names their own biggest weakness unprompted is one you can trust on the rest.

---

### Procurement & Contracts

**Q: What's the actual per-school annual list price, and is there a per-student component or platform base fee?**
The commitment is an **annual district subscription priced per-school** (8 high schools for Forsyth), all-in Year 1 quoted separately from renewal — **not per-student, no stated standalone platform fee**. The actual numbers are a founder pricing decision not yet fixed. *(Founder list: per-school list price; one-time vs recurring split.)*

**Q: Break the Year 1 quote into license, implementation, training, and IC-integration engineering — which recur?**
Year 1 = **license + implementation + training**, quoted separately from renewal; training (live + train-the-trainer) is included. The recurring line is the **license**; implementation and training read as one-time. There's **no separate charge for IC/OneRoster integration** — onboarding is "configuration, not custom code." Exact dollar splits need founder input. *(Founder list.)*

**Q: Is price tiered by enrollment, school count, or counselor seats — and what happens if we grow 8→10 schools mid-term?**
The model scales **per-school**, so the cost driver is school count, not enrollment or named seats. Adding schools mid-term adds per-school cost pro-rata — but a co-terminus add-school clause and a price-protected expansion rate need to be set contractually. *(Founder list: add-school mid-term pricing.)*
*If pushed:* offer a price-locked add-school rate and pro-rated, co-terminus billing so expansion doesn't reset the term.

**Q: Are there usage-based or overage charges — API calls, syncs, storage, parse volume?**
Architecturally there's **no metered consumer feature** — sync runs on a batch cadence, parsing is deterministic local processing, storage is access-controlled buckets. The honest answer is the price should be **flat/subscription with no usage overages**, but a no-overage commitment is a pricing-policy decision to put in writing. *(Founder list.)*
*If pushed:* put an explicit "no usage-based overage" clause covering syncs, storage, and parse volume.

**Q: What multi-year discount do you offer, and will you lock price for a 3-year term?**
No multi-year schedule or price lock is set yet. Given the founding-partner posture, a **multi-year price lock with founding-partner pricing** is on the table — discount percentage and term are a founder decision. *(Founder list.)*
*If pushed:* lead with price certainty (flat 3-year lock or escalating discount for 2/3/5-year commits) — worth more to a public board than a headline percentage.

**Q: Can you be bought on a cooperative vehicle — GA DOAS, TCPN/OMNIA, Sourcewell, E&I, or a piggyback off another GA district?**
Honest: no live Georgia reference and **no cooperative listing today**, so realistically there's no DOAS/Sourcewell/OMNIA/piggyback vehicle available now. The honest path is a competitively bid contract or a documented small-dollar pilot under your threshold, with cooperative listings as a roadmap item (Sourcewell/E&I/DOAS take months). *(Founder list.)*
*If pushed:* until a listing exists, structure the initial engagement as a pilot small enough to sit under the district's competitive-bid threshold.

**Q: Can the pilot be a below-threshold quote-based purchase so we start without a full sealed-bid RFP?**
Yes — we recommend starting with a **low- or no-cost pilot at one or two high schools** for a semester, which can typically sit under a district's competitive-procurement threshold and proceed via quotes, then a full procurement for district-wide rollout. The specific ceiling depends on your board policy and Georgia thresholds.
*If pushed:* keep the pilot scoped to one or two schools, priced under your quote threshold, so legal can approve without a sealed bid.

**Q: Is any part E-rate eligible, and which funding streams do districts use?**
Honestly, a counselor scheduling SaaS is **almost certainly NOT E-rate eligible** — E-rate funds broadband and internal connections, not application software. Realistic streams: general/local funds, possibly **Title IV-A** (student support) or **Title I** where it supports counseling for eligible students, and local **SPLOST** for technology — the district's call with its federal-programs office. *(Founder list.)*
*If pushed:* don't claim E-rate — prepare a one-pager mapping the tool to allowable uses under Title IV-A and Title I for your federal-programs director.

**Q: What are your payment terms — annual in advance, quarterly, net-30 on invoice?**
No terms set. Reasonable honest answer: accept **annual invoicing with Net-30 from invoice/acceptance**, and given startup-risk a district should push for arrears or **milestone-based billing** (tied to pilot acceptance gates) over full annual prepayment. *(Founder list.)*
*If pushed:* tie the first invoice to a pilot acceptance milestone — for a startup vendor, milestone billing de-risks the district.

**Q: Will you invoice against our PO and accept our standard terms, or require your order form first? Our terms govern, not your clickwrap.**
The honest district-friendly answer: yes, invoice against your **PO and accept your master terms** with the negotiated DPA — we already commit to signing your DPA before any pilot. Whether the vendor fully cedes to district terms over its own order form is a founder/legal decision. *(Founder list: accept district paper, no auto-renew clickwrap.)*
*If pushed:* public districts generally can't accept vendor clickwrap that conflicts with state law.

**Q: What's your renewal price-escalation cap — CPI or a fixed percent — so we don't get a 40% surprise?**
**No cap today** — it needs to be set. A district-fair structure is a **fixed annual cap (lesser of CPI or a low single-digit percent)** across the term and at renewal, with founding-partner price protection. *(Founder list.)*
*If pushed:* an uncapped renewal is a non-starter for most GA boards — insist on a written cap and price protection on add-schools.

**Q: Will you accept a termination-for-convenience clause and a non-appropriation/funding-out clause tied to our fiscal year?**
Both are consistent with our posture (pilot-first, clean-exit metrics, OneRoster-portable data, escrow, data-return plan), so **termination-for-convenience and a Georgia non-appropriation clause** fit how we pitch — but formal acceptance is a founder/legal sign-off. *(Founder list.)*
*If pushed:* both are standard and often statutorily required for GA public entities — the clean-exit framing already implies agreement.

**Q: Our FY runs July 1–June 30 with spring budget approval. Can you align contract start and invoicing to that?**
Fully compatible: a **spring semester pilot** maps cleanly to a July 1 FY start for full rollout, and we can align contract start and first invoice to your fiscal year.
*If pushed:* run the pilot in spring so success metrics land before spring board approval, then start the paid contract July 1 to avoid a stub-period proration headache.

**Q: Will you carry CGL, professional/E&O, and cyber-liability insurance and name us as additional insured with certificates?**
Honest for an early vendor: **cyber-liability and tech E&O at district-required limits (commonly $1–5M)** are achievable but may need to be procured, and naming the district as additional insured with a COI is standard. A founder decision on current vs to-be-bound coverage. *(Founder list.)*
*If pushed:* state current coverage honestly; if cyber-liability isn't at required limits yet, commit to binding it before contract execution — non-negotiable since we hold student PII.

**Q: Does this require a performance or payment bond, or do we cap exposure another way?**
For a **SaaS subscription** (not public works) a performance bond is usually not required, and an early vendor may not obtain one easily. Better risk control: the **pilot structure, source-code escrow, milestone billing, and data-return plan** rather than a surety bond. *(Founder list.)*
*If pushed:* if your policy flags bonding, substitute escrow + milestone billing + termination-for-convenience as the exposure cap.

**Q: Send your W-9, GA Secretary of State registration, and E-Verify affidavit (GA's Illegal Immigration Reform Act requires it).**
Routine and bindable: a U.S. vendor provides a **W-9**, registers to do business in Georgia, and — because **O.C.G.A. 13-10-91** requires it — provides a signed **E-Verify affidavit** and federal work-authorization contractor ID. Whether the entity is currently GA-registered and E-Verify-enrolled is a founder/legal fact to confirm. *(Founder list.)*
*If pushed:* GA public contracts legally require the E-Verify affidavit — enroll and register before bidding or the award can't be made.

**Q: What concrete SLA do you commit to, and what service-credit remedies apply when you miss it?**
The commitment is **targeting 99.9% uptime** and a named support contact; a **service-credit schedule is not yet defined** — a tiered credit table (e.g., bands at 99.9/99.5/99.0) needs negotiation. We're willing to commit a concrete SLA in the contract. *(Founder list: service-credit ladder tied to the license fee.)*
*If pushed:* pin down a measured 99.9% SLA with a credit ladder, a maintenance-window exclusion, and credit-claim mechanics — credits tied to the license fee, not future-service vouchers.

**Q: Beyond uptime, what's your support model and P1 response commitment during our two-week scheduling window — is premium support an add-on?**
"Ongoing support" + a "named support contact" are promised, but **no tiered response times or severity matrix** yet, and whether premium/peak support costs extra is undecided. The scheduling window is highest-stakes, so we should commit a **P1 response-time SLA during peak**. *(Founder list: severity matrix; peak-window support bundled vs upsell.)*
*If pushed:* define P1/P2/P3 with response and resolution targets, and confirm peak-window "war-room" support is included, not an upsell.

**Q: Three-year TCO beyond your license — Chromebook impact, IT staff time, IC-side integration costs?**
District-side costs should be minimal: runs in **Chrome on existing 1:1 Chromebooks** (no new device cost), uses **Google Workspace SSO** you already have, and is **OneRoster-native** ("configuration, not custom code"). Honest unknowns: any **Infinite Campus-side OneRoster/API enablement cost** your IC contract imposes, and district IT/registrar time for security review and the manual worklist path. *(Founder list.)*
*If pushed:* check whether your IC contract charges for OneRoster API/SFTP enablement — a real district-side line item we can't quote.

**Q: Does the price include SOC 2 and pen-test deliverables, or is that a separate cost — and who pays for the third-party audit?**
We're honest that **SOC 2 Type II and a third-party pen test are not yet complete** (roadmap, with a committed remediation timeline). Standard practice is the **vendor bears its own** SOC 2/pen-test cost — never passed through to one customer. Whether that's funded internally or affects pricing is a founder decision. *(Founder list.)*
*If pushed:* get the remediation-timeline commitment in writing as a contract milestone.

**Q: What's your refund/exit-cost position if we terminate after the pilot or mid-term — pro-rated refund, or use-it-or-lose-it?**
We emphasize a **clean exit** and a data-return/deletion plan (refund-friendly posture), but **no pro-rata refund mechanic is defined** — the exit-with-data is committed, the financial refund-on-termination terms are not. *(Founder list.)*
*If pushed:* negotiate pro-rated refund of prepaid fees on termination-for-convenience and a no-charge wind-down/data-return period.

**Q: What does the data-return-and-deletion deliverable cost at exit — included, or billable professional services?**
The **OneRoster-shape export, `purge-student` deletion, and written deletion certification** are built-in capabilities, not custom work — so these should be **included at no extra exit charge**. Whether any hand-holding professional-services time is billed is a founder decision, but the core deliverables are productized.
*If pushed:* get "no exit/egress fees" in writing covering export, purge, and certification — there's no defensible reason to charge for built-in capabilities.

**Q: Source-code escrow costs money and needs a release-trigger agreement. Who pays, and what are the conditions?**
We commit to **agreeing to escrow** as startup-risk protection but haven't specified payer or triggers. Standard: vendor or shared cost, release triggered by **insolvency, abandonment, or material uncured breach**. The cost-bearer and trigger language are a founder/legal decision. *(Founder list.)*
*If pushed:* use a recognized escrow agent, define triggers, and pair escrow with a documented self-host runbook — OneRoster export alone doesn't run the rules engine.

**Q: If you're acquired, does our contract — pricing, DPA, escrow — survive assignment? I need a change-of-control clause.**
We address acquisition via data portability, escrow, and a data-return plan, but **not contract assignability or survival of pricing/DPA on change of control**. Those protections (assignment requires district consent; DPA and pricing survive) are reasonable and consistent with our posture but must be negotiated in. *(Founder list.)*
*If pushed:* without a change-of-control clause, an acquisition can void exactly the protections you negotiated.

**Q: Do you offer most-favored-customer pricing? As a founding district taking the risk, I don't want district nine getting a better rate.**
The founding-partner framing makes an **MFN or price-protection commitment** a natural ask — but it's a meaningful concession that constrains future deals, so it needs deliberate founder sign-off. *(Founder list.)*
*If pushed:* if full MFN is too constraining, settle for a founding-partner discount locked for the term plus a multi-year price cap — most of the value without binding the entire future price book.

**Q: How do you handle a stub/proration if we go live mid-semester instead of at fiscal-year start?**
The district-fair answer: **prorate the first partial period** to the next FY co-terminus date, or start the annual term at go-live — and treat any mid-semester pilot as the free/low-cost trial so there's no stub at all. *(Founder list.)*
*If pushed:* tie the paid annual term to your July 1 FY start and treat the pilot as the free/low-cost trial, eliminating the stub.

**Q: For RFP scoring, can you provide 3-year and 5-year TCO schedules including renewals?**
We support separating Year 1 (license + implementation + training) from renewal, which is exactly the structure a TCO schedule needs — but the **multi-year dollar figures, escalation, and renewal amounts aren't set**, so the vendor can produce the format but not yet the numbers. *(Founder list.)*
*If pushed:* provide a locked 3- and 5-year TCO table with one-time costs separated from recurring license and a stated escalation cap — evaluators score on multi-year TCO, not Year 1 headline.

**Q: Will you complete our standard vendor questionnaires and a HECVAT — any fee or lead time?**
The documented security posture (FERPA allowlist, RLS/RBAC, encryption, US hosting, breach-response policy, DPA willingness) gives the substance to complete a **HECVAT-Lite or district questionnaire**, while honestly flagging SOC 2/pen test as not-yet-complete. Completing it should carry **no fee**; lead time depends on staffing. *(Founder list.)*
*If pushed:* vendors should never charge to complete security questionnaires — expect honest "roadmap" answers on the SOC 2/pen-test/per-school-RLS rows.

**Q: Does the contract include audit and reporting rights — usage and SLA-compliance reports, and a right to audit your security controls without a separate fee?**
The built-in **audit log, Team analytics, and CSV export** give strong in-product reporting at no extra cost. Contractual **SLA-compliance reporting and a right to audit controls** (or accept a SOC 2 report in lieu once available) are reasonable asks that need negotiation, not yet committed. *(Founder list.)*
*If pushed:* secure a right to SLA-compliance reports and either an on-request controls audit or acceptance of the future SOC 2 Type II report once delivered.

---

### Building Principal

**Q: When this goes live in my building, who owns it day-to-day? I'm not adding an FTE.**
No new FTE required. The intended owner is your **lead counselor or counseling director** working the Review Queue, Form Builder, and Team views; registrars handle the manual export worklist to IC. Because it's a deterministic rules engine plus an explainability layer, there's no model to babysit, and **train-the-trainer** makes one of your existing staff the in-building owner.
*If pushed:* if even that's too much, we scope the pilot to one counselor at one school so the day-to-day load is one person, at your pace.

**Q: Be straight — does this net add work to my counselors or remove it? Year-one tools usually mean double-entry.**
A short ramp, then a net reduction: a 2-3 minute manual waiver reviews in 10-15 seconds, and intake arrives as **structured data** instead of handwritten forms, so counselors stop re-keying. The one place double-work can creep in during the pilot is the **manual registrar worklist**, since automated write-back is gated off until your security review. We measure **counselor hours saved** as a pilot success metric so you see the net.
*If pushed:* if the pilot doesn't show measurable hours saved, you have a clean exit by design.

**Q: A parent calls ME, not your support line, when their kid's schedule is wrong. What do I have in five minutes?**
Open that student's request in the **Review Detail cockpit + immutable audit trail**: the transcript on file, every prerequisite/GPA check that passed or failed with actual values, the confidence score, which counselor decided, and whether they followed or overrode the recommendation — all timestamped. The **Activity Log is CSV-exportable** if the parent or an appeal board wants documentation.
*If pushed:* nothing in that decision path is a black box, so you're never stuck saying "the computer decided and we can't explain it."

**Q: I need MY building's numbers, not a blended district total. Can I get school-scoped reporting?**
The Team Overview gives decision counts, average decision time, AI agreement rate, override rate, and pending-sync — but honestly, **per-school data isolation isn't implemented yet**; today all counselors see all requests and the Overview is district-wide. **School-partitioned RLS is a tracked roadmap item** before multi-school rollout. For a single-school pilot it's moot — your school is the only data in scope. *(Founder list: per-school dashboards.)*
*If pushed:* if per-building dashboards are a hard requirement before you sign, that's exactly the kind of scoping commitment we put in the agreement with a date.

**Q: How long until a counselor is actually competent, not just shown it once? My staff turn over and August is chaos.**
Onboarding a single counselor to working competence is targeted at about **a week** during the pilot, with live training + train-the-trainer so the knowledge stays when staff turn over. The interface is intentionally familiar — a sortable grid + a review screen with Admit/Deny/Flag — so there's no new mental model. *(Founder list: publish a firm training-hours figure.)*
*If pushed:* training is included in the engagement, not a line item that disappears after launch week.

**Q: When the engine recommends something wrong and a counselor rubber-stamps it, who's accountable? I'm not letting software make graduation calls.**
The **counselor is always the decision-maker** and accountable; the system never auto-decides — a human must click Admit/Deny/Flag, and every decision logs whether it followed or overrode the engine. Because it's deterministic rules, an error is a rule/catalog config error you can find and fix, not an unexplainable model mistake, and the override flag makes accountability traceable to a person.
*If pushed:* there's no scenario where the software enrolls a student with no human signing off; the manual worklist keeps a registrar in the loop too.

**Q: What does a bad day look like — your system or IC down during my two-week request window?**
If our app is down, **no enrollment damage** because IC stays the system of record and we only reconcile to it; counselors fall back to the existing IC process. If IC is unreachable at push time, the push-state machine simply doesn't advance — rows stay queued and re-validation fails safe rather than guessing. Nothing half-applies. We'll commit a concrete uptime SLA (targeting 99.9%) and a named support contact.
*If pushed:* the worst realistic outage costs you the convenience layer for a few hours, not student records, because we never hold write authority IC doesn't confirm.

**Q: What do counselors tell families about how the decision was made? I don't want a "we ran your kid through an AI" conversation.**
The accurate, parent-friendly framing: it's a **rules checker, not an AI judge** — it verifies graduation requirements, prerequisites, GPA thresholds, and seat availability automatically, and a counselor makes the final call. No chatbot, no machine learning. The per-rule pass/fail view lets a counselor show a parent the exact requirement met or unmet. *(Founder list: ship pre-approved parent-facing letter templates?)*
*If pushed:* the underlying explainability already supports a family-facing explanation — whether we ship templates is a product decision we can commit to for your pilot.

**Q: Does this require a parent-facing portal or notifications I have to manage? My front office can't absorb another channel.**
No. It's primarily a **staff-side tool**; students touch it briefly to submit and check status, and there's **no parent login or parent notification system** today. Status lives in the student's My Requests tracker, including an opt-in waitlist. Your front office isn't added as a comms hub.
*If pushed:* if you later want parent-facing notifications, that's a roadmap item, not something forced on you at launch.

**Q: Can I, as principal, get an account for oversight without doing casework?**
Yes — the **admin role** covers the Team and Audit views: decision counts, average decision time, override rate, AI agreement rate, pending-sync, and the full actor-stamped activity log. Honest: today the admin role is one tier, so a principal account currently sees the same scope as a lead counselor. *(Founder list: add a read-only principal role — gated on per-school isolation.)*
*If pushed:* a principal-specific read-only oversight role is a reasonable RBAC addition; whether it's gated to your building depends on the per-school isolation roadmap.

**Q: If a counselor is slow or way off on overrides, will I see that or is it buried?**
You'll see it directly — the **Team Counselors view** is a roster showing each counselor's decision count, speed, and override rate, plus a capability matrix. A high override rate flags either a counselor who disagrees with the rubric or a rubric needing tuning — a management signal, not a gotcha.
*If pushed:* it turns counselor workload and consistency, normally invisible, into something you can manage and defend in a review.

**Q: How do you keep one counselor from snooping on a student who isn't theirs? In a building this size that's a real FERPA exposure.**
Access is role-based with Postgres RLS and an `is_counselor()` check, and the push-state table is write-locked so confirmations can't be forged. Honest gap: **counselors aren't partitioned by caseload or building today**, so any counselor in the tenant can see all requests. Per-school/finer isolation is a tracked roadmap hardening item. The audit log does record who accessed and decided what, so snooping is at least traceable. *(Founder list: per-school RLS date.)*
*If pushed:* if caseload-scoped access is a precondition for your building, we put it in the security-review scope before go-live, not after.

**Q: My counselors aren't engineers. When they want a new waiver type mid-year, do they file a ticket or do it themselves?**
Themselves — **no code, no ticket**. The Form Builder gives a 15-type field palette with drag-reorder, live preview, and active/archive toggle, with the rubric embedded, appearing in student intake immediately. **Form versions are snapshotted at request time**, so a mid-year change never rewrites prior decisions.
*If pushed:* the snapshot behavior protects you in an appeal — the decision is judged by the rule that existed when it was made.

**Q: Who tunes the rubric to OUR graduation rules, and what happens the first time it's wrong for a Georgia-specific requirement?**
Configured to your catalog and graduation/prerequisite rules during onboarding; your admin adjusts thresholds via the Form Builder rubric afterward. When it's wrong it's a **visible configuration error**, not a black box — the audit AI-Reasoning view shows the exact failing check, you correct the rule/catalog, and the fix applies consistently. Override rate is your early warning of miscalibration. *(Founder list: ship a GA starter rubric?)*
*If pushed:* we test for consistent application by replaying the same rubric across student groups, so a Georgia-specific fix is provably uniform.

**Q: If your transcript parser misreads a PDF and a counselor doesn't catch it, a kid could be told they're ineligible when they're not. How do I trust intake?**
The design assumes the parser is fallible: the transcript is parsed (Levenshtein course recognition) but the **parsed values are shown to the counselor**, not hidden, so a human verifies GPA, grades, and recognized courses before deciding, with the original document on file. **Missing or unreadable docs force a "review" status, not an auto-deny**, so a bad parse routes to human eyes.
*If pushed:* the engine can't silently fail a kid on a misread document because incomplete data forces review, not denial.

**Q: During peak weeks my counselors are in this all day. Will it be fast, or crawl when the whole building's on it?**
Built for concurrency: stateless edge functions, atomic idempotent batch processing, and **`pg_advisory_xact_lock`** so two counselors can't race for the same seat. We've validated the internal pipeline under simulated load. Honest caveat: we haven't run live peak load against your IC contract across all eight schools — that's exactly the **pilot's peak-concurrency test** against your IC sandbox.
*If pushed:* we won't claim all-building peak readiness before we measure it on your sandbox; the pilot is the proof.

**Q: What's my registrar's role? They actually touch enrollment in IC and they're protective of it.**
Your registrar stays the **last mile** by design — in default manual export mode the system produces a **registrar worklist CSV** of approved changes that the registrar reviews and applies in IC, delivered via a short-lived signed URL, with the concentrated-PII export deleted after each run. They gain a clean checklist instead of handwritten forms, and keep their authority.
*If pushed:* automated write-back exists but is gated off until your security review; the registrar-in-the-loop path is the functional default.

**Q: Realistically, what's the adoption risk in MY building? My counselors have seen district-mandated tools quietly abandoned.**
Mitigations: **speed, familiarity, and choice** — large immediate time savings, a grid-plus-review-screen UI rather than a new paradigm, and onboarding one counselor at a time at your pace rather than a building-wide mandate. Defined pilot success metrics make abandonment visible early. *(Founder list: mandate vs invite adoption.)*
*If pushed:* we recommend invite-first because forced tools are the ones that get abandoned.

**Q: Can I limit which counselors decide which waiver types — e.g., not let a brand-new counselor approve a senior graduation waiver?**
Yes — the **capability matrix** in the Team Counselors view sets which waiver types each counselor is authorized to decide, so you restrict graduation-impacting waivers to senior staff and route routine ones broadly. It's administrator-controlled.
*If pushed:* the matrix keeps authority matched to experience without manually policing every decision.

**Q: If a decision is appealed, can I produce a defensible record for the appeal board, or is it counselor memory?**
A record, not memory: **Rejected History** archives every denial with reason + note, and the audit trail captures full per-rule reasoning, confidence, actor, device, and follow/override — CSV-exportable. Because the engine is deterministic, you can show the board the exact unmet requirement and that the same rule applied to every comparable student.
*If pushed:* it's specifically built to be defensible to families and appeal boards, which is why we kept it auditable instead of a model.

**Q: How disruptive is rollout to my building calendar? I can't have implementation the same week as our scheduling window.**
Onboarding is fast (OneRoster-native): Week 1 is configuration + IC sandbox connection + piloting with one counselor; Week 2+ is broader rollout. The timing is yours — we'd schedule configuration and training **before** your scheduling window, and full production IC write-back follows your security review, decoupling heavy integration from busy weeks. *(Founder list: rollout calendar scoping.)*
*If pushed:* we'll fit the rollout calendar around your scheduling window rather than colliding with it.

**Q: When students submit on Chromebooks, how much screen time and staff hand-holding does that create?**
Minimal — students touch it only to submit (a guided wizard with inline validation and a FERPA-consent step) and check status; they don't live in the app, which aligns with a distraction-free direction. Staff hand-holding is front-loaded into the first submission cycle, not ongoing.
*If pushed:* it's a staff-side tool first; the student touch is intentionally brief.

**Q: What support do I get when something breaks at 7:45am during my busiest week — not a ticket queue?**
We commit to a **named support contact** in the agreement plus the uptime SLA (targeting 99.9%). Honestly, the specific support hours, response-time guarantees, and escalation path are commercial terms set in the contract. Because IC stays authoritative, a 7:45am outage degrades convenience, not your ability to enroll, which buys recovery time. *(Founder list: support SLA + hours.)*
*If pushed:* define the support SLA you need (business vs extended hours) and we put a concrete response-time commitment in the agreement.

**Q: Is there a paper/manual fallback if a counselor refuses to use it or it's unavailable?**
Yes — your **existing process**. Because IC remains the system of record and we only reconcile to it, counselors can always handle a request the way they do today, and the registrar applies changes directly in IC. There's no point where this tool is the sole path to enroll a student.
*If pushed:* we deliberately don't make ourselves a single point of failure between your counselors and IC.

**Q: If district leadership sees all eight schools, can a counselor from another building see MY students' requests right now?**
Candidly, **yes today** — within the same tenant any counselor can see all requests because data isn't yet partitioned by school. That's the single biggest gap I won't gloss over; **per-school RLS isolation** is the named roadmap item to harden before multi-school rollout. For a single-school pilot it's a non-issue. *(Founder list: per-school RLS date.)*
*If pushed:* if cross-building visibility is unacceptable, building-partitioned access is a hard precondition we put before go-live, not a later patch.

**Q: What's the smallest commitment that proves this in MY building without betting my counseling office on a startup?**
A **low- or no-cost single-school, single-semester pilot** with one counselor at a time, instrumented against defined success metrics (decision time, hours saved, override rate), with a clean exit. Because rostering is OneRoster-standard and exportable, you're not locked in, and the pilot scope means you never risk all 54,000 students.
*If pushed:* reference depth is our honest gap as an early company; the metrics-driven single-building pilot is precisely how we de-risk that for you.

---

### Special Populations (SPED / 504 / ESOL)

**Q: Our IEPs/504s specify required service minutes and co-taught sections. Does the engine understand service minutes and put them in the schedule?**
No — and we won't pretend otherwise. The rules engine only evaluates **prerequisite completion, grade-level floor, GPA/attendance thresholds, seat availability, and time-conflict overlap**. There's **no concept of service minutes, FAPE/LRE placement, or co-taught vs resource section types**. IC stays your master scheduler and system of record for service delivery; we sit on the waiver/course-request review layer.
*If pushed:* service-minute awareness is net-new schema and rule logic — a scoped roadmap item, not something I'll claim works today.

**Q: If the engine can't see that a student has an IEP/504, how do you keep it from denying a waiver their accommodations actually entitle them to?**
The core tension, stated directly: the **FERPA field allowlist explicitly blocks** specialEducation, iep, disability, and section504 from ever being pulled, with a tripwire halting persistence if they appear. The upside is data minimization; the honest downside is the engine is **disability-blind** and can't auto-apply an accommodation. That's exactly why the engine **never auto-denies a judgment case** — missing-doc or borderline cases route to "review," and the counselor (who can see the IEP/504 in IC) makes the final call.
*If pushed:* if you'd rather the engine be IEP-aware, we'd widen the allowlist to carry a disability flag — a deliberate privacy tradeoff your counsel and our DPA would need to approve. *(Founder list: self-declared disability field.)*

**Q: FERPA and IDEA overlap on disability records. Your allowlist blocking special-ed flags — is that helping me or creating a blind spot I'm liable for?**
Both, honestly. Blocking special-ed flags **shrinks your blast radius** — the safest disability data is data we never pull, defensible under FERPA minimization and IDEA confidentiality. The blind spot is that accommodation logic lives with the human, in IC, not in our automation — the correct division for a tool that can affect a diploma. Your data-handling liability is reduced precisely because we don't touch it.
*If pushed:* we can document in the DPA that disability records are out-of-scope by design — a cleaner posture than holding them and promising to guard them.

**Q: Can the engine at least FLAG when a recommended change might conflict with an IEP — say, dropping a student out of a co-taught section?**
Not as a disability-aware flag, because we don't ingest IEP data. It can surface a generic **dependency-impact warning** when a student drops a course that's a prerequisite for others (informational, non-blocking), but it doesn't know the section was co-taught. The practical safeguard is workflow: every admit/deny is a counselor decision with a note, so a SPED-aware reviewer catches the conflict.
*If pushed:* a lightweight privacy-preserving option is a per-form "has an active plan — route to SPED reviewer" yes/no field the counselor sets, no demographic pull needed.

**Q: About a third of my families speak Spanish or another home language. Is there a translated interface, or is this English-only?**
Today it's **English-only** — no internationalization library and no translated UI ships. The intake is a guided structured wizard (lower reading load), but that's not Spanish-language access. For your ESOL footprint, native translation is a real gap on the pilot roadmap, and the field-based Form Builder makes localized form copy feasible. *(Founder list: commit to Spanish UI + timeline.)*
*If pushed:* the architecture (externalized form field labels) supports it, but it's unbuilt today.

**Q: Many newcomer parents don't read English well and won't fill out an online form. How does a parent who needs help submit a request?**
Realistically, today the practical path is **counselor- or ESOL-staff-assisted submission** — the same person who helps them with enrollment sits with them; any authenticated staff member can work a request, and the structured wizard is easy to walk through verbally. We don't yet have a translated parent-self-serve flow and don't replace your ESOL program's language support. *(Founder list: commit to assisted-intake as the official LEP path + translation timeline.)*
*If pushed:* we'd treat staff-assisted intake as the supported pilot pattern, with translation as the improvement target.

**Q: I have staff and students who use screen readers and keyboard-only navigation. Is this actually usable, or aspirational?**
Built to **WCAG 2.1 AA** patterns with real plumbing — dialogs use a focus trap (Tab/Shift+Tab cycling, Escape-to-close, focus restoration), custom accessible listboxes, system-aware dark mode, aria-hidden icons. Keyboard operation of staff flows is a genuine design goal. Honest caveat: **no completed third-party VPAT or full screen-reader audit yet** — that's procurement-cycle roadmap. *(Founder list: VPAT timeline.)*
*If pushed:* I won't claim AA-certified — only AA-targeted; the VPAT is a procurement deliverable we'll commit to a date on, tested by your assistive-tech team in the pilot.

**Q: Your AG Grid review queue and analytics tables are notoriously bad for screen readers. Have those been tested with assistive tech?**
I'd flag the same risk. Dense interactive **AG Grid** surfaces are the hardest to get fully screen-reader-conformant, and we **haven't completed an assistive-tech audit on the grids**, so I won't assert they pass. AG Grid ships ARIA grid roles and keyboard nav upstream (a baseline, not a passing audit). The screen-reader-critical decision controls in the review cockpit are simpler DOM and where we focus a11y effort. *(Founder list: AG Grid a11y pass in the VPAT.)*
*If pushed:* if grid accessibility is a hard procurement gate, we scope a dedicated AG Grid a11y pass before district-wide rollout.

**Q: Color contrast and reduced-motion — many of my students have low vision or are photosensitive. Does the UI respect those settings?**
There's a system-aware dark mode and the design targets **WCAG 2.1 AA contrast**, so we're building toward it, but I can't **certify** every token meets 4.5:1 or that all animations honor prefers-reduced-motion without the formal audit. The app is low-motion utility software by nature (no autoplay/parallax), which lowers photosensitivity risk — but "low risk by design" isn't "audited." *(Founder list: contrast + reduced-motion in the VPAT.)*
*If pushed:* contrast and reduced-motion conformance are line items in the VPAT we deliver during procurement.

**Q: How does the engine decide gifted/AP eligibility, and can it wrongly block a kid who belongs in an advanced course?**
Eligibility is driven only by **catalog rules** — a prerequisite course and a minimum grade-level floor. Critically, the **upper grade bound (maxGrade) is NOT a gate** — it's display-only metadata — so a younger gifted student isn't auto-blocked by a "typical grade" ceiling. It does **not** model gifted-identification status or AP-readiness scores (not pulled), so it won't auto-place into gifted/AP nor auto-deny on giftedness; the counselor applies your district's entry criteria.
*If pushed:* the per-form criteria builder can hold catalog-based gifted/AP checks; identification-status checks would need a data source we don't pull today.

**Q: Special populations are exactly the kids a one-size rules engine gets wrong. What stops your automation from systematically disadvantaging my SPED/504/ESOL students?**
Three structural protections: the engine **never makes the final call** on a judgment case (borderline/missing-doc → "review," not auto-deny, every decision a logged counselor call); it's a **deterministic rules engine with no trained model or learned weights**, so no opaque place for bias to accumulate — every check is inspectable and the same rubric applies to every student, replayable for audit; and the **human override is first-class and flagged**, so a SPED-aware reviewer overriding the engine is a normal tracked event.
*If pushed:* we can run a disparate-impact check by replaying the same rubric across student groups during the pilot — since there's no model, the rules are fully inspectable for differential effect.

**Q: When my staff overrides the engine on a SPED student, is that defensible if a parent files a due-process complaint or we end up at a hearing?**
Yes — defensibility is the design intent. Every decision lands in an **immutable, actor-stamped audit log** with the per-check reasoning, the counselor's decision, whether it followed or overrode, and the note — CSV-exportable. You can show a hearing officer exactly what the system surfaced and why the human decided differently, and because the engine is rules-based the reasoning is literal and reproducible.
*If pushed:* the override and rationale are captured — but the IEP itself stays your record in IC; we document the scheduling decision, not the FAPE determination.

**Q: ESOL students follow a WIDA-driven progression — ELP levels, language-support blocks. Does the catalog/prereq logic model that, or will it mis-sequence my ELs?**
It does **not** model WIDA ELP levels or language-acquisition sequencing — the prerequisite graph only knows course-to-course prerequisites and grade floors, with no notion of English-proficiency tiers or required ESOL support blocks. So it won't auto-sequence an EL's progression and could recommend a swap that ignores an ESOL placement it can't see. The ESOL counselor reviews and decides.
*If pushed:* we could model ESOL course prerequisites as catalog rules if you treat ELP-level gating as course prereqs — but proficiency-level data itself isn't something we pull.

**Q: Co-taught/inclusion sections have caseload caps — you can't load 18 SPED kids into one. Does your seat logic respect SPED ratio limits?**
No — seat logic only checks raw seat count against the section's **Max Students** (authoritative in IC; our holds are soft). There's **no concept of a SPED caseload ratio or co-taught student-cap** distinct from overall capacity, because the engine doesn't know which students have plans (the disability-blind allowlist again). IC's scheduler and your SPED staff own ratio enforcement.
*If pushed:* ratio enforcement needs both section-type metadata and a per-student plan flag — two things we don't ingest today, so it's an IC-side control for now.

**Q: Can my SPED department build its own intake form — different fields than the general waiver — without filing a ticket every policy change?**
Yes, a genuine strength. The **Form Builder** composes intake forms from a 15-type field palette (text, number, date, dropdown, radio, multi-checkbox, yes/no, file upload, section headers, help text), drag-reorder, preview, active toggle — no code. Each form carries its own decision criteria, and versions are **snapshotted at request time**. Your team can stand up a plan-aware intake (e.g., a "route to SPED reviewer" field) without us pulling protected demographics from IC.
*If pushed:* a self-declared plan field is fine; note it's user-entered data in our store, governed by the DPA, not an IC-sourced disability flag.

**Q: If we capture a self-declared "I have an IEP" checkbox, doesn't that put protected special-ed data right back into your database — the thing your allowlist was supposed to prevent?**
Correct, and an important distinction: the **allowlist governs what we PULL from IC** — it blocks IC-sourced special-ed flags. A field a family voluntarily fills is different data with a different basis, living in our requests store, governed by the DPA, RLS, and retention/purge controls. We **wouldn't add such a field by default** precisely because it reintroduces sensitive data; if your district wants it, that's a deliberate, documented choice for your counsel to bless given IDEA. *(Founder list: self-declared disability field.)*
*If pushed:* if yes, we add encryption/retention terms for it; if no, we keep it strictly counselor-side in IC.

**Q: Parents of SPED/504 students have a right to their kid's records. If the engine made a recommendation, can a parent get the record of what it decided and why?**
Yes — the **AI Reasoning log** captures the full per-check pass/fail, confidence, decision, and any override per request, and the audit trail is CSV-exportable. Because the recommendation is deterministic, what a parent receives is literal and reproducible. That said, the engine's record is about the scheduling/waiver decision; the **IEP and FAPE determination remain education records in IC**.
*If pushed:* we give you the decision-level export; we don't become a parallel record-of-record for the IEP itself.

**Q: Some students need extended time and a low-distraction environment even to fill out a form. Does intake have save-and-resume so they don't lose work?**
The intake is a guided multi-step wizard with **inline validation that preserves form state on errors** (e.g., dropping an unsupported file shows an inline error without wiping the form) — partial protection. I can't confirm a **durable cross-session "save draft and come back tomorrow"** as a guaranteed feature, so I won't claim it; today the accommodation is staff-assisted or single-sitting completion. *(Founder list: commit to durable save-and-resume as an accommodation.)*
*If pushed:* if durable draft-resume is an accommodation requirement, flag it — it's a concrete, fundable pilot enhancement.

**Q: Our gifted/SPED eligibility criteria differ school to school and change with state rules. When Georgia changes a rule, who updates your engine — you, or am I waiting on a vendor release?**
You **don't wait on a release for rubric-level criteria** — decision logic is built from per-form criteria your admins edit in the Form Builder, and the catalog is data, so prerequisite/grade-floor changes are config edits, not code deploys. What WOULD require us is a brand-new TYPE of check the engine lacks a primitive for (e.g., service-minutes logic). Routine Georgia criteria and catalog updates are self-service; a fundamentally new check category is a vendor enhancement.
*If pushed:* self-service covers thresholds, prereqs, grade floors, and form fields; net-new check primitives are on us, with a committed turnaround in the SLA.

**Q: Per-school RLS isn't built — so a counselor at another high school can see my SPED students' requests. Isn't that an IDEA confidentiality problem?**
The right thing to push on. Today RLS is **role-based, not school-partitioned** — every counselor sees all requests, and per-school isolation is a tracked roadmap item before multi-school production. The mitigating fact for SPED specifically: **we don't pull disability flags at all**, so a cross-school counselor sees the waiver request and allowlisted academic fields — not an IEP. Still, even request visibility across schools exceeds need-to-know; **school-partitioned RLS is a precondition before going district-wide**, and a single-school pilot sidesteps it. *(Founder list: per-school RLS date.)*
*If pushed:* single-school pilot makes the gap moot; district-wide go-live is gated on per-school RLS landing first — we'll put that in the agreement.

**Q: If a parent uploads a transcript or doc in Spanish, does your parser read it or silently fail?**
The parser is tuned to the **English transcript format** with Levenshtein matching against an English catalog, so a Spanish or non-standard document would **parse poorly** — recognizing few/no courses and returning null GPA rather than crashing. It degrades quietly (a real failure mode). Importantly, when parsing yields little, the engine reports "no data on file" and routes to **human review** rather than guessing.
*If pushed:* for non-English docs the safe path is counselor-entered course data; automated parsing of translated transcripts isn't supported.

**Q: Does the engine ever treat "missing IEP accommodation data" as a reason to deny, since it can't see accommodations?**
No — it **does not deny on absence of data**. Unverifiable/missing criteria report a null result and are **excluded from the confidence ratio entirely** (not scored as failures). Missing required documents push a request to "review," never an automatic deny. The only things forcing a deny are hard gates the engine CAN verify — no seat, time conflict, unmet prerequisite. A student is never auto-penalized for accommodation data the engine is structurally blind to.
*If pushed:* absence of data = "review," never "deny" — the deny path requires a positively-verified blocker, which protects students whose relevant data we can't see.

**Q: Who on your side can see whatever student data IS in the system — and is special-ed staff access role-separated from general counselors?**
Access is role-based today: students vs an elevated **counselor/admin role** gated by `is_counselor()`, with the push-state table write-locked to the service-role function. Honest limit on granularity: there's **no distinct "SPED-only reviewer" role or per-school partition yet** — counselors are one elevated tier. Since we don't store IC-sourced disability flags, sensitive-data exposure is bounded; a separated SPED-reviewer role is a roadmap hardening item alongside per-school RLS. *(Founder list: specialist roles.)*
*If pushed:* the capability matrix already scopes which waiver TYPES a counselor can decide; a true SPED-isolated role is an extension of that, scoped for the pilot if you need it.

**Q: If we adopt this, do I have to babysit every SPED kid's request, or can routing surface only the ones that need me?**
Realistically you'd review the cases that need judgment, not every request — the engine clears fully-verifiable cases to high-confidence "admit" and routes ambiguous/missing-doc/borderline ones to "review," and you can **sort the queue by confidence** to surface the least-certain first. The gap: it can't auto-route by disability status (can't see it), so the cleanest pattern is a **SPED-specific intake form** whose requests land in a filterable queue your team owns. You set the rubric thresholds, controlling how conservative the auto-clear bar is. *(Founder list: specialist roles / routing.)*
*If pushed:* set your auto-clear threshold high for SPED-flagged forms and effectively nothing auto-admits without your eyes, which many coordinators prefer.

---

### Parents & Students

**Q: As a parent, can I log in and see my own account, or is this only for my student and the counselor?**
Honestly, today there's **no separate parent login** — there's a student portal (school Google account) and a counselor/admin command center. In a pilot, parents see schedule and waiver outcomes the way they do now, through the counselor and **IC's existing Campus Parent portal**, which remains your system of record. *(Founder list: build a parent layer or rely on Campus Parent?)*
*If pushed:* a read-only parent view is a reasonable roadmap item, but I won't claim it exists today.

**Q: Is an AI making the final decision about my child's schedule, or does a human decide?**
A **human counselor always makes the final decision**. The system produces a recommendation from explicit graduation/prerequisite rules, but the counselor reviews the evidence and clicks Admit/Deny/Flag themselves, and any override is flagged and logged.
*If pushed:* the tool can never write a final decision on its own; it surfaces reasoning and waits for a human.

**Q: Will my child be told an automated tool was involved?**
That's a disclosure decision the district owns, and we'd recommend transparency. The intake wizard already requires a **FERPA consent step**, a natural place to add a plain-language notice that a rules-based tool helps the counselor review. *(Founder list: who owns parent messaging.)*
*If pushed:* the consent screen exists today; the exact wording of an automated-assistance notice is a district policy choice.

**Q: If my child is denied a course, what's the appeals process?**
Today the product keeps a date-sorted **Rejected History** with the denial reason and counselor's note, giving you and the counselor the exact basis to support an appeal. There's **no built-in parent-facing appeals workflow** yet, so an appeal follows your district's existing escalation path, backed by the documented reason. *(Founder list: build an appeals portal?)*
*If pushed:* we give you the receipts for an appeal; a formal in-app appeals queue is a roadmap item.

**Q: Can I or my child see the actual reasoning behind a decision, in plain language?**
The **per-rule reasoning** (each check passing/failing with real values like GPA or a missing prerequisite) is fully visible in the counselor's cockpit and stored in the audit log. Whether it's surfaced directly to families or relayed by the counselor is a display decision; the data is plain-language by construction because it's literal rule checks.
*If pushed:* because there's no neural network, every reason is a concrete statement like "prerequisite Algebra II not completed."

**Q: Could a chatbot give my child a wrong or made-up answer about their graduation status?**
No — there's **no chatbot and no generative model** anywhere in the decision path, so nothing can hallucinate. Every output is a deterministic rule check against the catalog and transcript: same inputs, same result every time.
*If pushed:* we intentionally avoided conversational AI for exactly this reason — a tool that talks to kids about their diploma is one that can be wrong, so we don't have one.

**Q: Is my child's data sold, shared with advertisers, or used to train an AI model?**
No on all three. There's **no training data and no learned model**, so nothing is used to train anything. Under **Georgia SB 89** and our contract we're barred from selling PII, ad targeting, or non-educational profiling, and as a FERPA school official we don't redisclose. We're a data processor; you retain ownership.
*If pushed:* the strongest proof is architectural — there's literally no model being trained, so no pipeline that could consume student data for that purpose.

**Q: Exactly what does this system know about my child?**
Deliberately very little. From IC, a **field allowlist** permits only school ID, GPA, attendance rate, grade level, enrollment status, completed courses, and current schedule. We **explicitly block** SSN, birth date, sex, gender, race, ethnicity, address, guardian info, free/reduced lunch, and special-ed flags, with a tripwire that halts if a blocked field appears.
*If pushed:* the safest data is data we never pull — demographics and identifiers never leave Infinite Campus.

**Q: How will my family get notified — email or text?**
Today notifications are **in-app status badges** in the student tracker, plus a "notify me when a spot opens" waitlist button. There's **no email or SMS engine wired up**, so I won't promise texts. Adding email/SMS, and whether parents receive them, is a buildable roadmap item. *(Founder list: notification transport.)*
*If pushed:* in a pilot, the dependable channel is the counselor plus your existing district communication tools.

**Q: Is this available on a phone for parents without a computer at home?**
The product is built and tested for **Chrome on Chromebooks** (the staff/student device fleet). There's **no separate mobile app** today and parent phone access isn't a designed flow. Mobile-responsive parent access would be part of any parent-facing roadmap. *(Founder list: parent layer.)*
*If pushed:* we target the managed Chromebook environment in classrooms; broad parent mobile access is a deliberate scope item.

**Q: Is the tool in Spanish or other languages for families who don't read English well?**
Honestly, the interface is **English-only** today — no built-in translation. For a Georgia district with a significant ELL population that's a real gap I won't paper over. Localization is a roadmap item we'd prioritize for any parent-facing surface. *(Founder list: Spanish UI.)*
*If pushed:* in the pilot, language access stays with the counselor and your existing interpretation services.

**Q: Can a family opt out of having this tool used for their child?**
An **opt-out policy isn't defined** in the product — it's fundamentally a district policy decision. Because a counselor always makes the final call, the practical effect of opting out is that the counselor reviews manually without the recommendation. We'd help you write a clear procedure. *(Founder list: opt-out policy.)*
*If pushed:* since the recommendation is advisory and a human decides anyway, honoring an opt-out is straightforward operationally.

**Q: What about kids with no device or internet at home — does this disadvantage them?**
It shouldn't — it's primarily a **staff tool** on managed Chromebooks. A student's brief touchpoint (submitting a request) can be done at school on the 1:1 fleet, and a counselor can submit on a student's behalf. No home device/internet required to be served.
*If pushed:* the decisioning happens counselor-side regardless of home connectivity, so a student without home internet isn't pushed to the back of the line.

**Q: How do we announce this to families without setting off an AI panic?**
Lead with the disarming truth: **deterministic, rules-based assistant, not a learning AI, and a human counselor makes every final decision** with a full audit trail. "Counselors check every graduation rule faster and more consistently, and a person still decides." We'll give you a fact sheet matching what the product actually does.
*If pushed:* the worst PR outcome is overclaiming AI and getting caught; the safe and true story is transparency plus a human decision-maker.

**Q: What do we say if a reporter writes "district lets AI decide kids' futures"?**
Correct the premise: **no AI decides anything** — a credentialed counselor makes every admit/deny, the software only checks published graduation/prerequisite rules and shows its work, every decision is logged and overridable, and it stores only minimal academic fields, never race, special-ed status, or other sensitive data.
*If pushed:* we can hand a reporter the exact rule list and audit design — there's no black box to be evasive about.

**Q: Who does a parent call or email about a problem with this?**
Day to day, families go to their student's **counselor**, the decision-maker and right human contact; this tool doesn't change that. For platform issues, the agreement names a dedicated support contact on our side. A parent-facing help channel inside the product isn't built today.
*If pushed:* whether parents reach us directly or always through the counselor is a support-model choice we'd set with you.

**Q: How do you keep a minor's account secure if someone learns their login?**
Student access rides on your existing **Google Workspace OAuth**, so security inherits your district's identity controls — password policy, MFA if you enable it, instant deactivation. We **don't create or store separate student passwords**. Students are also limited to their own data by role-based access.
*If pushed:* because we don't hold a separate credential for a minor, there's no second password to be phished — your Google tenant's protections apply directly.

**Q: Can my child accidentally see or change another student's schedule?**
No. Students are scoped by **role-based access** and can only see/act on their own request data; counselor/admin views are gated by a counselor-only security check. A student account has no path to another student's records or to decision controls.
*If pushed:* the data layer enforces this, not just the UI — a student account simply lacks the permission to load anyone else's record.

**Q: If we leave the vendor, what happens to all the data you collected on our kids?**
You get a portable, standards-based **OneRoster export**, plus a **`purge-student`** function that deletes student data and a **written deletion certification** within an agreed window. Because rostering is OneRoster-native, there's no proprietary lock-in.
*If pushed:* the deletion is a real function, not a promise on paper — we'd certify it in writing within the contract window.

**Q: How long do you keep my child's transcript and request data?**
A specific schedule isn't fixed in the product yet, so we'd set it in the **data privacy agreement** to match Georgia records-retention rules and your district policy. Documents live in access-controlled storage, and we have a purge function to delete on demand or on exit. *(Founder list: retention windows.)*
*If pushed:* we can delete on demand today; codifying a fixed retention period is what the NDPA and Georgia addendum nail down before a pilot.

**Q: Does the tool consider race, disability, or income when deciding eligibility?**
No, and it **can't** — those fields never enter the system. The field allowlist explicitly blocks race, ethnicity, free/reduced lunch, and special-ed flags. Decisions run only on academic facts (GPA, completed courses, prerequisites, seat availability, conflicts).
*If pushed:* you can't bias on data you never collect — blocking those fields by construction is the strongest fairness guarantee we can offer.

**Q: What about a transfer student with a messy or out-of-state transcript — will the tool unfairly deny them?**
The tool surfaces what it can read and **flags uncertainty rather than auto-denying** — missing or unreadable history forces a "review" status the counselor handles manually with full discretion. Course-name matching uses fuzzy matching to recognize equivalents; anything it can't verify lands in front of a human.
*If pushed:* ambiguity routes to a counselor by design — the system escalates uncertain transfer cases, it doesn't guess against a kid.

**Q: Will my child end up spending more time on yet another app?**
No — it's not a student app to live in. A student's only interaction is briefly **submitting a request and checking a status badge**; the substantive work is counselor-side. It aligns with reducing screen time by replacing paperwork rather than adding a daily-use app.
*If pushed:* it's a counselor command center first; the student touchpoint is minutes per request, not hours per week.

**Q: Can a parent submit a request on behalf of their child, or only the student?**
Today the intake wizard is built for the **student account**, and the counselor can also initiate or submit on a student's behalf. A dedicated parent-submission flow isn't built, so in a pilot a parent works through their student or the counselor. *(Founder list: parent-submission path.)*
*If pushed:* counselors can already act for a student, so families aren't blocked; a distinct parent login is a scope decision.

**Q: If the tool recommends denying my child, does the counselor just rubber-stamp it?**
No — the counselor reviews the evidence and can **override any recommendation**, with overrides flagged and logged. The district tracks an **override rate and AI agreement rate** precisely so leadership can confirm counselors exercise independent judgment.
*If pushed:* a suspiciously high agreement rate is itself a signal an admin can act on.

**Q: How do we know the rules match Georgia and Forsyth graduation requirements?**
The rules are **explicit and inspectable**, not hidden in a model — written and configured to your catalog and graduation requirements, and counselors see every check. Form/rubric logic is built without code by your staff, and form versions are snapshotted at request time so changing a rule never rewrites past decisions.
*If pushed:* because every rule is human-readable, your counselors validate the logic directly rather than trusting an opaque system.

**Q: Are my child's uploaded documents stored securely?**
Yes — documents live in **access-controlled storage buckets** with service-role-only access and **short-lived signed URLs** for download; no standing public read access. Everything is encrypted in transit and at rest on US infrastructure, and the concentrated-PII registrar export is deleted immediately after each run.
*If pushed:* a transcript can only be retrieved through a server-minted, short-lived link — there's no open URL on the internet.

**Q: What happens if there's a data breach affecting my child's information?**
We have a documented breach-response policy and sign **breach-notification terms** in the DPA, so you'd be notified per the contract and Georgia law. The blast radius is limited by design — we never hold SSNs, demographics, or guardian data, so worst-case exposure is minimal academic fields, not a full identity profile. *(Founder list: breach SLA.)*
*If pushed:* field minimization is our breach insurance — even a worst case can't leak data we deliberately never collected.

**Q: If a spot opens in a full class, how does my child find out?**
There's a **"notify me when a spot opens" waitlist** subscribe button on a denied full-class request, and the student sees the update in their in-app tracker. Today that's an **in-app notification**, not email/text — a student checks their request status. *(Founder list: notification transport.)*
*If pushed:* the waitlist logic exists; turning it into an emailed or texted alert is the buildable next step.

**Q: Does this replace the relationship my child has with their counselor?**
No — the opposite. By automating rote rule-checking on a 400-student caseload, it **frees counselors** for the judgment and human conversations that matter. The counselor remains the decision-maker and the family's contact; the tool removes paperwork, not the person.
*If pushed:* less time on prerequisite spreadsheets means more time with students — the counselor relationship is what we're trying to protect.

**Q: Can my child see why a specific course is grayed out and unavailable?**
Yes — in the **course swap panel**, ineligible courses are grayed out and labeled with the exact reason (no seat, schedule conflict, or failed prerequisite), and hovering shows precisely why. That transparency is intentional so a student isn't left guessing.
*If pushed:* the student sees the same rule reasoning the counselor does for blocked courses — nothing hidden behind a generic "unavailable."

**Q: Has this been tested for accessibility for students with disabilities, like screen-reader users?**
It's built to **WCAG 2.1 AA** patterns (keyboard-navigable components, focus traps, accessible listboxes, system-aware dark mode). A **formal third-party VPAT/audit isn't complete** yet — delivered during procurement. *(Founder list: VPAT timeline.)*
*If pushed:* we build to the standard and will commit to a third-party VPAT during procurement — I won't claim a completed audit we don't have.

**Q: Is my child's special-education or 504 status visible to this tool or factored into decisions?**
No — special-ed flags are on the **explicit blocklist** and never pulled from IC, with a tripwire that halts if such a field appears. The tool has **no knowledge** of a 504 or IEP, so it can't factor it in. Accommodation handling stays with the counselor and your IC processes.
*If pushed:* we deliberately never see special-ed status; that sensitive determination remains fully human and inside your SIS.

---

### Teachers

**Q: I have hard section caps for fire code, contract class-size, and lab stations. Can this push a 31st kid into a capped section?**
No. **IC's section Max Students stays the single authority** and IC enforces it server-side on import — our in-app seat holds are deliberately **soft, application-layer reservations only**, and at push time we re-read a fresh roster and IC wins. The most we can do is over-promise in our own UI, which is why a counselor-approved change is re-validated against live IC enrollment before anything lands.
*If pushed:* if IC's section cap is correct, we physically can't blow past it; raising a cap is an IC change a human makes, not something we do silently.

**Q: Who controls the seat number — me, the registrar, or your software?**
**IC does** for the authoritative number — the cap lives in the IC section as Max Students, owned by whoever manages master schedule (typically the registrar/scheduler, with your input as chair). Our seat-hold table is a temporary 14-day reservation that prevents two counselors from promising the same last seat; it never edits or raises the IC cap.
*If pushed:* think of our hold as a sticky note that expires — the real seat count is always IC's, read fresh at push time.

**Q: My biggest fear is a prereq override dropping a kid into my AP class who never took the foundation course. Can a counselor override a failed prerequisite and still place them?**
Prerequisite is a **hard-fail gate** — a failed prereq forces a deny recommendation, not a quiet pass. But the counselor is always the decision-maker and can override any recommendation; when they do, the override is **explicitly flagged and written to the immutable audit log** with their note. So an unprepared student only lands in your room if a named human deliberately overrode a documented prereq failure — permanently on the record.
*If pushed:* the tool's default answer is deny; an override is a logged, attributable human act, not an automated placement.

**Q: Do teachers get any login, input, or veto, or is it counselors deciding over our heads?**
Honest answer: today there is **no teacher role** at all — the two roles are student and counselor/admin, so teachers don't log in and have no in-app veto. Teacher consultation happens off-platform as it does today. *(Founder list: add a teacher "recommend/flag" lane or a hard veto gate for AP/honors?)*
*If pushed:* both are buildable on the existing role model; neither exists yet.

**Q: When a student is added to my class mid-semester, do I find out from your system or just discover a new name?**
**From IC, not from us** — and honestly that's a gap. Because there's no teacher role, the tool sends no notification; the approved change syncs into IC and you see it through your normal IC roster. *(Founder list: build a teacher roster-change notification?)*
*If pushed:* we could surface the change to you via IC's own notifications, or build a teacher digest — a roadmap decision.

**Q: Late adds and drops wreck my pacing and gradebook. How does this handle a drop three weeks in?**
A drop is a counselor-approved change: it frees the soft seat hold and syncs the enrollment change to IC, where your gradebook lives. **We don't touch grades** — the push carries only operational enrollment keys, never grades or demographics. The pacing impact is the same as any IC drop; what we add is an audit log of when and why it happened.
*If pushed:* we never write to your gradebook — we move the enrollment in IC and IC owns grades from there.

**Q: As department chair, does this enforce AP/honors gatekeeping the way we set it up — GPA or teacher-recommendation requirements?**
It enforces **whatever you put in the rubric, and nothing you don't**. Out of the box: prerequisite, grade level, seat, conflict; a GPA floor or attendance threshold can be added, but a "teacher recommendation required" gate **isn't a built-in field** and there's no teacher-rec capture today. So gatekeeping is honored to the extent it's encoded as deterministic rules. *(Founder list: encode AP/honors criteria as hard rules vs add a teacher-rec field?)*
*If pushed:* GPA/prereq we enforce now; a teacher-rec field would need to be added and a collection method decided.

**Q: Our master schedule has grade-level limits — Bio is for 9th/10th. Does the tool stop an upperclassman below grade, or stuff freshmen into senior courses?**
It enforces the **lower grade bound but deliberately NOT the upper one**. The engine has a hard "grade level >= minGrade" rule, so a freshman can't be placed in a grade-11-gated course. The upper bound (a course showing 9-10) is **advisory metadata, not a ceiling**, because juniors/seniors legitimately backfill courses like Biology. A hard ceiling on a specific course is a rule we'd add deliberately.
*If pushed:* the default avoids false denials for legitimate backfill; a real ceiling is a one-line rule we add per course if you want it.

**Q: If your system recommends placing a kid in my class, can I see WHY — the reasoning, not just a yes?**
The reasoning exists and is **fully transparent** — every recommendation is a list of per-rule pass/fail checks with actual values, plus a confidence score (passing ÷ verifiable checks). The catch: that view lives in the **counselor cockpit and audit log**, counselor/admin surfaces — there's no teacher-facing view today, so you'd ask a counselor to show you. *(Founder list: give teachers direct read access?)*
*If pushed:* the explainability is real and exportable to CSV; teacher read access is the missing piece, not the data.

**Q: Does this software override a counselor's or teacher's course recommendation with its own algorithm?**
No — it **recommends, the counselor decides**. The engine produces a recommendation with reasoning but has zero write authority over the decision; a human must explicitly hit Admit/Deny/Flag and can override, with the override logged. It's a deterministic rules engine, not a model that asserts its own judgment over staff.
*If pushed:* same input, same rubric, same output every time — there's no black box reweighting your recommendation.

**Q: What's the realistic class-size impact across the department? If counselors fill every open seat fast, my sections balloon to the cap on day one.**
The tool can fill seats only **up to the IC cap, never past it**, so it can't create oversize sections — but faster approvals can push sections toward their cap sooner. There's **no auto-balancing across your sections** today; placement targets the first period with an open seat under capacity. *(Founder list: add section load-balancing?)*
*If pushed:* caps protect the ceiling; even distribution under the cap is a balancing feature we'd scope with your department.

**Q: Can I see my waitlist? When a seat opens, who gets it and on what basis — and do I have a say?**
Waitlist visibility today is **student-side and counselor-side, not teacher-side**: a denied student subscribes to "notify me," and when a drop frees a seat subscribers are notified. Honest limits: no teacher view of who's waiting, the notify order is **not a guaranteed priority queue** (it notifies, it doesn't auto-enroll by rank), and you don't have an in-app say — a counselor makes the placement. *(Founder list: ranked waitlist with teacher visibility/priority?)*
*If pushed:* current build is counselor-driven placement minus a teacher view.

**Q: How much extra work does this put on me? I don't have time for another login.**
For teachers specifically, **essentially none** — there's no teacher login or task. It's a staff tool for counselors and registrars; you keep working in IC as you do now. The flip side: zero added work also means zero added voice in-app, since there's no teacher surface yet.
*If pushed:* we add work to the counselor's plate to take it off theirs; we add nothing to yours unless you ask for a teacher role.

**Q: As department chair I assign which teacher teaches which AP section. Does your tool touch the master schedule or teacher-section assignments?**
No. The product moves **student enrollments** (placing/swapping a student into a section), not the master schedule and not teacher-to-section assignments. Master schedule construction and staffing stay entirely in IC, owned by your scheduler and you — we only reconcile student placements against existing sections.
*If pushed:* we never restructure sections or reassign staff — we place students into the schedule you and the registrar already built.

**Q: Our teachers are union — class size, prep, and adds are contract-governed. Has this been vetted against collective bargaining or board class-size policy?**
Honestly, contract/board-policy compliance is a **district-policy question the software doesn't adjudicate**, and it isn't pre-vetted against your specific CBA. What I can say: the tool **can't exceed IC caps**, so if your contractual class-size limits are encoded as IC section Max Students, the tool respects them. Policy review against your CBA and Georgia board rules is part of pilot scoping. *(Founder list: union/board policy review.)*
*If pushed:* encode contract limits as IC caps and we honor them by construction; the legal vetting is a district step we'd build into the pilot.

**Q: If a counselor overrides a prereq and the kid fails my class, where does liability land?**
The override is **attributed and timestamped to the deciding counselor** in the immutable audit log, with their note — so the record shows a named human's documented decision against a flagged prereq failure, not the system's and not yours. Where institutional liability ultimately sits is a district HR/policy matter, but the tool points the decision trail at the decision-maker. *(Founder list: liability allocation.)*
*If pushed:* the audit answers "who decided this and why" definitively — that protects the teacher from owning a choice they didn't make.

**Q: Can the rubric be tuned per department or per course, or is one set of rules forced on AP, honors, and on-level alike?**
**Per-course and per-form, not one global rubric.** Rules derive from each course's catalog row (its prerequisite, its minGrade), and the Form Builder lets you build per-waiver-type forms with their own embedded logic — AP Calc can carry different criteria than on-level math. Chairs can shape rules without code, and form versions are snapshotted at request time.
*If pushed:* there's no forced one-size rubric — the catalog and form builder are where your department's specific gates live.

**Q: How current is the seat count the counselor sees? A stale number means they approve into a section I already filled.**
Two layers: the number in our UI during review is a **soft reservation view and can lag**. The protection is at push time — before any change is applied, the batch is **re-validated against a fresh OneRoster pull**, so a section you filled since the counselor looked causes the change to supersede rather than over-enroll. The decision screen may be slightly stale; the actual write is reconciled against live IC.
*If pushed:* stale-at-review is caught at push by the fresh-pull recheck — you can't get over-enrolled by a stale screen.

**Q: Two counselors hit "admit" on the last seat in my section at the same time. Does your tool double-book my room?**
No — that race is handled. The seat claim runs through a Postgres function taking a per-(course,period) **advisory lock**, so the capacity check and reservation are one indivisible step; the second counselor gets "no seat." And pushes are **idempotent** on the student-plus-class key, so even a retry can't double-enroll. IC's cap is the final backstop.
*If pushed:* the advisory lock serializes simultaneous claims — only one counselor wins the last seat, deterministically.

**Q: Does the tool ever auto-place a student into my class without a human in the loop?**
No. Nothing reaches IC without a counselor's explicit **Admit**, and even then the auto-push is **gated off** — the functional pilot path is a manual registrar worklist a human applies in IC. So there are two humans between the algorithm and your roster: the counselor who decides and the registrar who applies.
*If pushed:* auto write-back is built but deliberately off; today a registrar is the last mile by design.

**Q: We're cutting student screen time district-wide. Are you putting another app in front of kids during my class?**
No — students touch it briefly to submit a request, not to live in it, and it's primarily a **staff tool**. There's nothing for a student to do during your period; the ongoing work is counselor-side. It reduces paperwork churn rather than adding daily student app time.
*If pushed:* it's a submit-once form for students, not a daily-engagement app.

**Q: If a student appeals a denial — say I think they should be in my AP class — can I see the full history of why they were denied?**
The history exists: **Rejected History** holds every denial with reason + counselor note, and the per-check AI reasoning log shows exactly which rule failed with actual values — CSV-exportable. The catch for a teacher: those are **counselor/admin surfaces**, so today you'd request it from a counselor rather than open it yourself. *(Founder list: teacher access.)*
*If pushed:* every denial is reconstructable for an appeal; whether you read it directly or via a counselor is an access-control choice.

**Q: How does it handle co-requisites, multi-step prereq chains, or "or" prerequisites — like Algebra II OR Geometry-with-a-B?**
Honestly, today the prereq model is **simple**: one named prerequisite per course, checked as an exact "did the student complete this course" match. It does **not** yet handle co-requisites, multi-step chains, or "A or B" alternatives in the default rule, though the underlying prerequisite-graph (Kahn's topological sort) is built for dependency validation. *(Founder list: how complex are your real prereq rules?)*
*If pushed:* simple chains we can model; "or" and grade-conditioned prereqs need rule-authoring work we'd scope.

**Q: Will I get pulled into training and meetings to roll this out? My prep time is gone.**
Training is targeted at the people who use it — **counselors, registrars, admins** — with live plus train-the-trainer. Since teachers have no role in the tool, there's **no teacher training burden** in the current design. If your district later adds a teacher-facing feature, that changes the footprint.
*If pushed:* no teacher role means no teacher training line item today — that only changes if you ask for teacher features.

**Q: Can the counselor change the seat cap on my section through this tool to make room?**
No. The tool has **no ability to edit IC's Max Students** — our holds are read-and-reserve only against a soft count, and IC's cap is changed only inside IC by someone with scheduling rights. A counselor wanting more room gets the cap raised in IC by the registrar; this product can't do it.
*If pushed:* raising a cap is an IC scheduling action by a human — we have no write path to it.

**Q: Does the engine consider teacher load or fairness across staff, or just whether a seat exists?**
**Just whether a seat exists** under the cap, plus prereq, grade, conflict — it does **not** model teacher load, prep-period fairness, or staff balancing. Those are master-schedule and chair-level judgments the tool doesn't touch. *(Founder list: teacher-load-aware balancing?)*
*If pushed:* today it's seat-and-rule only; encoding teacher-load fairness is a scoping conversation.

**Q: What if your reasoning is wrong and it greenlights a kid who shouldn't be in my class — can the algorithm be flat-out incorrect?**
It can only be wrong **the way a checklist is wrong** — if the catalog data or authored rule is wrong, not because a model hallucinated (there's no generative model). Every recommendation is pure functions over your catalog and seat data, so "same student, same rubric, same answer." A counselor reviews the per-rule reasoning before deciding, so a bad rule shows itself in the open checks — and you, as chair, own the catalog rules.
*If pushed:* the failure mode is a wrong rule or stale catalog, both fixable and visible — not an unpredictable model.

**Q: Bottom line — does adopting this shift scheduling power away from teachers and chairs toward counselors and a computer?**
It concentrates the **request/waiver review workflow on counselors** with a transparent audit trail; it doesn't take away anything teachers and chairs control today, because teachers had no in-tool authority before and the master schedule and caps you own stay in IC. The honest tension: it makes counselor decisions faster and better-documented without adding a teacher voice in-app. *(Founder list: add a teacher/chair role?)*
*If pushed:* it doesn't strip your existing power; whether it adds you new in-app power is a roadmap choice we'd scope together.

---

### Security & Risk

> Several access-control / RLS / breach / sub-processor questions overlap with **IT & Infrastructure** and **Privacy, Legal & Compliance** above — those answers aren't repeated here. This section captures the distinct, deeper security-officer gotchas.

**Q: If an attacker compromises a counselor's Google account, what stops arbitrary approvals pushed to IC — can we force app-layer MFA or IP whitelisting?**
Auth delegates to **Google OAuth** (you enforce MFA + Workspace security at your end), and pushes are **re-validated against a fresh OneRoster pull** so a fake change fails if state changed — but if a real account is live, the change looks legitimate. Schedule AI has **no application-layer MFA, IP whitelist, or session timeout yet** (roadmap). For now, the signed DPA should mandate your Workspace MFA + district IP controls as a prerequisite. *(Founder list: app-layer session/IP controls.)*
*If pushed:* re-validation is a hard check, but account compromise is only mitigated at the Workspace/network layer today, not the app layer.

**Q: How are the registrar signed URLs protected — can they leak in logs, be forwarded, or reused after expiry?**
Signed URLs are **short-lived one-time credentials** (Supabase default ~1 hour; we may not enforce a shorter window). Honest gaps: **no documented max lifetime, no logging of URL generation/use, no early revocation** if forwarded. A leaked URL is unguessable but valid until expiry. Ask for documented lifetime (<15 min recommended), mint/access logging, and a contractual "never forward out-of-band" requirement. *(Founder list: signed-URL lifetime + logging.)*
*If pushed:* signed URLs beat standing read access, but there's no audit trail of their use or documented lifetime/revocation yet.

**Q: "Deno Vault" for IC credentials — is that a real KMS/HSM? How often rotated, and what happens if a key leaks?**
**Deno Vault is a runtime secrets manager** (environment-based, encrypted at rest) — **not a hardware security module or dedicated KMS** (AWS KMS / HashiCorp Vault). Keys rotate only on manual env-var update; a leaked IC credential could read your roster. Ask for a rotation schedule (quarterly or on vendor-ops turnover), an incident-response revocation plan, and confirmation keys are never logged in cleartext. *(Founder list: secret-access policy + rotation.)*
*If pushed:* adequate for gated infrastructure, but not NIST-equivalent to a dedicated KMS — rotation frequency is a policy decision, not enforced by the system.

**Q: Can disability be inferred indirectly — e.g., pulling a "Resource Self-Contained" section name even though special-ed flags are blocked?**
A real gap to flag. The allowlist blocks special-ed flags, but if `currentSchedule` includes an IEP-specific section, pulling that section name **exposes disability indirectly**. For a rock-solid posture: confirm the allowlist bans any field hinting at 504/IEP status, decide whether section names are scrubbed, and consider restricting non-mainstream section visibility to an IEP-coordinator role. *(Founder list: section-name inference / specialist roles.)*
*If pushed:* special-ed flags are blocked, but disability can be inferred from schedule metadata — needs a role-based view to be fully defensible.

**Q: How is audit-log immutability actually enforced — append-only DB permissions, cryptographic hashing, or both? Can a Supabase DB admin tamper with it?**
Honest: **"immutable" is asserted but the mechanism needs specification.** True immutability requires application-layer INSERT-only enforcement, an append-only table with no service-role DELETE/UPDATE, and/or cryptographic hashing — and a raw-SQL DB admin **can** modify any table unless explicitly blocked. Ask for a design doc: is it Postgres-permission-enforced, application-enforced, or hash-verified, plus a separate read-only forensic export. *(Founder list: audit immutability mechanism.)*
*If pushed:* immutability is a critical control whose implementation isn't documented yet — that's exactly the kind of thing to pin down in the security review.

**Q: How is the form-builder versioning protected — can an admin edit an OLD snapshot to retroactively flip a decision?**
Form versions are **snapshotted at request time** (new requests use new versions, old requests keep their snapshot), which is correct. The gap: it's **not documented whether an admin can edit an old snapshot** or whether snapshots are truly immutable. Confirm old snapshots can't be edited (only archived), every form change is logged with a diff, and any rubric change notifies counselors with pending decisions under the old rubric. *(Founder list: snapshot immutability + change logging.)*

**Q: What if IC is down when a counselor clicks "Admit" — does it queue locally and retry, or require IC live?**
The auto-sync runs on a configurable cadence with a "Force Sync Now" button, implying **async retry** — admissions likely queue locally and retry even if IC is down (good for resilience). Honest: the **IC-dependency at admission time isn't fully documented**. Ask whether admissions queue + retry (e.g., every 60s until IC recovers) and whether the UI warns if IC is unreachable at decision time. *(Founder list: IC-down behavior.)*

**Q: Who signs the "school official status" attestation, and when — once at contract, or per counselor?**
Not specified. Best practice: a signed FERPA attestation as part of the **DPA (district signs once)**, with a clause allowing immediate revocation on breach or policy violation. For the pilot, the DPA should state the school-official delegation applies **only to defined pilot users** and is revoked when a user leaves or the pilot ends. *(Founder list: attestation timing/scope.)*

**Q: Will you accept OUR vendor-neutral DPA or require SDPC/A4L — and what's your indemnification cap?**
We commit to the **NDPA**, and the district-friendly answer is to **sign your existing DPA** with Schedule-AI-specific appendices (data elements, retention, deletion) rather than forcing a template switch. On indemnification, ask for **uncapped liability for FERPA breaches/data theft/negligence**, with capped liability only for general commercial disputes — a founder/legal decision. *(Founder list: accept district DPA + cap structure.)*

**Q: What's in your breach-response policy — 72-hour family notification, credit monitoring, or just "timely notice"?**
We have a documented policy; the specifics are DPA terms. Ask for a plan with a **timeline** (notify district ≤24h, district notifies families ≤72h or per state law), insurance/legal notification, forensics, root-cause + remediation, and **vendor-paid credit monitoring**. If not yet published in full, require it as a pre-pilot condition. *(Founder list: breach SLA + cost coverage.)*

**Q: The student transcript upload — what's the file-type validation? Can someone upload an executable or macro-Word doc, and who can re-download it?**
**MIME/type/size validation** is mentioned (client-side). Honest gap: **no documented server-side validation, virus scanning, or execution isolation.** Files are stored with **service-role-only access** (only the backend downloads them; not student-re-downloadable). Require **server-side validation**, a **virus scan on every upload**, and confirmation no file is ever served back to a browser as-is. *(Founder list: server-side validation + AV scan.)*
*If pushed:* server-side file validation and virus scanning are a pre-pilot security requirement.

**Q: What exactly is "Levenshtein matching" — does it cross-reference your catalog, and must a counselor approve a non-exact match before admission?**
Levenshtein is a **string-similarity metric** for fuzzy course-name matching (e.g., "AP US History" vs "AP U.S. History"). Risk: without a reference catalog it can over-match (e.g., a homeschool "Biology" → your "Biology I," falsely satisfying a prerequisite). Ask whether matching uses a pre-loaded catalog and whether a **counselor must explicitly approve non-exact matches** before admission. A safe design: suggest 3-5 options with confidence %, counselor picks/rejects. *(Founder list: explicit match approval workflow.)*
*If pushed:* fuzzy matching without explicit counselor approval is a data-integrity risk; the approval workflow isn't documented.

**Q: The OneRoster delta CSV is "deleted immediately after each run" — before or after IC confirms? Can you prove what was pushed in a dispute?**
"Immediate" likely means after the SFTP upload completes. The key question: does the **database log the push attempt** (which rows, what values) even though the CSV file is deleted? Ask for the sequence (generate → upload → IC ack → delete local copy) and confirmation the audit log captures "pushed N records on DATE, IC status OK/FAIL." If the CSV is gone and the delta isn't logged, there's **no way to prove what was pushed** — a forensics gap; a better design retains the CSV 90 days in an immutable, admin-only archive. *(Founder list: delta-push logging.)*

**Q: What's the encryption key-management model — Supabase default or customer-managed? Can we bring our own key (BYOK)?**
Supabase provides **AES-256 encryption at rest, Supabase-managed keys** — adequate but **not customer-managed**, and BYOK isn't offered today. For maximum control you'd want envelope encryption with a district-provided KMS key (outside Supabase's current product). If neither is available, ensure backup/recovery is documented and auditable. *(Founder list: BYOK / key management.)*
*If pushed:* customer-managed keys aren't offered; Supabase default encryption is adequate but not maximum-security.

**Q: If Supabase (your host) has an incident, are you liable to the district, and how fast can you migrate providers? Is the database portable?**
The app's data model is **OneRoster-standard and exportable**, but Supabase-specific schema (migrations, functions) may not be fully portable. The DPA should include **vendor liability for sub-processor (Supabase) breaches**, a data-export SLA (export all district data within 48h), and a vendor-change clause. Ask for a test PostgreSQL-dump export to prove portability. *(Founder list: sub-processor liability + portability.)*

**Q: Are all sensitive operations (OneRoster pull, signed-URL minting, push-state) server-side, or does client-side code need firewall holes?**
All sensitive operations are **server-side Deno edge functions** — IC credentials and signing keys never reach the browser, the browser is purely a UI client calling PostgREST + edge functions, and the app needs **no firewall holes or client-side VPN**. Confirm via a security architecture diagram.
*If pushed:* the cheat sheet is clear all sensitive operations are server-side — a security architecture diagram confirms it.

**Q: What's your RPO/RTO for the database and delta files — warm standby or just backups?**
Supabase offers **daily backups + point-in-time recovery**, but we **don't yet publish a tested RTO/RPO** or maintain a warm standby (most early-stage SaaS relies on Supabase replication). A reasonable target SLA is RPO <4h, RTO <1h. The DPA should commit a specific RTO/RPO or escalate Supabase to a tier with stronger backup guarantees. *(Founder list: RTO/RPO commitments.)*

**Q: The sync edge function advances the push-state machine — is there concurrency control if two invocations race the same request's state?**
Deno functions scale horizontally, so multiple invocations could theoretically race a state update. Honest gap: **no documented optimistic-locking/version field/CAS** on the push-state table. Because the machine is forward-only (queued → claimed → exported → …), a version field would prevent a stale "queued" overwriting "claimed." Ask for a state-machine design doc. *(Founder list: push-state concurrency control.)*

**Q: Two IC instances exist (test/prod). If the base URL points at the wrong one during a pilot, enrollments push to the wrong district — how is that detected?**
There's **no automatic detection** — wrong credentials silently succeed against whichever instance they point to, and the audit log shows the push without verifying the sourcedIds match the expected school. A critical config risk. Mitigations: a **signed configuration attestation** before go-live, a "verify connection" test in setup, and logging the base-URL origin in the audit trail. *(Founder list: IC environment verification before enabling push.)*

**Q: If a seat is oversold (IC cap 30, we promised 31 on soft holds), the 31st push is rejected by IC. What happens?**
Our **soft holds are app-layer only; IC's Max Students is ground truth.** Revalidation at push time checks enrollment-active + GPA, **not seats**, so a 31st approval can reach `exported` and IC then **rejects it on import** (class-full); the row fails and is retried/handled manually. Honest gap: **revalidation should include a live IC seat re-check.** *(Founder list: add seat re-check to revalidation.)*
*If pushed:* revalidation is deliberately conservative (Deno-safe); a full seat re-check would call IC again and could be added.

**Q: Can the rubric builder let an unsophisticated counselor create a rubric that bypasses a state-mandated prerequisite — is there an approval step?**
Not documented. The builder is **low-code, not policy-enforced** — a well-meaning counselor could weaken a requirement. The builder should include a **library of pre-approved rubric templates**, require a **compliance/admin sign-off** before a rubric is published, and preview behavior. *(Founder list: rubric change-control + approval gate — overlaps with PPRA governance.)*

**Q: When the contract ends, who can read/export the audit log, and is it in a student's data-access export? How long retained?**
Audit access controls aren't fully specified. For a district the log should be readable by **district admins/FERPA officers**, exportable by registrars for appeals, included in a **student data-access export** (so a student sees decisions made about them), and **retained ~7 years** per state records-retention. *(Founder list: audit access + retention.)*

**Q: If a student's transcript is wrong and a waiver is admitted on false data, who's liable — and is there fraud detection (tampered PDFs, all-A+ outliers)?**
A liability boundary: the **counselor stays the decision-maker** and is responsible for vetting transcript authenticity; Schedule AI is responsible for **accurate parsing of authentic transcripts** (a mis-match like "Chemistry 101"→"Chemistry II" is our bug, not the counselor's judgment). On fraud: ask whether we check tampered-PDF signals (modification date, digital signature) or red-flag outliers — not built today. *(Founder list: warranty scope + fraud detection.)*

**Q: You're "gated off" on auto-push and "stubbed" on SFTP — what do those mean, and who flips the gate?**
**"Gated off"** = the auto-push code is present but behind a flag returning an error (412) until a compliance flag is set after legal review; **"stubbed"** = the SFTP transport returns a not-implemented response pending district credentials. The cheat sheet says a Schedule-AI admin flips it — but the safer model is **mutual consent** (district signs off), only after your DPA + security review, with audit-trail notification and revertibility. *(Founder list: who flips the gate — make it district-consented.)*
*If pushed:* who controls the gate (district vs vendor) is a contract/governance item — we'd make it mutual.

**Q: If we re-sync a school in IC and it re-issues sourcedIds, does your local mapping break?**
If IC re-issues sourcedIds (rare, e.g., a major cleanup), our local mapping can go **stale** — old requests keyed to old IDs, new enrollments not matching. Safer design uses OneRoster's persistent `sourcedId` as the unique key so re-syncs don't break the mapping; a "resync IDs"/auto-remap function is the mitigation to confirm in the schema. *(Founder list: ID re-sync recovery.)*

---

### Implementation & Support

**Q: Walk me through the phased rollout plan — what are the gates, and who signs off before pilot → school-wide?**
Four phases: **Phase 1 (Week 1)** onboard + import catalog and graduation rules; **Phase 2 (Week 1)** pilot with one counselor on one grade level, running the **manual registrar-worklist** path; **Phase 3 (Week 2+)** school-wide at one or two schools at your pace; **Phase 4** district-wide only after a **peak-concurrency test** against your IC sandbox passes. The honest gate between Phase 2 and full production: live IC write-back follows your **security review and sandbox validation**, not day one. Sign-off authority is yours, with defined exit criteria (decision time, hours saved, override rate).
*If pushed:* we don't claim district-wide readiness before measuring it against your real IC contract load — the pilot is the gate, not a calendar date.

**Q: Who does the data migration — your team or mine? Be specific about catalog and graduation rules.**
We do the heavy lift in Week 1: **import your catalog and graduation/prerequisite rules**, and rostering **hydrates over OneRoster from IC** rather than a bulk migration. There's **no inbound CSV ingest**, so we don't ask for a spreadsheet dump — the load is a guided config session with your team validating, rosters pull live from IC once we have sandbox credentials. You own validating the catalog/rules match your program of study; we own getting them in.
*If pushed:* because rostering is OneRoster-native, the "migration" is mostly catalog + rules config plus a live IC pull — not a brittle one-time ETL.

**Q: How do you validate the imported catalog and rules are correct before a counselor relies on them?**
Two checks: the prerequisite graph is validated with **Kahn's topological sort**, surfacing cycles/orphaned prereqs at import (a malformed chain fails loudly); and during pilot you **replay real historical waivers** through the rubric and compare the engine's recommendation against the counselor's known decision — the override/agreement rate is your calibration signal. Because the engine is deterministic, QA is reproducible.
*If pushed:* a high pilot override rate isn't a failure — it's the tuning signal telling us the rubric doesn't yet match your standards, and we adjust before scale.

**Q: We want to go live during summer scheduling season — our peak. Smart, or do you push back?**
We'd **push back on flipping automated IC write-back during your first peak.** Recommended path: pilot the **manual registrar-worklist mode** during summer — full review-and-recommend value with a human registrar applying changes in IC — while the automated OneRoster delta push stays gated until your security review and a peak-load test pass. You get summer value without betting the season on unproven-at-your-scale write-back.
*If pushed:* the seat-claim concurrency is proven in simulation, but live all-8-schools contention during peak is exactly what we won't claim until the sandbox load test measures it.

**Q: What does training actually look like — format, length, who's in the room, and what do we keep?**
**Live plus train-the-trainer**, included, with separate tracks for counselors, registrars, and admins (different screens). Honest gap: the **specific format details — session length, virtual vs on-site, exact deliverables** (quick-reference guides, recorded walkthroughs, admin runbook) — aren't fixed and should be scoped with you. The product is built to need minimal training (auto-advancing cockpit, no-code form builder). *(Founder list: publish session count/length per role; commit to leave-behind guides.)*

**Q: Counselor turnover is real in Georgia. How does a new counselor in October get trained without you re-flying out?**
**Train-the-trainer** is the structural answer — we certify your leads to onboard new hires, so you're not dependent on us for every replacement. The cockpit is self-explanatory (every recommendation shows its reasoning). Honest gap: a self-serve always-available training library (recorded modules, in-app guidance) is a deliverable we'd commit to rather than something fully built. *(Founder list: ongoing new-hire training bundled vs billed.)*

**Q: What are your helpdesk hours and channels? During crunch I need same-day answers.**
A business decision we haven't finalized, so I won't overstate it. Realistic today: **direct email/portal to a named contact during business hours**, faster turnaround for pilot partners. We'd commit in the agreement to a defined channel (email + shared Slack/Teams or portal), **business-hours coverage aligned to ET**, and a documented escalation path for a P1 during scheduling windows. *(Founder list: strictly business-hours or extended peak coverage?)*
*If pushed:* extended peak coverage during defined scheduling weeks is the honest ask for a 54k-student district.

**Q: Put SLA numbers on this — response and resolution by severity, in the contract?**
No published tiered SLA yet — a commitment to negotiate, not invent on the spot. A defensible starting framework: **P1** (system down / blocked push during scheduling) respond within hours, active work to resolution; **P2** (degraded, workaround exists) next business day; **P3** within a few business days. Uptime target **99.9%**. *(Founder list: exact per-tier hours + service credits.)*
*If pushed:* as an early vendor I'd rather agree to honest, achievable numbers than promise enterprise tiers we can't yet staff.

**Q: What's the uptime guarantee during the two-week course-request windows when every school hammers the system?**
We target **99.9%** and commit it in the agreement. The architecture is built for concurrency (stateless edge functions, idempotent batch pushes, `pg_advisory_xact_lock`), validated under simulated load. Honest caveat: live all-8-schools contention against your real IC contract is exactly what the **pilot's peak-load test against your sandbox** is for — we won't claim a peak-window number we haven't measured. *(Founder list: hard peak-window SLA above 99.9%?)*

**Q: Will I have a single named CSM, or whoever picks up the phone?**
Yes, a **named success/support contact** named in the agreement. Honest about scale: as an early company that may be a founder or small team rather than a dedicated enterprise CSM org — which means senior attention and roadmap influence for a founding district. The formal CSM model (who, backup, coverage when out) is defined in your contract. *(Founder list: named CSM + backup chain.)*

**Q: When something breaks in production, how do I find out — status page, email, dashboard?**
Honest: a public status page and formal incident-comms process **aren't built yet** — a gap I won't paper over. What exists is in-app signal: the **Batch Sync Dashboard** shows per-row state (pending/synced/failed/superseded) and a pending-sync count, so a registrar sees push lag early, and the failed state is retryable. We'd commit to proactive incident notification and a status/incident channel before district-wide go-live. *(Founder list: status page + incident runbook.)*
*If pushed:* the forward-only push-state machine means an incident can't silently corrupt enrollment — failed work waits in queue.

**Q: Who owns configuration once we're live — can my admins change things without a ticket?**
Configuration splits cleanly. **You own the editable layer**: forms/waiver types (no-code Form Builder), rubric/decision logic, the shared resource library, counselor capability assignments — admins change these in-app, no ticket. **We own the deeper plumbing**: the OneRoster/IC connection, edge functions, the FERPA field allowlist, and the push-state machine (security- and integrity-critical). The line: anything affecting what counselors decide is yours; anything touching IC credentials or write-back integrity is ours.
*If pushed:* we lock the IC-credential and push-state layer to service-role server code so an admin can't accidentally forge a "confirmed" write-back — a safety boundary, not hoarding control.

**Q: Do I get a sandbox/test environment separate from production to train staff and test rule changes without real data?**
Two layers today: the app runs **demo/seeded data paths** (batch/OneRoster/IC flows currently on demo data) — effectively a safe training surface with no real PII — and the design assumes an **IC sandbox connection** before any production write-back (the pull returns 503 and auto-push 412 until connected). Honest gap: a **formally provisioned, persistent per-district staging environment** mirroring production config isn't a packaged offering yet. *(Founder list: dedicated persistent staging vs refreshable demo mode.)*

**Q: How do version updates work — will you push a change mid-scheduling-season and break my counselors?**
Honest: a formal release cadence and change-notice policy **aren't documented yet** — a commitment to define in the agreement. We'd put in writing: **no breaking workflow changes during your declared peak windows (a change freeze)**, advance release notes for user-facing changes, and your sandbox getting updates before production. Critical safety: **form versions are snapshotted at request time**, so even a rubric/form change can't rewrite decisions already made. *(Founder list: notice window + peak-season freeze.)*

**Q: Who maintains the rubric over time — when graduation requirements change for a new cohort, who updates them?**
**Your district owns it long-term** — editable in-app via rubric/decision logic and Form Builder, no code, no ticket. When grad requirements change, an authorized admin updates the rules or builds a new waiver form, and because **versions are snapshotted**, the change applies forward without rewriting prior cohorts. We configure the initial catalog/rules in Week 1 and stay available for complex changes, but you're not dependent on us for routine updates.
*If pushed:* because the rules are inspectable in-app, your curriculum team owns year-over-year updates directly — no vendor ticket queue gating your scheduling season.

**Q: What does off-boarding look like operationally — timeline, format, and proof the data is gone?**
Three artifacts: a portable **OneRoster-shape export** (no lock-in), the **`purge-student`** deletion function, and a **written deletion certification** within an agreed window. Honest open item: the specific window length (30/60/90 days) and exact handoff steps are a contract term to set. Because rostering is OneRoster-native and IC stays the system of record, off-boarding strands nothing. *(Founder list: deletion-certification window + escrow inclusion.)*

**Q: What success metrics do you measure, and do you do QBRs?**
The product instruments them natively: **Team Analytics** reports total requests, admit/deny/flag, average decision time, AI agreement rate, override rate, and pending-sync count — measured from live data, not a vendor slide. Pilot success criteria anchor to decision time, hours saved, and override rate, with a clean exit if not hit. Honest gap: a **formal QBR cadence** isn't an established program yet. *(Founder list: QBR frequency + attendees; money-back-on-miss.)*

**Q: Give me a concrete go-live readiness checklist before you flip on automated IC write-back.**
Five gates: (1) **signed DPA + your security review complete**; (2) **IC sandbox credentials connected** so the OneRoster pull clears its 503; (3) the **compliance flag set after legal review** so auto-push clears its 412; (4) a **peak-concurrency load test passed** against your sandbox; (5) **registrar staff trained on the worklist fallback**. Until all five are true, you run manual registrar-worklist mode — full counselor value, human last mile, no automated writes.
*If pushed:* we made write-back fail-closed on purpose — it stays gated behind explicit flags so nobody can accidentally enable production writes before these gates clear.

**Q: During the pilot, what's the rollback plan if the engine produces decisions we don't trust?**
Low-risk because the engine **never writes silently**. In pilot you run `manual_ui_export`, so the engine only proposes — a counselor approves and a registrar applies in IC, meaning "rolling back" is just not acting on a recommendation; nothing was auto-written to undo. Every decision/override is in the **immutable audit trail**, so you can review where engine and counselors diverged. Distrust a rule? An admin edits the rubric in-app and prior snapshotted decisions are untouched. The nuclear option is staying in worklist mode entirely.
*If pushed:* there's no risky "undo a bad batch write" scenario in pilot because nothing writes to IC automatically — the human-in-the-loop is the rollback.

**Q: How much of my staff's time will implementation cost — counselor and IT hours, not just yours?**
Honest estimate: **Week 1** needs your IT for the IC OAuth2 sandbox connection (a config task, not custom code) and a counselor/curriculum lead to validate the imported catalog and grad rules. Pilot is one counselor on one grade — deliberately small. The numbers I can't pin without scoping are total IT hours for IC sandbox provisioning and validation hours for catalog accuracy. The design minimizes your lift — no CSV exports to prepare, no bulk migration. *(Founder list: publish a staffing estimate.)*

**Q: Who provisions and owns the IC sandbox and OAuth credentials — and what if IC's side is the bottleneck?**
**Your district (or your IC admin / Infinite Campus support)** provisions the OneRoster OAuth2 sandbox endpoint and issues credentials; we store them server-side only in **Deno Vault**, never in the browser. Honest dependency risk: if IC provisioning lags, the OneRoster pull stays at its 503 and we **run the manual worklist path** meanwhile — so an IC-side delay slows automation but doesn't block the pilot's counselor value. We flag the IC-credential request as a critical-path item at kickoff.
*If pushed:* we can't move faster than IC issues your sandbox credentials — that's the one external dependency we don't control, which is why the manual path keeps the pilot moving.

**Q: How do you handle support tickets and bug reports — and how do I know my issue isn't lost?**
Honest: a **formal ticketing platform with SLAs isn't stood up yet** — intake today is a direct channel to a named contact, which means fast senior attention for founding partners. Before district-wide go-live we'd commit to a **tracked intake** (ticketing or shared board), severity tagging, and status visibility. The product mitigates lost work on the data side — the push-state machine routes failures to a retryable queue rather than dropping them. *(Founder list: adopt a real ticketing tool before scale.)*

**Q: Change management is my biggest risk — counselors are attached to their current process. What in the product reduces friction?**
Several design choices: the **counselor stays decision-maker** (engine proposes, counselor disposes) — augment not replace; the cockpit **auto-advances** to keep flow; every recommendation shows **transparent pass/fail reasoning** so counselors trust the why, not a black box; and the **Form Builder** lets them shape their own waiver types without code. Pair it with train-the-trainer using respected lead counselors as champions and the pilot's hours-saved metric to win skeptics.
*If pushed:* the fastest adoption lever is the pilot counselor's own time-saved number — once one counselor reclaims hours during peak, peer pressure does the rollout.

**Q: If we hit a hard limit during go-live — the engine can't decide a complex case — what's the fallback so a student isn't stuck?**
Built into the rule logic, not a failure mode: **missing documents force a "review" status** rather than auto-deny, and hard-fail gates surface a clear, reasoned deny a counselor can override with a logged note. A row missing an IC sourcedId is **refused and routed to the manual worklist** rather than guessed. The human always has the final logged call — no student is stuck in an automated dead-end; worst case a case lands in a counselor's queue exactly as without the tool.
*If pushed:* the engine degrades to "send it to a human" — never to a wrong silent decision — the safe failure mode for anything touching a diploma.

**Q: Do you support a staged data refresh — when IC enrollments change mid-season, does our config drift, and who reconciles it?**
Reconciliation is **automatic at the moment it matters**: we re-read fresh IC enrollment state at push time to detect drift, the queue auto-processes on a configurable cadence with a Force Sync Now button, and **IC stays authoritative** (section Max Students wins over our soft holds). Your catalog/rules config is separate from enrollment data and only changes when an admin edits it, with version snapshots protecting in-flight requests. No manual reconciliation chore lands on your staff for enrollment drift.
*If pushed:* we don't fight IC for authority — re-validating against a live IC pull at push time catches drift instead of overwriting your system of record.

**Q: What's your communication plan during implementation — kickoff, status cadence, point of contact week to week?**
Honest: a packaged implementation-comms playbook (kickoff deck, weekly status template, RACI) **isn't a formalized program yet** — you'd work directly with a named contact, likely a founder, which means high-touch. We'd commit to a **kickoff** locking the catalog/rules import and IC-credential request as critical path, a regular check-in cadence through the Week-1-to-rollout window, and a single named point of contact with a defined backup. *(Founder list: implementation-comms cadence + written project plan with milestones.)*

**Q: Can different high schools have different rubrics and forms, or is it one config for all 8 — and who manages per-school differences?**
Honest: **per-school data isolation via school-partitioned RLS isn't implemented yet** — today all counselors in a tenant see all requests, and that's a tracked roadmap item to harden before a 54k rollout. So distinct per-school rubrics/forms **with enforced data separation** is roadmap, not current. What works today is a shared config managed by your admins via Form Builder and rubric logic. For a 1-2 school pilot this is fine; full 8-school production needs that hardening as a pre-go-live gate. *(Founder list: per-school RLS date.)*
*If pushed:* I won't claim per-school RLS isolation exists — it's the explicit hardening step before district-wide rollout.

**Q: Who is accountable if the registrar applies a wrong change from your worklist — where does your responsibility end and ours begin?**
In manual worklist mode the boundary is clear: we generate a **reasoned, re-validated recommendation** carrying only operational enrollment keys (no grades, no demographics), **idempotent** so a retry can't double-enroll; your **registrar reviews and applies it in IC**, and IC's authoritative checks (Max Students) still gate it. So the human registrar is the applying authority by design. The audit trail logs who decided and who applied. *(Founder list: liability allocation in the DPA.)*
*If pushed:* operationally the registrar is the applying authority, but the exact indemnification language needs founder + legal sign-off.

**Q: How do you keep catalog and rules in sync year over year as new course codes and graduation rules roll out — a yearly migration project?**
A **routine admin update, not a migration project**. New course codes flow in via the **OneRoster pull** (IC stays the source of catalog truth), and graduation-rule changes are edited in-app via the rubric/Form Builder — no code. Version snapshots mean a mid-year change applies forward without rewriting prior cohorts. We help configure complex new-cohort rule sets and stay available, but you're not signing up for annual re-onboarding. The honest dependency: keep the IC catalog current on your side, since we reconcile to it.
*If pushed:* because the rules are inspectable in-app, your curriculum team owns year-over-year updates directly — no vendor ticket queue gating your scheduling season.

---

### Competitive Landscape

**Q: We already own IC Campus Workflow and the Scheduling Center. What can you do that those literally cannot — not "do better," cannot do at all?**
IC's **Scheduling Center** builds master schedules; **Campus Workflow** routes approvals and forms. Neither **enforces prerequisite/graduation-rule logic against your catalog at the point of a counselor's waiver decision**, neither surfaces **per-rule pass/fail reasoning with a confidence score**, and neither manages **soft seat-holds + a "notify when a spot opens" waitlist** tied to the swap. We sit on the judgment layer between request and enrollment, then write the approved result back to IC over OneRoster.
*If pushed:* if your IC license includes Workflow, the question isn't capability parity — it's whether your counselors actually use it for rule-enforced waiver review today. In every district we've talked to, that workflow is still manual.

**Q: Campus Workflow has a real form-and-approval engine with role routing. Isn't your form builder just a thinner version of what we've paid for?**
The form builder alone overlaps with Workflow. The defensible difference is the **rubric/decision-logic engine bound to each form** — eligibility checks (seat, GPA, prereq, conflict) evaluated automatically with pass/fail shown in the cockpit, plus **form-version snapshotting** so rule changes never rewrite history. Workflow routes a human to approve; it doesn't compute "eligible/ineligible" against your catalog and live enrollment.
*If pushed:* ask your counselors how long a waiver review takes inside Workflow — if it's 2-3 minutes of manual transcript-checking, that's the time we compress to 10-15 seconds.

**Q: SchooLinks and Naviance already do course planning and graduation tracking, and they're entrenched in Georgia. How are you not a worse-funded overlap?**
Different job. **SchooLinks/Naviance/Xello** are student-facing College & Career Readiness and multi-year planning platforms — they help a student build a 4-year plan. We're a **counselor-side operational tool** for the in-cycle waiver/course-request decision: read the transcript, enforce the rule, approve, push the change back to IC. We don't do CCR plans, college matching, or career inventories. We sit downstream — the plan says "student wants AP Bio," we adjudicate eligibility and seat them.
*If pushed:* SchooLinks tells a student what they could take; it doesn't write the approved enrollment change back into IC with an audit trail. The last mile to the SIS is ours.

**Q: SchooLinks/Naviance already do eligibility-ish checks in their planners. Why is your rule engine meaningfully different?**
Theirs is requirement-tracking oriented to long-range credit accumulation for a planning view; ours is a **deterministic gate at the decision moment** that hard-fails on no-seat/time-conflict/unmet-prerequisite and outputs an **auditable per-check record** a counselor signs. The differentiator is **defensibility for an appeal** — same transcript, same rubric, same decision, with a signed contribution per check. Honestly, requirement-checking is commoditizing; the moat is binding it to live seat availability + IC write-back + the immutable decision log.
*If pushed:* the honest version — requirement-checking is commoditizing; we're betting the defensible piece is the auditable counselor-decision-to-IC pipeline, not the rule math alone.

**Q: Where do you land relative to Edficiency (flex scheduling) and Abre (workflow + analytics)?**
Minimal overlap. **Edficiency** optimizes flex-block/advisory/WIN-time scheduling — a different problem. **Abre** is a broader student-data/workflow/analytics platform; closest adjacency is its workflow module, but it isn't enforcing prerequisite logic against a catalog and pushing enrollment deltas to IC over OneRoster. We're narrower and deeper on one workflow than either.
*If pushed:* Edficiency solves "who goes to which flex block today." We solve "is this course-change request valid and how does it land in IC." Adjacent, not competing.

**Q: PowerSchool cross-sells the whole suite hard. If we're a PowerSchool shop, why bolt on a single-purpose startup?**
Two honest realities: our SIS integration is **built specifically to Infinite Campus over OneRoster** — for a PowerSchool-SIS district we'd be integrating to a different SIS, scoping work we haven't proven, so **IC is our native lane**. And a suite module is rarely best-in-class at the niche workflow; we're focused and not asking you to re-platform. For Forsyth specifically you're an IC district, so the PowerSchool-bundle pressure is lower.
*If pushed:* if you're an IC district, the PowerSchool bundle question is mostly hypothetical pressure from their sales team — we're built for your SIS.

**Q: Honestly, where is a competitor genuinely better than you right now?**
Three places, candidly: **references/proof at scale** (IC, PowerSchool, SchooLinks have hundreds of live districts; we have zero live Georgia reference — they win on de-risk); **compliance maturity** (they hold SOC 2 Type II, pen tests, VPATs; ours are roadmap); and **breadth** (if your need is multi-year planning, CCR, or master-schedule building, a suite covers ground we deliberately don't). Where we win: the narrow waiver/course-request decision workflow, explainability for appeals, OneRoster-native portability, focus, and price.
*If pushed:* the maturity gaps are time-and-money fixable with a committed timeline; the depth advantage on this workflow is structural to a focused product.

**Q: What's actually defensible? A rules engine + a OneRoster connector is a few months of work for a funded competitor.**
Honest: it's **not the rule engine or connector in isolation** — both replicable. Defensibility is the **integrated chain + accumulated district-specific rule encoding**: the deterministic engine, the form-version-snapshotted audit trail built for appeal boards, the gated push-state machine with idempotent OneRoster deltas, and FERPA field-minimization by construction — assembled as the whole product. The durable moat is the encoded local rule sets and the audit/appeals workflow that becomes the district's institutional memory.
*If pushed:* anyone can build the demo in a quarter; building it as the audited, appeal-defensible decision system your counselors trust takes the district relationship — that's the moat that compounds.

**Q: IC's modules have native database access; SchooLinks has a deep IC partnership. Going through OneRoster from outside — doesn't that make you the shallowest integration in the room?**
On raw access, yes — IC's own modules have native DB access we'll never match, by design: we're a **standards-based external app**, not living inside the SIS. But "shallow" cuts both ways — OneRoster v1.1/1.2 means we **read only what the standard exposes, write only operational enrollment keys, and never touch your database directly**, the safer/more portable/more auditable posture for a third party. We re-validate against a live IC pull at push time, so we reconcile to the source of truth.
*If pushed:* you don't actually want a startup with native write access to your SIS database — standards-based-and-gated is the integration depth you should want from a third party.

**Q: Give me the real total-cost-of-ownership versus alternatives — including an IC-module add-on or a SchooLinks seat.**
The structure: an **annual per-school subscription**, Year 1 (license + implementation + training) quoted separately from renewal. TCO advantage vs a suite: no re-platforming, fast OneRoster-native onboarding, no paying for breadth you won't use. TCO honesty: against an IC module you already own, our marginal cost is **net-new spend you justify on time-saved** — so we lead with measurable counselor-hours and decision-time metrics. *(Founder list: actual per-school number + ROI math.)*
*If pushed:* cheaper than a suite, net-new vs IC-included Workflow, justified on labor savings and appeal-risk reduction.

**Q: What are the real switching costs in — and how locked in are we once your audit log becomes our institutional memory?**
Switching **in** is deliberately low: OneRoster-native rostering (configuration not migration), auth on your existing Google Workspace, start with one counselor at one school. Switching **out** is also low: OneRoster-shape export (no proprietary format), `purge-student` deletion, deletion certification. The honest tension you raised: the **decision audit trail does become sticky institutional memory** — a real soft lock-in — but we earn that through value, not format lock-in, and commit contractually to OneRoster export + source-code escrow.
*If pushed:* the honest lock-in is your counselors not wanting to give up the time savings — which is the lock-in you actually want from a tool.

**Q: Make the affirmative case for an early-stage vendor over the safe incumbent.**
Three things a suite can't offer: **roadmap influence** (you shape features and rule sets to Forsyth's actual policies instead of waiting in a 10,000-district queue); **responsiveness** (a bug or a new waiver type is days, not a release cycle); and **price + focus** (a single-purpose tool tuned to your workflow). The counterweight is risk — fewer references, roadmap compliance items — which is why we de-risk with a metrics-driven, clean-exit pilot.
*If pushed:* every entrenched vendor you have was once someone's first risky pilot — the pilot caps your downside while preserving the upside of a partner who answers your calls.

**Q: If you nail this niche, what stops IC or PowerSchool from building it into their next release and bundling it free?**
Honest: nothing stops them trying — platform absorption is a real risk for any point solution. Our defense is threefold: **speed and focus** (we ship this workflow far faster than a suite reprioritizes, and incumbents historically under-invest in the unglamorous counselor-decision niche); **standards posture** (OneRoster-native, not betting on one platform's goodwill); and the **audit/appeals workflow + encoded local rules** becoming sticky institutional memory even if IC ships a "good enough" version.
*If pushed:* IC has had a decade to build rule-enforced waiver review and hasn't — incumbents bundle what's easy and ignore the workflow that needs district-specific judgment encoded.

**Q: How much could our own IT team build with Power Automate, the IC API, and a couple of devs? Why buy vs build?**
Candidly, a determined team could build a first version — a form, a rule script, a OneRoster pull. What they underestimate is the **long tail**: the gated push-state machine with idempotent retries and partial-failure handling, FERPA field-minimization with a tripwire, form-version snapshotting for appeal-proof audit, seat-hold concurrency under advisory locks, and **ongoing maintenance as IC and OneRoster versions change**. Build looks cheap until you price the maintenance and the appeal-defensibility you can't afford to get wrong.
*If pushed:* the build estimate is always the happy path — price the FERPA tripwire, the appeals audit trail, and three years of IC API churn, plus a one-bus-factor developer; that's a product, not a project.

**Q: Brutally honest — what's the strongest reason to do nothing and keep our spreadsheets and email approvals?**
The strongest case: spreadsheets are free, counselors already know them, no procurement, no DPA cycle, no security review, no startup risk — and the pain is survivable because it always has been. A legitimate position. The counter: the status quo has **hidden costs** — counselor hours lost every fall, inconsistent decisions creating appeal exposure, no audit trail when a family challenges a denial, and missed prerequisites that can threaten an on-time diploma. We don't beat "free" on price; we beat it on **risk and labor**.
*If pushed:* spreadsheets have no audit trail — the first time a parent appeals a denied waiver and you can't show consistent documented reasoning, "free" gets expensive fast.

**Q: How do you compare on the buying experience and risk profile — a known approved vendor vs vetting you from scratch?**
Honest disadvantage: an incumbent is likely already on your approved-vendor list with a signed DPA, SOC 2, and VPAT on file — we're net-new procurement friction. Mitigation: remove as much friction up front — **sign your DPA before any pilot**, bring the NDPA v2 + Georgia addendum ready, hand over our **data-element inventory** (the field allowlist), and commit to a written remediation timeline for SOC 2 and pen test. We can't make ourselves pre-approved, but we make vetting fast and the pilot scope small enough to cap downside.
*If pushed:* the procurement friction is one-time; the workflow value is recurring — and the small pilot scope means your security committee approves a one-school trial, not a district-wide commitment.

**Q: SchooLinks/Naviance get pushed through the GaDOE/RESA ecosystem and have Georgia momentum. How do you compete with that pull with zero Georgia footprint?**
I won't pretend that momentum isn't real — distribution through GaDOE/RESA and existing adoption is trust we earn one district at a time. Our entry is different: we're **not competing for the CCR/planning mandate** those tools fill, so we're not fighting their channel head-on; we enter through an **unserved operational pain** (counselor waiver/course-request decisioning) where there's no incumbent owning the niche. And we lean on Forsyth's own **1EdTech/OneRoster DNA** — a standards-native tool built to the standard this district helped champion.
*If pushed:* we don't need their channel because we're not selling their product — we're filling a gap their planning tools leave open: the in-cycle decision, not the four-year plan.

**Q: If counselors already live in IC and SchooLinks all day, aren't you just a third system and a third login?**
Fair concern. Two mitigations: **login** — we ride your existing **Google Workspace OAuth** (no new password), and Clever/ClassLink/SAML are roadmap so it folds into your SSO; and the **workflow we own isn't living cleanly in IC or SchooLinks today** — counselors do waiver review in spreadsheets, email, and manual transcript-checking, so we're **consolidating a scattered manual process into one screen**, not adding a fourth place to do the same thing.
*If pushed:* count the tools your counselors actually use for waiver review today — a spreadsheet, email, the transcript PDF, IC — we collapse those four into one, even if it's technically a new tab.

**Q: Which competitor is most dangerous to you — who should we run a bake-off against, and how should it be scored?**
The most dangerous comparison isn't SchooLinks or PowerSchool — it's **IC Campus Workflow plus a sharp internal build** ("we already pay for it" + "we could DIY the rest"). That's the bake-off I'd want, scored on the workflow that matters: **time to adjudicate a real waiver** with prerequisite and seat checks, **defensibility of the audit trail** for a mock appeal, and **effort to push the approved change into IC** and reconcile it. I'd lose a breadth bake-off against a suite and say so; I'd win a depth-on-this-workflow bake-off against IC-Workflow-plus-DIY.
*If pushed:* don't let us pick the test — bring your hardest real waiver case, run it through IC Workflow, a spreadsheet, and us, and time it plus check the audit trail.

**Q: Naviance/SchooLinks tie planning to college/career outcomes the board loves. You don't touch outcomes — doesn't that make you a back-office cost center easy to cut?**
Honest framing: yes, we're an **operational efficiency and risk-reduction tool**, not a student-outcomes/CCR showcase, and in a budget crunch outcome-facing tools tell a better board story. Our counter: we **protect outcomes from the back** — a missed prerequisite or graduation error directly threatens an on-time diploma, and an unauditable denied waiver is direct appeal/equity-exposure risk. We frame ROI in defensible numbers (counselor hours reclaimed, decision-time cut, appeal-defensibility), not vanity metrics.
*If pushed:* outcome platforms are the first thing cut when they can't prove causation — we prove a hard number (hours and appeal risk) that survives a budget review better than aspirational dashboards.

**Q: We're an IC district, but consolidation could push us toward a single-vendor stack. If we standardize on PowerSchool, do we just rip you out? How portable across SIS platforms?**
Honest today: our integration is built and proven specifically for **IC over OneRoster**, so a move to a different SIS would require validating against that SIS's OneRoster implementation — **configuration in principle but unproven in practice** (I won't claim plug-and-play). The mitigating design: we built to the **OneRoster standard**, not IC internals, so portability is real (most SISs including PowerSchool expose OneRoster). A SIS migration means a **re-validation cycle, not a rip-and-replace**, and your data leaves in OneRoster shape regardless.
*If pushed:* we bet on the standard, not the vendor — if you switch SISs we re-validate against the new one's OneRoster, far cheaper than the suite migration you'd be doing anyway.

**Q: Your pitch leans on Forsyth's 1EdTech leadership. Isn't that a double-edged sword — this district will scrutinize your OneRoster conformance harder than anyone? Have you certified it?**
Exactly the right scrutiny, and I'll be straight: we built deliberately to **OneRoster v1.1/1.2** — read endpoints for students/classes/enrollments, an enrollment-change delta on write — mapping IC `sourcedId` to local IDs and refusing rows missing a sourcedId. What we have **not** done is complete **formal 1EdTech OneRoster conformance certification**; it's a procurement-cycle item we'd prioritize given this district's role. Standards-built and tested against a simulated IC today, formal certification on the roadmap. *(Founder list: treat certification as a pilot milestone.)*
*If pushed:* we'd treat 1EdTech conformance certification as a pilot milestone — doing it for this district is a credential we'd want anyway. Hold us to it in the contract.

**Q: Honest read on time-to-value versus a competitor we could turn on next week?**
Honest: an incumbent with a **pre-built, pre-certified IC connector and an existing DPA** can be live faster on paper — they've cleared the integration and procurement hurdles we'd clear for the first time. Our time-to-value is **staged**: a counselor can be onboarded and piloting within about a week on the **manual-worklist path** (rostering is OneRoster-native), but full automated IC write-back follows security review and sandbox validation. The trade: a suite is faster to "on," we're faster to "tuned to your exact workflow."
*If pushed:* faster-to-on isn't faster-to-useful — a suite turns on broad and shallow; we turn on narrow and exactly fit to how your counselors decide.

**Q: If we pilot and you miss the metrics, what's the cleanup cost versus never starting? With an incumbent a failed module is just a turned-off feature.**
Fair — we engineer the exit to be **as light as a toggle**: pilot scoped to one or two schools, success metrics agreed up front, OneRoster-standard export, `purge-student` deletion with written certification, no proprietary format to unwind. Because **IC remains your authoritative system of record** throughout (we reconcile, never override), turning us off doesn't corrupt anything upstream. The honest residual cost is the **counselor training hours**, which is why we keep the pilot to one counselor at a time.
*If pushed:* your SIS is never not authoritative, so switching us off leaves IC exactly as it was — the only sunk cost is training hours, capped by keeping the pilot to one school.

**Q: Every edtech vendor says "we complement IC." How is yours different, and won't tool consolidation eventually cut you?**
Honest: "complement IC" is the most overused line in this market — fair to be skeptical. What makes ours non-hand-wavy is **specificity**: we name the exact seam — the counselor waiver/course-request decision with rule enforcement and the approved-change write-back over OneRoster — a seam IC's scheduler and Workflow demonstrably leave manual. Most "complement" tools are CCR/comms/analytics layers that don't touch enrollment writes; we do one operational thing IC doesn't. On consolidation: yes, a single-purpose vendor is prunable; our defense is being the **deepest tool on a high-pain workflow** with sticky audit memory, not a nice-to-have.
*If pushed:* ask the other "complement IC" tools if they write approved enrollment changes back to IC over OneRoster with an appeal-grade audit trail — most don't touch the SIS at all; that's the seam we own.

---

### Edge Cases & Failure Modes

**Q: Two counselors hit "Admit" for the same student in the last available seat at exactly the same time?**
**`pg_advisory_xact_lock`** on a per-(course,period) basis serializes concurrent claims — the lock forces a serial queue, the second execution finds zero seats and gets `claimed: false, seats_left: 0`, and the student gets an immediate "no seats available" message with a waitlist option. Atomic by construction — no race condition possible.

**Q: A student's transcript is handwritten or in a non-standard format?**
**Graceful degradation.** If parsing fails, the upload fails with a clear error ("Transcript could not be parsed") and the student re-uploads or contacts their counselor — who can manually enter the course data. No silent corruption — parsing failures are always surfaced.
*If pushed:* actual parse accuracy is something a live pilot would confirm against your real transcripts (current build is Supabase uploads; visible parsing logic is limited).

**Q: A student is "William Johnson" in IC but submitted as "Bill Johnson" — what happens on pull and push?**
We map by **email (preferred) or OneRoster `sis_id`, not name-fuzzy-matching** — so a matching email correctly identifies the same student and the push uses the authoritative `sourcedId`. If both are missing and we can't map the student, the push fails with "unmapped IC keys — route to manual_ui_export" and the registrar handles it. Name variations never cause silent double-enrollment.

**Q: Mid-year, a student transfers schools with an approved waiver pending push. What happens?**
The **re-validation step before every push** checks `enrollment_status` and `school_sourced_id` against a fresh OneRoster pull. If the school changed, the fresh pull reflects it; if prerequisite or seat logic now changes, the record is marked **`superseded`** with the new decision and the counselor is notified. The approval never silently applies to the wrong school.
*If pushed:* re-validation is currently conservative (enrollment-active + GPA-floor); a full rubric re-run is a tracked follow-up requiring the rubric engine to be Deno-compatible.

**Q: A course exists in IC but not in our catalog (or vice versa)?**
**IC→catalog:** a course in IC but missing from our catalog snapshot is stored as-is in `current_schedule`; prerequisites still validate if recognized, otherwise the check is marked "unmapped" and the confidence reflects that. **Catalog→IC:** if a counselor approves a placement to a course not in IC at push time, re-validation fails (null `classSourcedId`) and the row routes to `manual_ui_export` for a registrar to confirm the mapping.

**Q: IC changes their OneRoster schema (v1.1 → v1.2) mid-semester. What's the blast radius?**
The version is **configurable via `IC_ONEROSTER_VERSION`** (defaults 1.1). A breaking change means updating the mapping logic in `assembleStudent()` and re-deploying the `oneroster-pull` edge function (~5 min). Reads/writes stay `queued` until the pull succeeds; the registrar sees "OneRoster fetch failed" and the queue auto-resumes after redeploy. **A deployment issue, not data loss.**

**Q: A network drop happens mid-push — 50 rows in flight when the connection dies. What state are they in?**
Atomic per-record, not all-or-nothing per batch. A failure before `claimed_at` leaves rows **`queued`** (re-leased next run); a failure after export but before IC confirmation leaves rows **`exported`**, and a recovery mechanism **reclaims stale `claimed` locks older than 15 min** and re-queues them. `last_error` logs the reason. No rows stuck permanently; "Force Sync Now" retries immediately.

**Q: Two counselors decide the same student at the same time — one admits, one denies. What wins?**
The second decision **overwrites the first** (the request's decision state isn't locked during a single review) — a UX gap where two counselors can step on each other. However, the audit log captures **both** decisions with timestamps and actors, so the collision is visible. The fix (an **optimistic-lock token/etag** warning the second counselor) is a tracked enhancement. *(Founder list: is concurrent multi-counselor review of one request a real Forsyth workflow, or is each student assigned one counselor per term?)*

**Q: A student is enrolled (incorrectly) in two schools in OneRoster — what happens on pull?**
We map by email/sis_id to a single profile UUID, so a duplicate **upserts and overwrites**, leaving the most recently synced record. This is an **IC data-quality issue, not ours**; the audit log records both pulls and a registrar should fix the duplicate in IC. *(Founder list: add a UI warning if a sis_id appears in multiple schools in one pull?)*

**Q: A registrar approves a push, then realizes it was the wrong batch. Can we roll back?**
Once a record is **`confirmed`** it's terminal — we don't reverse an IC enrollment change from our side (IC is the source of truth). If still in `exported`/`imported` (not yet IC-confirmed), a service-role update can move `push_state` back to `queued`. For a fully confirmed batch, the registrar corrects the enrollment in IC directly. A "recall" UI for exported-but-not-confirmed rows is a gap (currently a support escalation). *(Founder list: add a "Recall Batch" button?)*

**Q: A student's GPA drops below the waiver threshold between approval and push (6 hours later)?**
The **re-validation step reads the fresh OneRoster record** and compares `roster.gpa` against the original rubric's `minGpa`. If GPA is now below threshold, revalidation returns `decision: 'review'`, the record is **`superseded`** ("GPA now below required X.XX"), the counselor is notified, and it is not pushed.

**Q: During a batch push, 3 of 50 rows fail (IC rejects them). Do the other 47 still push?**
Yes. Records process **individually** — a per-record failure marks that row `failed` but doesn't block the rest. Transient failures retry up to 5 times; permanent ones (unmapped keys, IC rejection) become dead-letter. The run summary shows "confirmed: 47, failed: 3." A **threshold-pause** mechanism pauses the whole batch if failures exceed a configured percentage, preventing a systemic issue from spreading bad data.

**Q: A district has 5,000 students — does the pull retrieve all of them or just the first page?**
Honest, discovered gap: the current pull uses `?limit=100` and fetches a **single page** — pagination isn't yet implemented, so only the first 100 are cached. **Before district-wide rollout the pull must support OneRoster pagination** (offset/cursor). A tracked bug for the pilot. *(Founder list: pagination is a pre-go-live requirement.)*

**Q: A prohibited field (SSN, race, gender) appears in the OneRoster response — what stops it being stored?**
The **`findProhibitedFields()` tripwire** runs on the RAW IC response before normalization, checking for keys like birthDate/sex/race/agents/address. If any are found, the **entire student is SKIPPED** and logged as `skippedProhibited` — no part of that record reaches the database. The single most important FERPA control.

**Q: A counselor's review session times out — they hit "Admit" with a stale token?**
The insert call fails with **401** because RLS checks `private.is_counselor()` against the JWT. The decision is **not enqueued**; the UI shows "Session expired" and redirects to login. After re-auth, the counselor re-submits. No partial decisions saved.

**Q: The IC SFTP server is misconfigured and rejects all uploads — how long until we know?**
The SFTP timeout inherits the Deno default (~30s). A failed upload marks the batch **`failed` ("delivery failed," retryable)**; the registrar sees it in the activity log and the batch sits `exported`. Honest gap: **no automatic alerting** — the registrar must check the dashboard. *(Founder list: add automatic email alert on batch delivery failure?)*

**Q: A counselor's authorization is revoked (admin → student), then they click "Force Sync Now"?**
The `sync-to-infinite-campus` edge function **re-checks the role at invocation** — a revoked role returns **403** and the sync doesn't run. Rows enqueued before revocation remain `queued` and can be pushed by another authorized user. Correct: losing a role doesn't delete in-flight decisions, it just prevents new ones.

**Q: Two IC instances (test/prod) and the base URL is pointed at the wrong one during a pilot — enrollments push to the wrong district. How is this detected and fixed?**
**No automatic detection** — wrong credentials silently succeed against that instance, and the audit log shows the push without verifying the sourcedIds match the expected school. A critical config risk. Mitigations: a **signed configuration attestation before go-live**, a "verify connection" setup test, and logging the base-URL origin in the audit trail. *(Founder list: mandatory IC environment verification before enabling push.)*

**Q: A seat is oversold — IC capacity 30, we promised 31 on soft holds, the 31st reaches IC and is rejected?**
Our soft holds are **app-layer only; IC's Max Students is ground truth.** Re-validation currently checks enrollment-active + GPA, **not seats**, so a 31st approval can reach `exported` and IC rejects it on import (class-full); the row fails and is retried or handled manually. Honest gap: **re-validation should include a live IC seat check.** *(Founder list: add seat re-check to revalidation.)*

**Q: A form builder raises the GPA floor from 2.0 to 2.5 mid-semester — does it affect pending approvals?**
**No.** The **`form_schema_snapshot`** freezes the form state at submission. A request submitted under the old form (2.0) shows the old criteria; a new request after the change shows 2.5. At push, re-validation compares the **original frozen rubric** against the fresh pull, preventing retroactive disqualification of already-approved students.

**Q: A student-uploaded transcript contains PII beyond what the rubric needs (guardians, medical notes) — where does it go?**
Uploaded transcripts are stored in the `requests.documents` array (JSONB) and are **NOT filtered by the field allowlist** (which only applies to the IC pull). PDFs are stored in Supabase Storage with `authenticated` access (counselors/admins only). A **privacy gap**: uploaded documents need their own minimization policy — recommend server-side PII redaction before storage or UI restriction to course/transcript data. *(Founder list: intake-side minimization — overlaps with Privacy section.)*

**Q: Time zones — a 5 PM ET deadline; a PST student submits at 2 PM PST (same moment). Accepted?**
Yes — Postgres **`timestamptz`** captures UTC on submit and the deadline is also `timestamptz`, so the comparison is correct regardless of client timezone or DST. The backend is sound; the UI must display deadlines consistently in local time.

**Q: A OneRoster pull succeeds but `last_sync` is stale (cached for hours) — how do we know?**
Each `one_roster` row has a **`last_sync` timestamp**; a stale snapshot should reduce confidence. Honest gap: **no automatic warning** if data is older than ~1 hour. Recommended safeguard: warn in the cockpit ("Enrollment data is 2 hours old; refresh now?") if `now() - last_sync` exceeds a threshold. *(Founder list: enforce a max-staleness threshold.)*

**Q: The audit log grows unbounded (millions/year) — how are old audits purged?**
The `audit_log` table has **no TTL/retention policy yet** — a gap; without a purge strategy it grows indefinitely and slows queries. Recommended: a scheduled job deleting logs older than **7 years** (Georgia recordkeeping) or a `deleted_at` soft-delete for FERPA archival. Not urgent for the pilot; critical for 54k-student production. *(Founder list: retention policy.)*

**Q: A registrar exports the worklist, applies changes in IC manually, but forgets to mark the row confirmed — does it get re-pushed and double-enroll?**
The `idempotency_key` is the queue row's UUID (when IC keys are unknown), so a re-submission creates a **new** queue row with a different UUID — treated as distinct. The `unique(user_sourced_id_class_sourced_id)` constraint only fires when **both** IC keys are known, which they often aren't in the manual-export path. A gap: in `manual_ui_export` an approval can be double-submitted if not manually confirmed. Fix: require the registrar to explicitly mark each item "applied in IC" before releasing the hold. *(Founder list: link each approval to an IC confirmation before auto-releasing the hold.)*

**Q: A request is "Admitted" but the counselor flips to "Deny" before the batch push runs — what state results?**
The `requests.decision` updates to 'deny' (no optimistic lock prevents overwrite), but if an approval was already enqueued in `batch_sync_queue` (`queued`), it's **still in that queue** and the next push attempts a now-stale decision. A gap: overriding a decision should also release/supersede the queued row. Recommended: a trigger on `requests.decision` to update queued rows when the decision flips. *(Founder list: cancel/supersede queued batches on decision reversal.)*

**Q: A student deletes their account — what happens to their pending approval and audit trail?**
`profiles` cascades delete to `one_roster`, `requests`, and `seat_holds`; `batch_sync_queue.student_id` is `on delete set null` (queued enrollments stay but lose the reference); the **audit log's student column is nullable, so old entries remain (immutable)**. The **`purge-student`** function explicitly deletes a student's records for right-to-be-forgotten. Correct: audit is immutable by design, transient state (queues, holds) is cleaned up.

**Q: Supabase is down for an hour — when it comes back, are there stuck/stale records?**
The app is **stateless** (no in-memory caches between requests), so it's immediately available again — Postgres crash recovery rolls back any in-flight transactions, so **no stuck transactions or orphaned locks**. The only recovery needed is reclaiming `claimed` rows older than 15 min on the next sync run. No data loss (all committed data persists). Resilient by design.

**Q: IC changes a field name (e.g., `users.sourcedId` → `users.externalSourcedId`) and a pull 500s — how is that surfaced?**
`resolveProfileId()` looks for `s.sourcedId`; if absent it **falls back to email matching**, and if that also fails the student is logged with "no matching profile." The pull completes with an error summary the registrar sees in the dashboard. **No auto-retry** — a manual pull with updated logic is required. No silent corruption.
