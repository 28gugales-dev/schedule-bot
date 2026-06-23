# Schedule AI — Cinematic Live Pitch Slideshow — Design Spec

**Date:** 2026-06-22
**Status:** Design — awaiting user review
**Owner:** Soham

---

## 1. Goal

Produce a premium, **cinematic live presentation slideshow** for **Schedule AI** (the `schedule-bot`
product) aimed at **school / district sales** — counselors, administrators, and ed-tech buyers. It must
feel high-production (3D moments, animated smooth gradients, silent cinematic b-roll) and include a
**real product demo** of the live application.

Primary outcome: **the presenter advances slides and talks over them live.** No AI voiceover, no AI
avatar narrator — the human is the narrator. (Optional, later: export a silent/looping version as a
website asset — not part of this build.)

## 2. Audience & positioning

- **Who:** School counselors (end users), counseling directors / administrators (economic buyers),
  district procurement (compliance/security gatekeepers).
- **What they care about (drives the narrative):** time saved per student, error reduction,
  graduation-requirement compliance, audit defensibility, data security, onboarding effort, price/ROI.
- **What matters less than an investor deck:** TAM/market-size math, cap table, fundraise "ask."
  The structure is a **product-led sales story**, not a fundraise deck.

## 3. Delivery model — live cinematic web deck (presenter talks over it)

**Single output: a live, full-screen, keyboard-driven slideshow** the presenter narrates in person.

