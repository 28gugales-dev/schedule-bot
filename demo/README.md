# Demo data: Avery Mitchell

A permanent, interactive demo request for the counselor review queue —
useful for pitches/walkthroughs without needing a real student to submit
something first.

**Avery Mitchell** — grade 11, South Forsyth High School. Real transcript
data (see `avery-mitchell-transcript.pdf`): weighted GPA 4.53, 99% attendance,
21 completed courses including **Journalism I**.

**The request:** Prerequisite Override — replace **Journalism I** with
**Journalism III** (skipping the formal Journalism II prerequisite).
Student note: *"Will take the course over summer through FVA."* Algorithm
recommendation: **Admit** (100% confidence — GPA, attendance, prerequisite
track-skip, and schedule all check out).

Her current course list: Journalism I, Adv. Weight Training, AP Biology,
AP Calculus AB, AP World History, AP Psychology, French III.

## Files

- `seed-avery-mitchell.sql` — creates everything (profile, SIS record,
  waiver type, and the pending request). **Idempotent** — re-running it
  never duplicates her or resets a decision a counselor already made.
- `reset-avery-mitchell.sql` — puts her request back to pending if you
  already admitted/denied it in a previous demo and want a clean run.
- `avery-mitchell-transcript.pdf` — the real transcript document; upload
  this in the student intake flow to see it parsed live, if you want to
  demo that path too instead of (or in addition to) the seeded request.

## Setup

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste in the contents of `seed-avery-mitchell.sql` and click **Run**.
3. Log in as a counselor — Avery Mitchell's request is in the Review Queue.
4. Admit or deny it like any real request.
5. Before your next demo, optionally run `reset-avery-mitchell.sql` to put
   her back to pending.

## Why this needed a fake `auth.users` row

`profiles`, `one_roster`, and `requests` all reference `auth.users` via
foreign key — there's no way to seed a "student" without *some* row there,
even though Avery never logs in herself. The script inserts one with an
unusable password hash, purely to satisfy the foreign key chain. This is a
direct write to an internal Supabase-managed table; reasonable for a
demo-only record, but worth knowing about before adapting this pattern
elsewhere.
