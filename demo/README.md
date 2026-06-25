# Demo data: Avery Mitchell

A permanent, interactive demo request for the counselor review queue —
useful for pitches/walkthroughs without needing a real student to submit
something first, and with **no writes to Supabase**.

**Avery Mitchell** — grade 11, South Forsyth High School. Real transcript
data (see `avery-mitchell-transcript.pdf`): weighted GPA 4.53, 99%
attendance, 21 completed courses including **Journalism I**.

**The request:** Prerequisite Override — replace **Journalism I** with
**Journalism III** (skipping the formal Journalism II prerequisite).
Student note: *"Will take the course over summer through FVA."* Algorithm
recommendation: **Admit** (100% confidence — GPA, attendance, prerequisite
track-skip, and schedule all check out).

Her current course list: Journalism I, Adv. Weight Training, AP Biology,
AP Calculus AB, AP World History, AP Psychology, French III.

## How it works

Her data is hardcoded in `src/services/demoSeed.js`. `services/api.js`
overlays her request into `fetchReviewQueue()` and serves her SIS record
from `fetchOneRosterRecord()` — regardless of whether the app is running
against a real Supabase backend or local mock data. **Admitting or denying
her doesn't write anywhere** (no Supabase row, no local mock array); it
just flips an in-memory flag for the current page session. Reload the app
or log back in and she's there again, fresh and pending — no reset script
needed.

`avery-mitchell-transcript.pdf` is her real transcript document — also
usable to demo the live upload/parse flow separately, if you want to show
that path in addition to (or instead of) the pre-seeded request.

## Why not Supabase?

An earlier version of this seeded Avery directly into the real database,
which required faking a row in Supabase's internal `auth.users` table just
to satisfy foreign keys (`profiles`/`one_roster`/`requests` all reference
it) — workable, but more moving parts than this needs for a pure demo
fixture. Hardcoding her in the app layer instead means zero database
dependency: she shows up the same way whether or not Supabase is even
configured.