- React 19 + Vite + Tailwind v4 (matches the product repo's stack) + **GSAP** for slide transitions +
  **react-three-fiber** for 3D moments + animated **shader/mesh gradients** for backgrounds.
- Full-screen presenter mode: arrow/space to advance, per-slide **speaker notes** (talking points the
  presenter speaks to), optional progress/section indicator.
- Embedded **silent** product-demo screen recording (autoplay/loop on its slide) — presenter talks over it.
- Optional **silent** cinematic b-roll loops as section backgrounds (the "heavy visuals").

**Remotion / rendered MP4 is out of scope for this build** (it only mattered for a narrated sizzle video).
It can be added later if a standalone website video is ever wanted.

### Architecture note
The deck lives in a **separate workspace** (e.g. `deck/` folder with its own `package.json`, or a sibling
project) so heavy media deps (three.js, shaders) never bloat the shipping product. Real product-demo
footage is captured from the live `schedule-bot` app, not rebuilt.

## 4. Narrative method (the "masterclass")

Anchor (**confirmed: Ankur Warikoo**): his principle — *lead with what you wish to tell the world, not
what it wishes to hear* — inside the classic **problem-led, "show their life with vs. without you"**
sales structure (storytelling-first). Warikoo's tone: direct, founder-to-buyer, no jargon, one honest
idea per slide.

Rules carried from the method:
- Open on the **pain**, not the product.
- One idea per slide; numbers are **animated reveals**, not static text.
- Show the **user's actual workflow** transformed (before → after), not feature lists.
- End on a single, concrete **CTA**.

## 5. Structure — 11 beats

| # | Beat | Content | Media treatment |
|---|------|---------|-----------------|
| 1 | Cold-open pain | Counselor buried in scheduling; hours per student; error-prone | Silent b-roll (overwhelmed → relieved) — Higgsfield (paid) or free stock/shader fallback |
| 2 | The stakes | Wrong courses, missed grad reqs, counselor burnout, audit risk | Kinetic type over animated gradient |
| 3 | Meet Schedule AI | One-line promise | 3D logo reveal (react-three-fiber) + mesh gradient |
| 4 | How it works | Ingest transcripts → AI builds compliant schedule → counselor approves | Animated 3-step flow (GSAP) |
| 5 | Live product demo | **Real screen recording** of the app | Silent captured footage (presenter narrates): upload transcript → parse courses/GPA → swap-eligibility → generate schedule → audit view |
| 6 | Before / After | Hours → minutes; error rate down | Animated stat counters |
| 7 | Built for compliance | **FERPA-aligned** student data, audit trail, waiver types, grad-req checks, RLS-secured (Supabase) | Calm "trust" palette, iconography |
| 8 | Proof / outcomes | Pilot results / testimonial | **Placeholder** (no pilot data yet) |
| 9 | Pricing / ROI | Time saved → $ saved | **Placeholder numbers**, animated |
| 10 | Rollout & security | Onboarding, **FERPA / data-privacy posture**, support | Timeline |
| 11 | CTA | Book a pilot | 3D + gradient close, single button/contact |

> **All media is silent.** The presenter is the narrator. Every slide carries **speaker notes** —
> the talking points the presenter speaks aloud while the slide is up.

## 6. Visual design direction

Driven by **taste-skill** (anti-slop) since no brand was supplied. Target: **premium ed-tech** —
trustworthy + modern, not childish. Likely direction: deep/calm base, one confident accent, generous
whitespace, premium type pairing, animated **shader/mesh gradients**, restrained 3D (logo + 1–2 hero
moments, not gratuitous). Final palette/type chosen during the design-system phase and previewed before build.

## 7. Tooling / repos

**Engine (all free / open-source)**
- React 19 + Vite + Tailwind v4 + **GSAP** — the live web deck + slide transitions
- react-three-fiber + drei (Three.js) — 3D logo / scene moments
- Shader/mesh gradient component — animated smooth gradients
- _(optional, later — NOT this build)_ Remotion — only if a standalone rendered video is ever wanted

**AI media — visual only, no narration**
- Higgsfield (paid) — **silent** cinematic b-roll loops for section backgrounds. Optional; free fallback =
  shader/3D visuals or free stock footage.
- ~~ElevenLabs voiceover~~ — **removed** (presenter narrates live).
- ~~acestep score~~ — background music **off by default** for a talk-over deck; optional only.
- ffmpeg (`ffmpeg` skill) — trim / encode the captured demo footage (free).

**Real product proof (free)**
- playwright-recording / gstack-browse — screen-record the live app (Supabase backend is live)

**Quality**
- taste-skill — visual design guardrails
- gstack-design-review + advisor — visual QA / pressure-test

### Free / open vs. paid (you asked for "free repos" — be explicit)
- **Free / open-source (the whole deck):** React/Vite/Tailwind, GSAP, react-three-fiber + drei,
  shader-gradient libs, ffmpeg, playwright-recording. The slideshow ships at **$0**.
- **Only paid item — and it's optional:** **Higgsfield** silent b-roll loops. Free fallback = animated
  shader/3D backgrounds or free stock footage. Decision deferred to the asset phase (see §9).
- ElevenLabs / acestep: **dropped** (no voiceover; music off by default).

## 8. Production pipeline (phases)

1. **Script lock** — on-screen copy **+ speaker notes** per beat (Warikoo method).
2. **Design system** — taste-skill picks palette, type, gradient + 3D style; preview approved.
3. **Demo capture** — screen-record real app flow; trim/speed/zoom passes (ffmpeg).
4. **Visual assets** — animated shader gradients + 3D scenes; _optional_ silent Higgsfield b-roll
   (or free fallback). No voiceover, no music by default.
5. **Build** — React + Vite + GSAP + react-three-fiber live deck; full-screen presenter mode + speaker notes.
6. **Polish** — transitions, timing, embedded demo loop, keyboard nav.
7. **Review** — gstack-design-review + advisor; iterate.

## 9. Open items / placeholders

- No pilot data, testimonials, school logos, or final pricing → **placeholders**, user fills later.
- No supplied brand → taste-skill chooses; user can override at the design-system gate.
- **Higgsfield silent b-roll (paid) vs. free shader/3D/stock fallback** — decide at the asset phase.
- How many slides need silent b-roll vs. pure shader/3D backgrounds (controls scope of asset gen).

## 10. Success criteria

- The presenter runs the deck full-screen and **talks over it**; speaker notes carry the talking points.
- The product-demo beat shows the **real app** doing real work (transcript → compliant schedule → audit).
- Production quality reads as "premium ed-tech," not "AI slop" (taste-skill + design-review gate passed).
- Ships at **$0** on a free/open-source stack (Higgsfield b-roll is the only optional paid extra).
- Built as its own React workspace; product repo stays unbloated.
