# Supabase Auth-First Vertical Slice — Design Spec

**Date:** 2026-06-22
**Status:** Approved (proceeding to implementation)
**Branch:** `supabase-auth-slice`

## Goal

Wire a real Supabase backend for one end-to-end loop — **student submit → counselor queue → decision** — on real Postgres tables protected by Row-Level Security, with email/password auth. **Demo mode stays 100% intact**: with no `VITE_SUPABASE_*` env vars the app runs exactly as today (localStorage-backed via `api.js`).

This is an intentional *vertical slice*: prove the architecture end-to-end on the smallest real surface, then expand entity-by-entity in later passes.

## Decisions (locked)

- **Project:** new, isolated Supabase project created via MCP in org `wtojjoyksywfcjyogiwp`. (The org's only existing project is an unrelated "Agora" app — must not be touched.)
- **Scope:** auth-first vertical slice (not full backend).
- **Auth:** email/password + seeded counselor & student users. Demo mode preserved. Google OAuth deferred.

## Architecture / dispatch

`api.js` remains the public service module. Add `src/services/supabaseApi.js` exporting the same function signatures backed by `supabase-js`. Each migrated function in `api.js` gains a one-line guard at the top:

```js
if (isSupabaseConfigured) return sb.fn(args)
// ...existing demo (localStorage) implementation falls through
```

Functions NOT migrated this pass (batch sync, rubric persistence, audit, waitlist, OneRoster) keep running their demo implementations even in real mode → graceful partial migration; nothing breaks.

## Schema — 3 tables (one DDL migration)

```
profiles      id uuid PK → auth.users(id) on delete cascade
              role text not null default 'student' check (role in ('student','admin'))
              full_name text, email text, grade int, gpa numeric(3,2)
              created_at timestamptz default now()

waiver_types  id text PK                         -- 'prereq-override', etc.
              name text not null, description text
              active boolean not null default true
              required_docs jsonb not null default '[]'

requests      id uuid PK default gen_random_uuid()
              student_id uuid not null → profiles(id)
              waiver_type_id text not null → waiver_types(id)
              status text not null default 'submitted'
                  check (status in ('submitted','approved','denied','flagged'))
              course_list jsonb default '[]', from_course text, to_course text
              student_note text
              transcript_data jsonb            -- {gpa,studentGrade,completed[],recognized[],unrecognized[]}
              documents jsonb default '[]'      -- file metadata (Storage deferred)
              recommendation jsonb             -- {decision,confidence,reason,checks[]} (client-computed at submit)
              rule_version text
              student_snapshot jsonb           -- {name,id,grade,gpa} for the queue card
              counselor_note text, decided_by uuid → profiles(id), decided_at timestamptz
              submitted_at timestamptz not null default now()
```

`requests` is the single entity behind both the student *My Requests* view and the counselor *queue* view (the demo's `submissions` and `queue` arrays are two representations of it). Display-status derivation (`deriveDisplayStatus`) stays client-side.

Indexes (FK + filter columns per Supabase RLS perf guidance): `requests(student_id)`, `requests(waiver_type_id)`, `requests(status)`.

## RLS (security core — student PII)

Helper in a **private** schema (not API-exposed), `security definer`, `set search_path=''`, internal `auth.uid()` check, execute revoked from public/anon/authenticated:

```sql
create function private.is_counselor() returns boolean
language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and role = 'admin');
$$;
```

Policies (all `to authenticated`, `auth.uid()` wrapped in `(select …)` per perf guidance):
- **requests:** student INSERT only `student_id = (select auth.uid())`; student SELECT only own; counselor SELECT all; counselor UPDATE (decision). No student UPDATE/DELETE. → a student cannot read another student's request.
- **profiles:** SELECT own or `private.is_counselor()`; UPDATE own only; INSERT via signup trigger (security definer).
- **waiver_types:** any authenticated SELECT; counselor full manage.

Validate with `get_advisors(security)` after apply.

## Auth + roles

- Email/password. New-user signup trigger (`on auth.users`, security definer) inserts a `profiles` row with default role `student`.
- Seed **2 users** (counselor `role=admin`, student `role=student`); set both `profiles.role` and `user_metadata.role`.
- Client UI gating reads `user_metadata.role` via existing `resolveRole`. **Server authorization is RLS via `private.is_counselor()` (profiles.role)** — never trusts the client (matches the existing AuthProvider comment).
- `LoginPage` gains an email/password form for real mode (keeps demo chooser + Google button when applicable).
- `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Slice boundary

**IN:** 3 tables + RLS + signup trigger + seed; email/password + 2 users; `supabaseApi` for `submitWaiver`, `fetchMyRequests`, `fetchRequestStatus`, `fetchAvailableWaivers`/`fetchAllWaivers`, `fetchReviewQueue`, `submitDecision`, `fetchRejectedRequests`; `LoginPage` email/password UI; `.env`; demo mode preserved.

**OUT (later phases — stay demo for now):** audit_events + ai_decisions tables; batch-sync + IC edge function; rubric persistence; waitlist/notifications; real OneRoster SIS; **Supabase Storage** for uploads (documents stay metadata-only); Google OAuth.

## Verification

1. Re-run Playwright **integration-flow** in real mode (env set): seeded student submits → counselor sees it in queue (RLS) → admit → status flips.
2. Negative RLS test: student B cannot read student A's request.
3. `get_advisors(security)` clean (no missing-RLS / exposed-function warnings).
4. Demo mode regression: no env → app behaves exactly as before.

## Risk / rollback

Demo path untouched (no env = localStorage). Real mode entirely behind env presence. New project isolated from the Agora DB. Migrations versioned. Project is free-tier (cost confirmed before creation).
