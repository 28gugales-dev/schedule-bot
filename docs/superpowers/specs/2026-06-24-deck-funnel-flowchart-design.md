# Pitch Deck: Funnel-Flowchart + Reorder + Live-App Handoff

**Date:** 2026-06-24
**Area:** `pitch-deck/` (React 19 / Vite 8 / Tailwind v4, runs on :5180)
**Status:** Approved design — pending implementation plan

## Goal

Reshape the live sales deck so that, on a Google Meet with a school, it **explains
the app as a flowchart of the order things happen** and then **hands off to the
real app**. The presenter runs the whole slideshow first, then switches to the live
app at the end. Today the deck demos the app via an embedded iframe in the *middle*
(slide 5); we move that to a clean end-of-deck handoff and add a flowchart slide
that walks the audience through the product flow before they see it live.

## Decisions (locked with the user)

1. **Add a flowchart slide** (`Flow.jsx`) that shows the app's order of operations as
   a horizontal, sequentially-revealed flowchart. Replaces the current `HowItWorks`
   slide in the narrative slot.
2. **Clean diagram first** — icon + label + one line per node. No per-node
   screenshots initially (legibility on a projected Meet screen). Screenshot
   thumbnails are an explicitly-optional follow-up, not part of this scope.
3. **Reorder** so the deck builds toward the app and ends by handing off to it.
4. **Remove the Pricing slide entirely** — not shown in this deck.
5. **Replace the mid-deck live `Demo` iframe** with an end-of-deck **"See it live"**
   handoff CTA slide. The presenter alt-tabs to the real app (5173 / live URL) and
   drives it; no iframe in the deck.
6. **Tone:** `Proof` flips blue → white so `BeforeAfter` is the lone payoff-blue;
   `See it live` is blue. Blue emphasis beats land at slides 2, 5, 9, 10.

## Final slide order (10 slides)

| # | id | Slide | Tone | Change |
|---|----|-------|------|--------|
| 1 | `hook` | Hook — the reality | white | unchanged |
| 2 | `stakes` | Stakes — why it matters | blue | unchanged |
| 3 | `meet` | Meet Schedule AI | white | unchanged |
| 4 | `flow` | **Flow — the flowchart** | white | **NEW**, replaces `how` |
| 5 | `beforeafter` | Before / After | blue | unchanged |
| 6 | `proof` | The difference | white | tone blue → white |
| 7 | `compliance` | Built for compliance | white | unchanged |
| 8 | `rollout` | Rollout | white | unchanged |
| 9 | `seeitlive` | **See it live** | blue | **NEW**, replaces `demo` |
| 10 | `close` | Get started | blue | unchanged |

Removed from the deck registry: `how` (HowItWorks), `demo` (Demo iframe),
`pricing` (Pricing).

## Component changes

### NEW — `src/deck/slides/Flow.jsx`

A horizontal **5-stage flowchart** of how the app is used, revealed one stage at a
time. Built on `SlideFrame` + `Box` + the existing `data-anim` stagger.

**Stages (left → right):**

| # | Label | One line |
|---|-------|----------|
| 1 | Transcript / roster in | Upload a PDF, or pull the roster from Infinite Campus. |
| 2 | Reads it automatically | Courses, credits, and GPA parsed — zero data entry. |
| 3 | Builds a compliant plan | Checks graduation requirements and seat availability, proposes in seconds. |
| 4 | **Counselor approves** | You see the AI's recommendation and confidence — and make the final call. |
| 5 | Pushes to Infinite Campus | The approved schedule syncs back, with a full audit trail. |

- Each stage card carries a small line-icon (inline SVG) + label + one line.
- **Arrow connectors** between cards (evolve the existing single-stroke chevron
  `Connector` from HowItWorks; horizontal arrows pointing right).
- **Sequential reveal:** cards and connectors each get `data-anim` and are ordered
  in the DOM `card → arrow → card → arrow → …` so `SlideRoot`'s built-in stagger
  (opacity/y, 0.07s) draws them in product order. MVP uses this as-is.
