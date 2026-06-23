# Demo data → Supabase migration — design

**Date:** 2026-06-24
**Status:** approved (pending spec review)
**Scope tier:** Complex (multi-subsystem)

## Goal

Move ALL demo/seed data that currently lives as JS fixtures + localStorage into
the live Supabase project (`bezdfmxetudovjbqceda`), and build the missing schema
+ service wiring for the stores that today only have a localStorage/in-memory
implementation. After this, a Supabase-configured deploy shows the same rich
demo content the localStorage demo shows — for every flow, not just the
auth-slice.

Deliverable shape (chosen): a **committed, reproducible `supabase/seed.sql`**
applied to the live project via the Supabase MCP, plus new migration files for
the new tables and the JS wiring that routes those flows through Supabase.

## Findings (live DB state, queried 2026-06-24)

| Table | Live rows | Action |
|-------|-----------|--------|
| `waiver_types` | 8 | idempotent **upsert** to fixture content (windows, criteria, reference_docs) |
| `requests` | 1 | **add** 12 queue + 7 portal (deterministic UUIDs, `on conflict do nothing`) |
| `audit_log` | 0 | **seed** from `SEED_AUDIT_EVENTS` (text PKs, idempotent) |
| `ai_decisions` | 0 | **seed** from `SEED_AI_DECISIONS` |
| `resources` | 0 | **seed** 3 staff resources |
| `profiles` | 2 | keep; add 12 view-only student profiles |
| `auth.users` | 2 | keep; add 12 view-only student users |

**Loginable accounts already exist** (confirmed, password-backed):
`counselor@demo.school` (`7bf9d75d-…`, role admin) and `student@demo.school`
(`21cfa51d-…`, role student). We **reuse** them — no new login accounts, no
service-role seed script needed.

`auth.users` is NOT NULL only on `id`, `is_sso_user` (default false),
`is_anonymous` (default false); token columns default to `''`. So the 12
review-queue students — **view-only**, nobody logs in as them — are safe as
minimal SQL inserts. Brittleness of raw `auth.users` inserts only matters for
loginable users, and those already exist.

## Architecture

### Seed generator (not hand-written SQL)
`supabase/generate-seed.mjs` imports the existing fixtures
(`src/services/mockData.js`, `src/services/seedAudit.js`) and emits
`supabase/seed.sql`. Rationale: the audit fixtures are *derived in JS* (AI
decisions built from `REVIEW_CHECKS`, score breakdowns synthesized) — static SQL
would rot the moment a fixture changes. The generator keeps the seed in sync and
re-generatable. Both the generator and its generated `seed.sql` are committed.

### Demo-student identity map (the backbone)
The generator owns ONE map, the single source every derived row uses:

```
S-48213  →  <fixed uuid>  →  { name: 'Ava Thompson',  grade: 11, gpa: 3.42 }
S-50127  →  <fixed uuid>  →  { name: 'Liam Park',      grade: 12, gpa: 2.18 }
… (12 review-queue students total)
```

- Student UUIDs are **fixed literals** (hardcoded in the generator), so every run
  produces identical SQL.
- `fetchOneRosterRecord(row.student.id)` is called with the student UUID in
  Supabase mode, so `one_roster` keys by `profiles.id` (UUID), with the legacy
  `S-XXXX` kept in a `sis_id` column for reference.
- Request UUIDs are also **fixed literals** in the generator map, keyed by
  fixture id (`req-1001` → fixed uuid). The audit/ai `request_id` and the JSONB
  `student.id` are remapped through the SAME map so cross-references line up (no
  FK exists on `audit_log.request_id`, but the values stay consistent).

### Idempotency
Deterministic UUIDs + `on conflict (id) do nothing` for inserts;
`on conflict (id) do update` for `waiver_types` and `profiles` (the
`handle_new_user` trigger pre-creates a profile row on each `auth.users` insert,
so profile field-setting MUST be an upsert, not a plain insert). FERPA-lock
triggers are BEFORE-UPDATE only and `auth.uid()` is null in the SQL editor, so
the role/grade/gpa writes are allowed; the consent CHECK is a constraint (not
RLS) so every `status='submitted'` seed row sets `consent_given_at`.

### Status mapping
Stored `requests.status` ∈ {submitted, approved, denied, flagged, withdrawn}.
Fixture display statuses (`counselor-review`, `automated-review`) are *derived*
from elapsed time and never stored — map them to `submitted`. Seeded
`submitted_at` is mid-June 2026 (>7s ago) so the UI re-derives `counselor-review`
as before.

## Slices (ordered, independently reviewable)

### Slice 1 — Core data seed
- `waiver_types`: upsert all 8 fixtures (incl. `MEDICAL_EXEMPTION_DEMO`), with
  `form_schema`, `criteria`, `reference_docs`, `open_at`/`close_at`.
- 12 view-only students: `auth.users` minimal insert (`on conflict do nothing`)
  → trigger creates profile → `profiles` upsert sets `role='student'`,
  `full_name`, `grade`, `gpa`.
- `requests`: 12 queue (`status='submitted'`, `student_snapshot`,
  `recommendation` with `checks` folded in from `REVIEW_CHECKS`,
  `consent_given_at`, `rule_version`) + 7 portal (owned by `student@demo.school`,
  status-mapped, `form_answers`/`form_schema_snapshot` where present).
- `resources`: 3 rows, `uploaded_by` = counselor UUID, `storage_path` null
  (metadata-only; no bytes to migrate).
