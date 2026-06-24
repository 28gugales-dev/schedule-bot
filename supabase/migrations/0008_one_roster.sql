-- ════════════════════════════════════════════════════════════════════════════
-- 0008_one_roster.sql — Authoritative SIS snapshot pulled from Infinite Campus
-- via the OneRoster REST API. Additive + idempotent.
--
-- This is the "initial pull" baseline a counselor reviews a request against, and
-- the source the push edge function re-reads (a FRESH pull) to re-validate every
-- approved decision immediately before pushing it to IC. IC remains the source of
-- truth; this table is a cache of IC state (note last_sync — staleness is visible).
--
-- FERPA / Forsyth DSA DATA MINIMIZATION (privacy-policy.md §1.1): the OneRoster
-- pull can return MORE than the policy permits us to store (date of birth, gender,
-- race/ethnicity, demographics). The oneroster-pull edge function applies a
-- server-side ALLOWLIST (src/services/ic/fieldAllowlist.js) and writes ONLY the
-- columns below. Prohibited elements are dropped before they ever reach this table.
--
-- IC KEY MAPPING (sis_id / *_sourced_id): OneRoster identifies every entity by a
-- district-scoped `sourcedId`. We do NOT mint these — they must match the
-- district's existing SIS keys. They are nullable here: the demo/mock pull leaves
-- them null; a real district pull populates them. The push cannot emit a real
-- enrollments.csv row until these are present (enforced in the edge function).
--
-- Prereqs (already live): 0001b base schema (private.is_counselor()).
-- Apply via Supabase MCP apply_migration (name 'one_roster') or the SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ A. TABLE — public.one_roster (one row per student, refreshed by the pull)  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create table if not exists public.one_roster (
  student_id         uuid primary key references public.profiles(id) on delete cascade,
  -- IC key mapping (nullable placeholders; populated only by a real district pull)
  sis_id             text,            -- the student's OneRoster users.sourcedId
  school_sourced_id  text,            -- orgs.sourcedId of the student's school
  -- Allowlisted academic snapshot (the ONLY fields we persist)
  gpa                numeric(3,2),
  attendance_rate    int,             -- percent 0-100
  grade_level        int,             -- 9-12
  enrollment_status  text,            -- 'Active' | ...
  last_sync          timestamptz,     -- when IC was last read (staleness signal)
  completed_courses  jsonb not null default '[]'::jsonb,  -- [{name,grade,gradeYear,term}]
  current_schedule   jsonb not null default '[]'::jsonb,  -- [{course,period,classSourcedId?}]
  updated_at         timestamptz not null default now()
);

create index if not exists one_roster_sis_id_idx on public.one_roster (sis_id);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ B. RLS — counselor-only SELECT. Writes are service-role (the pull edge fn) ║
-- ║    only: the service role BYPASSES RLS, so we deliberately define NO        ║
-- ║    insert/update policy for authenticated clients. A counselor can read     ║
-- ║    the cache; nobody can forge it from the browser. Students get nothing.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
alter table public.one_roster enable row level security;

drop policy if exists "one_roster_select_counselor" on public.one_roster;
create policy "one_roster_select_counselor" on public.one_roster
  for select to authenticated
  using (private.is_counselor());

-- No INSERT/UPDATE/DELETE policy for authenticated => denied under RLS.
-- The oneroster-pull edge function writes with the service-role key (RLS-exempt).