- **Stage 4 emphasis:** the "Counselor approves" card is visually anchored (e.g.
  `accent`/`border-brand-200 bg-brand-50` via `Box accent`) — the human-in-the-loop
  beat that reassures counselors. This is the one node that is *not* "the machine."
- **Optional polish (out of MVP scope, note only):** a custom `useGSAP` timeline that
  draws each arrow with `scaleX: 0 → 1` and gives stage 4 a soft pulse, plus a final
  "→ now let's open it" cue on the last node. Implement only if the default stagger
  reads too uniform.
- Stays on white (`tone` unset) for diagram legibility.
- Responsive: `flex-col` on small screens, `md:flex-row` on wide — mirrors
  HowItWorks so it never breaks the deck's 16:9 framing.

### NEW — `src/deck/slides/SeeItLive.jsx`

A calm, full-bleed **handoff CTA** — the presenter's cue to switch tabs to the real
app. No iframe.

- Eyebrow: `See it live` · Headline: e.g. "Let's open the real thing."
- One short line: "Everything you just saw — running live. I'll walk you through it."
- A `ShotFrame` (browser chrome, `addr="app.schedule-ai"`) used as a **static CTA
  panel** (via its `children` slot) showing the app URL prominently, optionally a
  QR placeholder, so it reads as "the product is right here."
- `tone: 'blue'` in the registry → inherits the deck's blue-surface treatment, so it
  visually reads as the climax. The deck chrome already recolors via `data-tone`.
- Purely static/visual — no live embed, no second server required to *present this
  slide* (the presenter switches to the real app themselves).

### MODIFIED — `src/deck/slides.jsx`

- Remove imports + registry entries for `HowItWorks`, `Demo`, `Pricing`.
- Add imports + entries for `Flow` and `SeeItLive` in the order above.
- Update each affected entry's `label` and presenter `notes`:
  - `flow`: notes = narrate the five stages in order; land "it proposes, the
    counselor disposes" on stage 4; end pointing at "let me show you live."
  - `seeitlive`: notes = "Stop talking. Switch to the app. Walk the exact flow you
    just drew — transcript in, compliant schedule out, you approve, it syncs."
  - `proof`: tone field removed (now white).

### RETAINED (unused, fallback) — `Demo.jsx`, `AppFrame.jsx`, `Pricing.jsx`

`AppFrame.jsx` and `Demo.jsx` stay in the repo as an embedded-demo fallback if the
presenter ever wants an in-deck glimpse. `Pricing.jsx` may stay on disk but is **out
of the registry**. (Implementation plan decides keep-vs-delete; default: keep on
disk, drop from registry, to keep the diff reversible.)

## Out of scope (YAGNI)

- Per-node screenshot thumbnails on the flowchart (optional future add).
- Re-capturing app screenshots / new `public/shots/*`.
- Any change to the real app (`src/`), its `?demo=` bootstrap, or `AppFrame` scaling.
- Pricing content/figures (slide removed).
- The custom-timeline flowchart polish (note-only unless the default stagger is weak).

## Risks / notes

- **Tone scarcity:** blue beats at 2, 5, 9, 10 — slides 9+10 are adjacent blue, read
  as one sustained finale (acceptable, intentional). Flipping `proof` to white keeps
  the mid-deck scarcity intact.
- **Connector on small screens:** existing `Connector` is `hidden md:block`; the
  flowchart inherits that, so the diagram is horizontal only ≥ md (fine for a 16:9
  presentation; vertical fallback stacks cards without arrows).
- **No new deps** — reuses `gsap`/`useGSAP`, `SlideFrame`, `Box`, `ShotFrame`,
  `Connector` pattern already in the deck.

## Verification

- `cd pitch-deck && npm run dev` → open :5180, arrow through all 10 slides.
- Confirm: flowchart reveals stage-by-stage; stage 4 is visually anchored; no
  Pricing slide; slide 9 is the blue "See it live" handoff (no iframe); deck chrome
  recolors correctly on blue slides 2/5/9/10; no white-screen / console errors.