- Note: in Supabase mode the counselor queue naturally also shows the portal
  student's pending requests (real cross-student behavior — a fidelity gain over
  the demo's artificial array separation).

### Slice 2 — Audit history seed
- `audit_log` ← `SEED_AUDIT_EVENTS` via `toRow` column mapping; `ai_decisions` ←
  `SEED_AI_DECISIONS` via `toAiRow`. Text PKs (`evt-seed-…`, `ai-seed-…`) →
  naturally idempotent. Student/request ids in the JSONB remapped to minted
  UUIDs for consistency with Slice 1.

### Slice 3 — `one_roster` (migration `0008_one_roster.sql`)
```sql
create table if not exists public.one_roster (
  student_id        uuid primary key references public.profiles(id) on delete cascade,
  sis_id            text,
  gpa               numeric(3,2),
  attendance_rate   int,
  grade_level       int,
  enrollment_status text,
  last_sync         timestamptz,
  completed_courses jsonb not null default '[]',
  current_schedule  jsonb not null default '[]'
);
alter table public.one_roster enable row level security;
-- counselor-only read (SIS data = education record, mirrors audit_log). No
-- client write policy: real OneRoster sync is server-side (service role bypasses
-- RLS); the seed runs as owner.
create policy "one_roster_select_counselor" on public.one_roster
  for select to authenticated using (private.is_counselor());
```
- Wiring: `api.js` `fetchOneRosterRecord` gains an `isSupabaseConfigured` guard →
  `sb.fetchOneRosterRecord(studentId)` selects by `student_id`, maps snake→camel.
- Seed: one row per mapped student.

### Slice 4 — `batch_sync_queue` (migration `0009_batch_sync.sql`)
```sql
create table if not exists public.batch_sync_queue (
  id           uuid primary key default gen_random_uuid(),
  source_ref   text,                 -- original label or real request uuid
  student_name text not null,
  waiver_name  text not null,
  approved_at  timestamptz not null,
  synced       boolean not null default false
);
alter table public.batch_sync_queue enable row level security;
create policy "batch_sync_counselor_all" on public.batch_sync_queue
  for all to authenticated
  using (private.is_counselor()) with check (private.is_counselor());
```
- Wiring: guards on `fetchBatchSyncQueue` + `triggerBatchICPush`; **extend
  `sb.submitDecision`** so an `admit` inserts a `batch_sync_queue` row (mirrors
  the demo path). The actual IC push stays a stub/edge-fn; `triggerBatchICPush`
  flips `synced=true` + writes the `batch.sync` audit event.
- Seed: 8 rows from `BATCH_SYNC_QUEUE` (deterministic id from `source_ref`).

### Slice 5 — `waitlist` (migration `0010_waitlist.sql`) — build fully
```sql
create table if not exists public.waitlist_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  course_name text not null,
  request_id  uuid references public.requests(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (student_id, course_name)
);
create table if not exists public.waitlist_notifications (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  course_name text not null,
  created_at  timestamptz not null default now(),
  dismissed   boolean not null default false
);
```
- **RLS — the cross-user wrinkle (user-authored during implementation):**
  students manage their own subscriptions and read/dismiss their own
  notifications; a counselor must read all subscriptions (to find who to notify
  when a seat frees) and **insert notifications for other students** on admit.
  The counselor-insert-notifications policy is the meaningful decision and will
  be left as a clearly-marked TODO for the user to write (learning mode).
- Wiring: guards on `subscribeToWaitlist`/`fetchNotifications`/
  `dismissNotification`; `sb.submitDecision` on admit reads subscribers for the
  freed `fromCourse`, inserts notifications, clears subs.
- No seed (in-memory today, starts empty).

### Slice 6 — Wiring cleanup / sweep
Confirm every demo-only path now has its `isSupabaseConfigured` guard:
`fetchOneRosterRecord`, `fetchBatchSyncQueue`, `triggerBatchICPush`,
`subscribeToWaitlist`, `fetchNotifications`, `dismissNotification`. Run the test
suite + lint.

## Out of scope (YAGNI)
- **Global rubric** (`fetchRubricCriteria`/`updateRubricCriteria`): zero `.jsx`
  callers; fully superseded by per-form `waiver_types.criteria` (migration 0006).
  No table, no wiring. (Dead-code removal is a separate concern, not this task.)
- Creating loginable accounts for the 12 queue students.
- A real Infinite Campus / OneRoster integration (those remain stubs/edge-fns).

## Verification
1. Per slice: MCP `execute_sql` count + spot-check after `apply_migration`/seed.
2. `bootstrap.sql` updated so a clean project reproduces the new tables (append
   `0008`–`0010` in dependency order).
3. End-to-end with `VITE_SUPABASE_*` set:
   - log in as `counselor@demo.school` → review queue shows 12 (+ portal
     pending), audit + AI-decision views populated, batch-sync board shows 8.
   - log in as `student@demo.school` → My Requests shows the 7 portal requests.
4. Test suite (`src/**/__tests__`) + ESLint green.

## Files touched
- New: `supabase/generate-seed.mjs`, `supabase/seed.sql`,
  `supabase/migrations/0008_one_roster.sql`, `0009_batch_sync.sql`,
  `0010_waitlist.sql`.
- Edited: `src/services/api.js` (guards), `src/services/supabaseApi.js` (new fns
  + extended `submitDecision`), `supabase/bootstrap.sql` (append new tables).
