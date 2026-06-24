-- ════════════════════════════════════════════════════════════════════════════
-- bootstrap.sql — FULL schema for a CLEAN Supabase project (schedule-bot).
--
-- Concatenation of migrations 0001b → 0007 in DEPENDENCY order (0001b base schema
-- MUST precede 0001_audit, which uses private.is_counselor()). Every statement is
-- idempotent (if not exists / create or replace / drop ... if exists), so a re-run
-- is safe.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste ALL of this →
-- Run. The storage.objects policies (documents + resources buckets) need the
-- table owner, which the SQL Editor provides — so run it HERE, not via `db push`.
--
-- After this succeeds: configure Google OAuth (Auth → Providers → Google) so the
-- app can sign users in, and add <your-app-origin>/ to Auth → URL Configuration →
-- Redirect URLs. New accounts default to role 'student'; elevate your own to
-- 'admin' with:  update public.profiles set role='admin' where email='you@...';
-- ════════════════════════════════════════════════════════════════════════════


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0001b_base_schema.sql
-- ████████████████████████████████████████████████████████████████████████
-- ════════════════════════════════════════════════════════════════════════════
-- 0001b_base_schema.sql — BACKFILL of the auth-slice base schema.
--
-- This DDL is ALREADY APPLIED to the live project (bezdfmxetudovjbqceda) as
-- migration 20260622114419_auth_slice_schema_rls. It previously lived only as
-- prose in docs/superpowers/specs/2026-06-22-supabase-auth-slice-design.md, so
-- 0002 would ALTER tables with no tracked CREATE. This file backfills that CREATE
-- so the migration chain is reproducible on a clean project.
--
-- DO NOT re-apply this to the live DB — it is already there. It is repo
-- documentation / clean-project reproducibility only. Made idempotent
-- (if not exists / drop … if exists / create or replace) WITHOUT changing
-- semantics, so a clean-project run is safe.
--
-- Run on a CLEAN project only:  supabase db push   (or paste into the SQL editor)
-- ════════════════════════════════════════════════════════════════════════════

create schema if not exists private;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','admin')),
  full_name text,
  email text,
  grade int,
  gpa numeric(3,2),
  created_at timestamptz not null default now()
);

create table if not exists public.waiver_types (
  id text primary key,
  name text not null,
  description text,
  active boolean not null default true,
  required_docs jsonb not null default '[]'::jsonb
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  waiver_type_id text not null references public.waiver_types(id),
  status text not null default 'submitted' check (status in ('submitted','approved','denied','flagged')),
  course_list jsonb not null default '[]'::jsonb,
  from_course text,
  to_course text,
  student_note text,
  transcript_data jsonb,
  documents jsonb not null default '[]'::jsonb,
  recommendation jsonb,
  rule_version text,
  student_snapshot jsonb,
  counselor_note text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  submitted_at timestamptz not null default now()
);

create index if not exists requests_student_id_idx on public.requests (student_id);
create index if not exists requests_waiver_type_id_idx on public.requests (waiver_type_id);
create index if not exists requests_status_idx on public.requests (status);

create or replace function private.is_counselor()
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'); $$;
revoke execute on function private.is_counselor() from public, anon;
grant execute on function private.is_counselor() to authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.profiles (id, role, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'role','student'), new.raw_user_meta_data->>'name', new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.waiver_types enable row level security;
alter table public.requests enable row level security;

drop policy if exists "profiles_select_self_or_counselor" on public.profiles;
create policy "profiles_select_self_or_counselor" on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_counselor());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "waiver_types_select_all" on public.waiver_types;
create policy "waiver_types_select_all" on public.waiver_types for select to authenticated using (true);

drop policy if exists "waiver_types_manage_counselor" on public.waiver_types;
create policy "waiver_types_manage_counselor" on public.waiver_types for all to authenticated using (private.is_counselor()) with check (private.is_counselor());

drop policy if exists "requests_insert_own" on public.requests;
create policy "requests_insert_own" on public.requests for insert to authenticated with check (student_id = (select auth.uid()));

drop policy if exists "requests_select_own_or_counselor" on public.requests;
create policy "requests_select_own_or_counselor" on public.requests for select to authenticated using (student_id = (select auth.uid()) or private.is_counselor());

drop policy if exists "requests_update_counselor" on public.requests;
create policy "requests_update_counselor" on public.requests for update to authenticated using (private.is_counselor()) with check (private.is_counselor());


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0001_audit.sql
-- ████████████████████████████████████████████████████████████████████████
-- ════════════════════════════════════════════════════════════════════════════
-- Audit trail + AI-decision log
--
-- Column names mirror the row mappers in src/services/audit.js (toRow/fromRow,
-- toAiRow/fromAiRow) 1:1. When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
-- set, audit.js routes reads/writes here instead of localStorage — no code
-- change beyond the env vars.
--
-- Run:  supabase db push      (or paste into the SQL editor)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
  id              text primary key,
  ts              timestamptz not null default now(),
  category        text not null,                 -- decision | config | submission | sync | disclosure
  action          text not null,                 -- decision.admit | rubric.update | record.view | …
  actor           jsonb not null,                -- { id, name, role }   (WHO)
  device          jsonb,                         -- { id, label, ua }    (WHICH DEVICE)
  student         jsonb,                          -- { id, name }         (STUDENT AFFECTED)
  request_id      text,
  waiver_type_id  text,
  summary         text not null default '',
  before_state    jsonb,                          -- snapshot BEFORE
  after_state     jsonb,                          -- snapshot AFTER
  diff            jsonb not null default '[]',    -- field-level diff (config edits)
  ai_decision_id  text,                           -- → ai_decisions.id (decisions)
  overrode        boolean not null default false, -- human decision contradicted the AI
  note            text not null default ''
);

create index if not exists audit_log_ts_idx        on public.audit_log (ts desc);
create index if not exists audit_log_action_idx     on public.audit_log (action);
create index if not exists audit_log_category_idx   on public.audit_log (category);
create index if not exists audit_log_request_idx    on public.audit_log (request_id);
create index if not exists audit_log_student_id_idx on public.audit_log ((student->>'id'));

create table if not exists public.ai_decisions (
  id              text primary key,
  ts              timestamptz not null default now(),
  request_id      text not null,
  student         jsonb not null,                 -- { id, name }
  waiver_type_id  text,
  evaluator       text not null,                  -- model/version label
  decision        text not null,                  -- admit | deny | review
  confidence      numeric,                        -- 0..1
  rationale       text,
  checks          jsonb not null default '[]',    -- per-criterion reasoning
  score_breakdown jsonb,                           -- { base, items:[{label,delta}] }
  inputs_snapshot jsonb                            -- what the evaluator saw
);

create index if not exists ai_decisions_ts_idx      on public.ai_decisions (ts desc);
create index if not exists ai_decisions_request_idx on public.ai_decisions (request_id);

-- ── Row-level security (HARDENED) ─────────────────────────────────────────────
-- Audit data is append-only and counselor-only.
--   SELECT : counselors only  (private.is_counselor() -> profiles.role='admin').
--   INSERT : counselors only via the client (authenticated JWT). audit.js writes
--            through the browser client (audit.js:190,207), NOT the service role,
--            so the gate must be is_counselor(), not service-role-only. The
--            service role bypasses RLS, so any future Edge Function still writes.
--   No UPDATE / DELETE policies => those ops are denied under RLS (append-only).
-- Students / anon can neither read nor write.
-- NOTE: this gate is only sufficient once 0003_ferpa_hardening.sql's profiles
-- role-lock is applied (an escalated student would otherwise satisfy
-- is_counselor()). Ship them together.
alter table public.audit_log    enable row level security;
alter table public.ai_decisions enable row level security;

-- drop legacy permissive names (in case an older copy was ever applied):
drop policy if exists "audit read"   on public.audit_log;
drop policy if exists "audit insert" on public.audit_log;
drop policy if exists "ai read"      on public.ai_decisions;
drop policy if exists "ai insert"    on public.ai_decisions;
-- drop new names so re-runs are clean:
drop policy if exists "audit_log_select_counselor"    on public.audit_log;
drop policy if exists "audit_log_insert_counselor"    on public.audit_log;
drop policy if exists "ai_decisions_select_counselor" on public.ai_decisions;
drop policy if exists "ai_decisions_insert_counselor" on public.ai_decisions;

create policy "audit_log_select_counselor"
  on public.audit_log for select to authenticated
  using ( private.is_counselor() );

create policy "audit_log_insert_counselor"
  on public.audit_log for insert to authenticated
  with check ( private.is_counselor() );

create policy "ai_decisions_select_counselor"
  on public.ai_decisions for select to authenticated
  using ( private.is_counselor() );

create policy "ai_decisions_insert_counselor"
  on public.ai_decisions for insert to authenticated
  with check ( private.is_counselor() );


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0002_form_builder.sql
-- ████████████████████████████████████████████████████████████████████████
-- ════════════════════════════════════════════════════════════════════════════
-- 0002_form_builder.sql — Dynamic form builder. Additive + idempotent.
--
-- Defaults make the 8 seeded waiver types + all existing requests backward-
-- compatible (zero custom fields/answers), so the legacy wizard + AI rubric
-- paths are byte-for-byte unchanged. Apply via the Supabase MCP apply_migration
-- (name 'form_builder_columns') or paste into the SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.waiver_types
  add column if not exists form_schema jsonb not null default '[]'::jsonb;
alter table public.waiver_types
  drop constraint if exists waiver_types_form_schema_is_array;
alter table public.waiver_types
  add constraint waiver_types_form_schema_is_array
  check (jsonb_typeof(form_schema) = 'array');

alter table public.requests
  add column if not exists form_answers          jsonb not null default '{}'::jsonb,
  add column if not exists form_schema_snapshot  jsonb not null default '[]'::jsonb;
alter table public.requests
  drop constraint if exists requests_form_answers_is_object;
alter table public.requests
  add constraint requests_form_answers_is_object
  check (jsonb_typeof(form_answers) = 'object');
alter table public.requests
  drop constraint if exists requests_form_schema_snapshot_is_array;
alter table public.requests
  add constraint requests_form_schema_snapshot_is_array
  check (jsonb_typeof(form_schema_snapshot) = 'array');

-- RLS: NO NEW POLICY (D12). Existing whole-row policies govern the new columns:
--   waiver_types_manage_counselor (FOR ALL, private.is_counselor())  → counselor CRUD incl. form_schema
--   waiver_types_select_all       (SELECT true)                      → students read; client filters active
--   requests_insert_own           (INSERT, student_id = auth.uid())  → student writes answers/snapshot on own row


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0003_ferpa_hardening.sql
-- ████████████████████████████████████████████████████████████████████████
-- ════════════════════════════════════════════════════════════════════════════
-- 0003_ferpa_hardening.sql  — FERPA hardening (NEW migration)
--
-- ONE coherent policy/trigger set spanning three concerns that all touch RLS +
-- triggers on public.profiles and public.requests:
--   A) profiles: role/gpa/grade column-lock trigger + counselor UPDATE policy
--   B) requests: consent columns + NOT VALID consent-on-submit CHECK
--   C) requests: student rights (withdraw + deletion flag) — student UPDATE
--      policy + column-lock trigger that coexists with requests_update_counselor
--      WITHOUT re-opening any escalation path.
--
-- Prereqs (already live): 0001b base schema, 0002 form builder. is_counselor()
-- lives in schema private (security definer, stable, search_path=''), reads
-- profiles.role='admin'.
--
-- Idempotent + safe inside a single begin; ... rollback; probe transaction.
-- LIVE-STATE NOTE: as of 2026-06-23 the live DB has 1 request (status approved)
-- and ZERO 'submitted' rows — the briefs' '8 legacy submitted rows' is wrong.
-- The consent CHECK is still added NOT VALID (forward-only enforcement, never
-- validate) so the file stays correct regardless of backlog.
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ A. PROFILES — role/gpa/grade privilege-escalation lock                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- A1. BEFORE UPDATE trigger: a NON-counselor may not change role/gpa/grade.
--     IS DISTINCT FROM (NOT <>) because gpa/grade are NULLable — <> returns
--     NULL (not TRUE) on a NULL operand, silently letting NULL<->value escalate.
--     NULL auth.uid() (service role / SECURITY DEFINER signup batch) is allowed,
--     and that branch is ordered BEFORE the is_counselor() raise because
--     is_counselor() is FALSE when auth.uid() is NULL.
create or replace function private.enforce_profile_field_lock()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if (new.role  is distinct from old.role
   or new.gpa   is distinct from old.gpa
   or new.grade is distinct from old.grade)
  then
    -- Trusted server-side write (no JWT): allow. A student can never reach a
    -- NULL uid here — the only UPDATE policies on profiles are 'to authenticated'.
    if (select auth.uid()) is null then
      return new;
    end if;
    if not private.is_counselor() then
      raise exception
        'FERPA lock: only counselors may change role, gpa, or grade (attempted by %)',
        (select auth.uid())
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_field_lock on public.profiles;
create trigger trg_enforce_profile_field_lock
  before update on public.profiles
  for each row execute function private.enforce_profile_field_lock();

-- A2. Counselor UPDATE policy on profiles. 0001b shipped only profiles_update_self
--     (self-only). Without this a counselor editing a STUDENT row is RLS-filtered
--     to 0 rows BEFORE the trigger runs => silent no-op. Mirrors
--     requests_update_counselor. profiles_update_self is LEFT UNCHANGED: the
--     student self-escalation block lives in the trigger, not RLS.
drop policy if exists "profiles_update_counselor" on public.profiles;
create policy "profiles_update_counselor" on public.profiles
  for update to authenticated
  using (private.is_counselor())
  with check (private.is_counselor());

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ B. REQUESTS — consent capture at submission                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- B1. Consent columns. Nullable so every counselor-decision UPDATE that does not
--     touch consent stays valid, and so the lone existing row is unaffected.
alter table public.requests
  add column if not exists consent_given_at timestamptz,
  add column if not exists consent_version  text;

-- B2. Integrity guard: any row in the initial 'submitted' state must carry
--     consent. NOT VALID => enforced on every new INSERT and on any UPDATE that
--     writes the affected columns, but never validated against the backlog.
--     DO NOT run `validate constraint requests_consent_on_submit`.
alter table public.requests
  drop constraint if exists requests_consent_on_submit;
alter table public.requests
  add constraint requests_consent_on_submit
  check (status <> 'submitted' or consent_given_at is not null)
  not valid;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ C. REQUESTS — student rights (withdraw + deletion flag)                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- C1. Allow the new 'withdrawn' status.
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status in ('submitted','approved','denied','flagged','withdrawn'));

-- C2. Lifecycle columns (nullable; null = not requested / not withdrawn).
alter table public.requests
  add column if not exists withdrawn_at          timestamptz,
  add column if not exists deletion_requested_at timestamptz;

-- C3. Student UPDATE policy. USING gates WHICH rows (own + still 'submitted');
--     WITH CHECK gates the RESULT (still own + status in submitted/withdrawn).
--     WITH CHECK cannot see OLD, so it cannot do column-locking — the trigger
--     (C4) does that. The status='submitted' USING gate is what blocks a student
--     from touching an already-decided/withdrawn row at all. This policy is OR'd
--     with requests_update_counselor; it does NOT widen SELECT, so no PII
--     exposure is added and no escalation path is re-opened.
drop policy if exists "requests_update_student_self" on public.requests;
create policy "requests_update_student_self" on public.requests
  for update to authenticated
  using (
    student_id = (select auth.uid())
    and status = 'submitted'
  )
  with check (
    student_id = (select auth.uid())
    and status in ('submitted','withdrawn')
  );

-- C4. Column-lock trigger: a NON-counselor UPDATE may change ONLY status
--     (submitted->withdrawn), withdrawn_at, deletion_requested_at. Any other
--     column delta -> RAISE. Order of allow-branches is unified with the profiles
--     trigger: NULL auth.uid() (service role / SECURITY DEFINER) is allowed
--     FIRST, then counselors, then the student rules. (Fixes the asymmetry where
--     the requests trigger would have RAISEd for trusted service-role writes,
--     since is_counselor() is FALSE for NULL uid.) BEFORE UPDATE so NEW vs OLD
--     is comparable. Column list matches the LIVE requests table exactly,
--     including the NOT NULL form_answers / form_schema_snapshot from 0002.
create or replace function private.lock_student_request_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Trusted server-side write (no JWT): allow. A student can never reach NULL uid
  -- (the student UPDATE policy is 'to authenticated').
  if (select auth.uid()) is null then
    return new;
  end if;

  -- Counselors keep full edit rights — they own the decision path.
  if private.is_counselor() then
    return new;
  end if;

  -- Student path: the only student-initiated status change is submitted->withdrawn.
  if new.status is distinct from old.status then
    if not (old.status = 'submitted' and new.status = 'withdrawn') then
      raise exception 'students may only withdraw a submitted request'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Lock every counselor/system-owned column to its prior value.
  if (new.student_id            is distinct from old.student_id)
     or (new.waiver_type_id     is distinct from old.waiver_type_id)
     or (new.course_list        is distinct from old.course_list)
     or (new.from_course        is distinct from old.from_course)
     or (new.to_course          is distinct from old.to_course)
     or (new.student_note       is distinct from old.student_note)
     or (new.transcript_data    is distinct from old.transcript_data)
     or (new.documents          is distinct from old.documents)
     or (new.recommendation     is distinct from old.recommendation)
     or (new.rule_version       is distinct from old.rule_version)
     or (new.student_snapshot   is distinct from old.student_snapshot)
     or (new.counselor_note     is distinct from old.counselor_note)
     or (new.decided_by         is distinct from old.decided_by)
     or (new.decided_at         is distinct from old.decided_at)
     or (new.submitted_at       is distinct from old.submitted_at)
     or (new.form_answers       is distinct from old.form_answers)
     or (new.form_schema_snapshot is distinct from old.form_schema_snapshot)
     or (new.consent_given_at   is distinct from old.consent_given_at)
     or (new.consent_version    is distinct from old.consent_version)
  then
    raise exception 'students may not edit counselor-owned request fields'
      using errcode = 'check_violation';
  end if;

  -- withdrawn_at may only be set (null -> ts) alongside the withdraw transition.
  if (new.withdrawn_at is distinct from old.withdrawn_at)
     and not (old.status = 'submitted' and new.status = 'withdrawn')
  then
    raise exception 'withdrawn_at may only be set when withdrawing'
      using errcode = 'check_violation';
  end if;

  return new;
end; $$;
revoke execute on function private.lock_student_request_fields() from public, anon;

drop trigger if exists trg_lock_student_request_fields on public.requests;
create trigger trg_lock_student_request_fields
  before update on public.requests
  for each row execute function private.lock_student_request_fields();


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0004_data_lifecycle_and_storage.sql
-- ████████████████████████████████████████████████████████████████████████
-- ════════════════════════════════════════════════════════════════════════════
-- 0004_data_lifecycle_and_storage.sql — data-rights + secure document storage
--
-- Adds the capabilities a K-12 district Data Sharing Agreement (FCS Exhibit B)
-- requires and that the auth slice did not yet have:
--   A) Provisioning hardening — handle_new_user() NEVER trusts a client-supplied
--      role. Closes the signUp({ data:{ role:'admin' } }) self-escalation path
--      that the old email/password flow allowed. New accounts are ALWAYS
--      'student'; staff are elevated only by an existing counselor.
--   B) Deletion — DELETE policies so a counselor can fulfil a parental deletion
--      request (DSA 6.5, within 10 days) and termination destruction (DSA 6.4,
--      within 45 days). Deleting a student profile cascades its requests via the
--      existing requests.student_id FK (ON DELETE CASCADE).
--   C) Storage — a PRIVATE 'documents' bucket for uploaded transcripts, with RLS
--      so a student touches only their own "<uid>/" folder and counselors read
--      (and can purge) all of them.
--
-- Prereqs (already live): 0001b base schema, 0002 form builder, 0003 ferpa
-- hardening. is_counselor() lives in schema private (security definer, stable),
-- reads profiles.role = 'admin'.
--
-- Idempotent (create or replace / drop ... if exists / on conflict do nothing).
-- PERMISSIONS NOTE: the storage.objects policies in section C may need to be run
-- from the Supabase Dashboard SQL editor (table owner) if `supabase db push`
-- reports a permission error on storage.objects.
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ A. PROVISIONING — never trust client-supplied role                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- 0001b copied role from raw_user_meta_data; combined with the old
-- signUpWithEmail(email, password, role) call, any client could self-assign
-- 'admin' at signup. New accounts are now ALWAYS 'student'; staff are elevated
-- by an existing counselor (profiles_update_counselor + the role/gpa/grade lock
-- trigger from 0003). Google Workspace SSO carries no role claim, so 'student' is
-- also the natural default for the SSO-only login.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    'student',  -- authoritative: never read role from client-controlled metadata
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- OPTIONAL — PRODUCTION DISTRICT-DOMAIN ENFORCEMENT (server-side, authoritative).
-- The client-side domain check in AuthProvider is UX ONLY: the OAuth callback
-- creates the auth.users row (and runs this trigger) BEFORE the client can react,
-- so the client can only hide a session, not prevent the account. The single
-- authoritative source of district-scope enforcement in production is the Google
-- Cloud OAuth consent screen set to "Internal" (Workspace-only). As defense in
-- depth you may ALSO hard-block non-district emails here — raising in this trigger
-- rolls back the auth.users insert cleanly. Keep it DISABLED while you still need
-- to sign in with a personal Google account to smoke-test. To enable, replace the
-- function body above so the insert is preceded by:
--
--   if split_part(new.email, '@', 2) <> 'YOUR-DISTRICT-DOMAIN.org' then
--     raise exception 'Sign-up restricted to district accounts';
--   end if;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ B. DELETION — counselor-fulfilled data destruction (DSA 6.4 / 6.5)        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- B1. Delete a single request (granular: one record on a parental request).
drop policy if exists "requests_delete_counselor" on public.requests;
create policy "requests_delete_counselor" on public.requests
  for delete to authenticated
  using (private.is_counselor());

-- B2. Delete a STUDENT profile (full purge). requests.student_id is
--     ON DELETE CASCADE, so this removes ALL of the student's requests in one
--     statement. Restricted to role='student' targets so a counselor cannot
--     delete staff profiles (which would also hit decided_by's NO ACTION FK).
drop policy if exists "profiles_delete_student_counselor" on public.profiles;
create policy "profiles_delete_student_counselor" on public.profiles
  for delete to authenticated
  using (private.is_counselor() and role = 'student');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ C. STORAGE — private 'documents' bucket for uploaded transcripts          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Students: full control of their OWN folder only. The object path convention is
-- "<auth.uid()>/<filename>", so foldername[1] must equal the caller's uid.
drop policy if exists "documents_student_own" on storage.objects;
create policy "documents_student_own" on storage.objects
  for all to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Counselors: read any uploaded document (review).
drop policy if exists "documents_counselor_read" on storage.objects;
create policy "documents_counselor_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and private.is_counselor());

-- Counselors: delete any document (purge support for DSA destruction).
drop policy if exists "documents_counselor_delete" on storage.objects;
create policy "documents_counselor_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and private.is_counselor());


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0005_waiver_window.sql
-- ████████████████████████████████████████████████████████████████████████
-- ════════════════════════════════════════════════════════════════════════════
-- 0005_waiver_window.sql — per-form submission window (open / close dates)
--
-- Adds an OPEN and CLOSE date to each waiver type so a counselor can schedule
-- when a form accepts submissions, and enforces that window server-side at the
-- requests INSERT. A null bound = unbounded (always-open / never-closes).
--
-- Prereqs (already live): 0001b base, 0002 form builder, 0003 ferpa, 0004
-- data lifecycle. is_counselor() lives in schema private.
--
-- Idempotent (add column if not exists / drop policy if exists). Safe inside a
-- begin; … rollback; probe.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.waiver_types
  add column if not exists open_at  date,
  add column if not exists close_at date;

-- Window enforcement. 0001b shipped requests_insert_own as a bare
-- student_id = auth.uid() check. This replaces it with one that ALSO requires
-- the target waiver type to be active and within its [open_at, close_at] window
-- (date-inclusive; a null bound is unbounded). A student therefore cannot insert
-- a request against an inactive, not-yet-open, or already-closed form — the
-- authoritative gate, mirrored by a friendly pre-check in the service layer.
drop policy if exists "requests_insert_own" on public.requests;
create policy "requests_insert_own" on public.requests
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.waiver_types wt
      where wt.id = waiver_type_id
        and wt.active
        and (wt.open_at  is null or current_date >= wt.open_at)
        and (wt.close_at is null or current_date <= wt.close_at)
    )
  );


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0006_per_form_rubric.sql
-- ████████████████████████████████████████████████████████████████████████
-- ════════════════════════════════════════════════════════════════════════════
-- 0006_per_form_rubric.sql — Per-form rubric + AI reference docs. Additive + idempotent.
--
-- Moves the AI scoring rubric from a single global set to a per-waiver-type set
-- (each form scores by its own rules) and adds a place to attach reference
-- material the AI consults when evaluating a form.
--
-- CONTRACT (matches the Form Builder UI):
--   * criteria = a NON-empty array  → the form is scored by those rules.
--   * criteria = an EMPTY array `[]` → the counselor deliberately cleared the
--     rubric; the request is sent to manual review (the engine produces no
--     automated admit/deny). The Form Builder states this explicitly.
--   * To keep EXISTING waiver types behaving as before (they were scored by the
--     global default rubric), the column DEFAULT is the full default rubric, so
--     `add column` backfills every pre-existing row with it. New rows created via
--     createWaiverType pass `criteria` explicitly; a deliberately-emptied form is
--     written as `[]` and therefore is NOT re-backfilled (the default only applies
--     when no value is supplied). `add column if not exists` makes this one-time
--     backfill idempotent — a re-run is a no-op and never refills an emptied form.
--
-- `reference_docs` is a CONFIG surface for now: descriptors are stored and shown
-- in the builder, but no retrieval/LLM pipeline reads them yet (a later slice).
-- The shape is stable so wiring retrieval later needs no migration.
--
-- Apply via the Supabase MCP apply_migration (name 'per_form_rubric_columns')
-- or paste into the SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.waiver_types
  add column if not exists criteria jsonb not null default '[
    {"id":"min-gpa","label":"Minimum cumulative GPA","type":"number","value":2.5,"enabled":true},
    {"id":"prior-credit","label":"Prior equivalent credit on transcript","type":"boolean","value":true,"enabled":true},
    {"id":"no-conflict","label":"No unresolved schedule conflict","type":"boolean","value":true,"enabled":true},
    {"id":"counselor-note","label":"Counselor note required on override","type":"boolean","value":false,"enabled":false},
    {"id":"min-attendance","label":"Minimum attendance rate %","type":"number","value":85,"enabled":true},
    {"id":"prereq-complete","label":"Prerequisite course completed","type":"boolean","value":true,"enabled":true},
    {"id":"within-window","label":"Within add/drop window","type":"boolean","value":false,"enabled":true}
  ]'::jsonb;
alter table public.waiver_types
  drop constraint if exists waiver_types_criteria_is_array;
alter table public.waiver_types
  add constraint waiver_types_criteria_is_array
  check (jsonb_typeof(criteria) = 'array');

alter table public.waiver_types
  add column if not exists reference_docs jsonb not null default '[]'::jsonb;
alter table public.waiver_types
  drop constraint if exists waiver_types_reference_docs_is_array;
alter table public.waiver_types
  add constraint waiver_types_reference_docs_is_array
  check (jsonb_typeof(reference_docs) = 'array');

-- RLS: NO NEW POLICY. The existing whole-row policies on waiver_types already
-- govern the new columns (RLS is row-level, not column-level):
--   waiver_types_manage_counselor (FOR ALL, private.is_counselor())  → counselor CRUD incl. criteria + reference_docs
--   waiver_types_select_all       (SELECT true)                      → students read the row; they never see the rubric UI


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0007_resources.sql
-- ████████████████████████████████████████████████████████████████████████
-- ════════════════════════════════════════════════════════════════════════════
-- 0007_resources.sql — Shared staff resource library. Additive + idempotent.
--
-- A school-wide shelf of reference documents counselors/teachers pull from
-- (course catalog, prerequisite matrix, eligibility policy, etc.). This is STAFF
-- material — NOT student records — so the whole table + bucket are gated to
-- counselors (private.is_counselor() == profiles.role = 'admin'). Students never
-- see it (no select policy for them), which keeps it cleanly outside FERPA's
-- education-record surface.
--
-- Files live in a private 'resources' storage bucket with FLAT keys
-- "<uuid>-<filename>" (shared shelf, so NOT the per-user-folder convention the
-- 'documents' bucket uses). Row metadata lives in public.resources; the file
-- bytes live in storage. deleteResource removes both.
--
-- Prereqs (already live): 0001b base schema (private.is_counselor()), 0004 storage.
--
-- Apply via the Supabase MCP apply_migration (name 'resources_library') or paste
-- into the SQL editor. NOTE (see 0004 lines 23-25): the storage.objects policies
-- in section C may need to be run from the dashboard SQL editor if the migration
-- runner reports a permission error on storage.objects.
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ A. TABLE — public.resources (metadata index over the storage bucket)      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create table if not exists public.resources (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category      text not null default 'other',
  description   text not null default '',
  file_name     text,
  storage_path  text,            -- key in the 'resources' bucket; null = link/note-only entry
  size          bigint not null default 0,
  content_type  text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists resources_created_at_idx on public.resources (created_at desc);
create index if not exists resources_category_idx on public.resources (category);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ B. RLS — counselors/admins only (full CRUD); everyone else: no access      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
alter table public.resources enable row level security;

drop policy if exists "resources_select_counselor" on public.resources;
create policy "resources_select_counselor" on public.resources
  for select to authenticated
  using (private.is_counselor());

drop policy if exists "resources_insert_counselor" on public.resources;
create policy "resources_insert_counselor" on public.resources
  for insert to authenticated
  with check (private.is_counselor());

drop policy if exists "resources_update_counselor" on public.resources;
create policy "resources_update_counselor" on public.resources
  for update to authenticated
  using (private.is_counselor())
  with check (private.is_counselor());

drop policy if exists "resources_delete_counselor" on public.resources;
create policy "resources_delete_counselor" on public.resources
  for delete to authenticated
  using (private.is_counselor());

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ C. STORAGE — private 'resources' bucket, counselor-only                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;

-- Counselors have full control of the shared shelf. No per-folder scoping — the
-- whole bucket is staff-only, so a single FOR ALL policy gated on is_counselor()
-- covers read/upload/delete. Students/anon get nothing (no matching policy).
drop policy if exists "resources_counselor_all" on storage.objects;
create policy "resources_counselor_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'resources' and private.is_counselor())
  with check (bucket_id = 'resources' and private.is_counselor());


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0008_one_roster.sql — IC OneRoster pull cache (field-minimized)
-- ████████████████████████████████████████████████████████████████████████
create table if not exists public.one_roster (
  student_id         uuid primary key references public.profiles(id) on delete cascade,
  sis_id             text,
  school_sourced_id  text,
  gpa                numeric(3,2),
  attendance_rate    int,
  grade_level        int,
  enrollment_status  text,
  last_sync          timestamptz,
  completed_courses  jsonb not null default '[]'::jsonb,
  current_schedule   jsonb not null default '[]'::jsonb,
  updated_at         timestamptz not null default now()
);
create index if not exists one_roster_sis_id_idx on public.one_roster (sis_id);
alter table public.one_roster enable row level security;
drop policy if exists "one_roster_select_counselor" on public.one_roster;
create policy "one_roster_select_counselor" on public.one_roster
  for select to authenticated using (private.is_counselor());
-- No insert/update/delete policy => writes are service-role (oneroster-pull) only.


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0009_batch_sync_queue.sql — IC push queue + push_state machine
-- ████████████████████████████████████████████████████████████████████████
create table if not exists public.batch_sync_queue (
  id                   uuid primary key default gen_random_uuid(),
  request_id           uuid references public.requests(id) on delete cascade,
  student_id           uuid references public.profiles(id) on delete set null,
  student_name         text,
  waiver_name          text,
  from_course          text,
  to_course            text,
  approved_at          timestamptz not null default now(),
  push_state           text not null default 'queued'
                       check (push_state in
                         ('queued','claimed','exported','imported','confirmed','failed','superseded')),
  idempotency_key      text,
  ic_record_ref        text,
  user_sourced_id      text,
  class_sourced_id     text,
  school_sourced_id    text,
  term_sourced_id      text,
  attempts             int not null default 0,
  last_error           text,
  claimed_at           timestamptz,
  exported_at          timestamptz,
  confirmed_at         timestamptz,
  revalidated_decision text,
  revalidated_at       timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists batch_sync_queue_push_state_idx on public.batch_sync_queue (push_state);
create index if not exists batch_sync_queue_request_idx     on public.batch_sync_queue (request_id);
create unique index if not exists batch_sync_queue_idem_active_uq
  on public.batch_sync_queue (idempotency_key)
  where idempotency_key is not null
    and push_state in ('queued','claimed','exported','imported','confirmed');
alter table public.batch_sync_queue enable row level security;
drop policy if exists "batch_sync_queue_select_counselor" on public.batch_sync_queue;
create policy "batch_sync_queue_select_counselor" on public.batch_sync_queue
  for select to authenticated using (private.is_counselor());
drop policy if exists "batch_sync_queue_insert_counselor_queued" on public.batch_sync_queue;
create policy "batch_sync_queue_insert_counselor_queued" on public.batch_sync_queue
  for insert to authenticated
  with check (private.is_counselor() and push_state = 'queued');
-- No update/delete policy => push_state transitions are service-role (edge fn) only.


-- ████████████████████████████████████████████████████████████████████████
-- ███ 0011_seat_holds.sql — atomic soft seat holds + claim_seat() RPC
-- ████████████████████████████████████████████████████████████████████████
create table if not exists public.seat_holds (
  id          uuid primary key default gen_random_uuid(),
  course      text not null,
  period      int  not null,
  request_id  uuid references public.requests(id) on delete cascade,
  student_id  uuid references public.profiles(id) on delete set null,
  held_at     timestamptz not null default now(),
  expires_at  timestamptz,
  released    boolean not null default false,
  unique (course, period, request_id)
);
create index if not exists seat_holds_course_period_idx
  on public.seat_holds (course, period) where not released;
alter table public.seat_holds enable row level security;
drop policy if exists "seat_holds_select_counselor" on public.seat_holds;
create policy "seat_holds_select_counselor" on public.seat_holds
  for select to authenticated using (private.is_counselor());

create or replace function public.claim_seat(
  p_course text, p_period int, p_request_id uuid, p_student_id uuid, p_capacity int default 30
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_active int; v_exists boolean;
begin
  if not private.is_counselor() then
    raise exception 'not authorized to claim a seat' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_course || '|' || p_period::text));
  select exists (
    select 1 from public.seat_holds
    where course = p_course and period = p_period and request_id = p_request_id and not released
      and (expires_at is null or expires_at > now())
  ) into v_exists;
  if v_exists then return jsonb_build_object('claimed', true, 'idempotent', true); end if;
  select count(*) into v_active from public.seat_holds
  where course = p_course and period = p_period and not released
    and (expires_at is null or expires_at > now());
  if v_active >= p_capacity then return jsonb_build_object('claimed', false, 'seats_left', 0); end if;
  insert into public.seat_holds (course, period, request_id, student_id, expires_at)
  values (p_course, p_period, p_request_id, p_student_id, now() + interval '14 days')
  on conflict (course, period, request_id)
    do update set released = false, held_at = now(), expires_at = excluded.expires_at;
  return jsonb_build_object('claimed', true, 'seats_left', p_capacity - v_active - 1);
end; $$;
revoke execute on function public.claim_seat(text, int, uuid, uuid, int) from public, anon;
grant execute on function public.claim_seat(text, int, uuid, uuid, int) to authenticated;

create or replace function public.release_seat_hold(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_counselor() then
    raise exception 'not authorized to release a seat' using errcode = '42501';
  end if;
  update public.seat_holds set released = true where request_id = p_request_id and not released;
end; $$;
revoke execute on function public.release_seat_hold(uuid) from public, anon;
grant execute on function public.release_seat_hold(uuid) to authenticated;


-- ████████████████████████████████████████████████████████████████████████
-- ███ ic-exports — private bucket for ephemeral PII push artifacts
-- ████████████████████████████████████████████████████████████████████████
-- Written by the sync-to-infinite-campus edge function (service role, RLS-exempt).
-- NO authenticated policy => browser clients cannot list/read it; access is only
-- via short-lived signed URLs the edge function mints. Auto-push delta artifacts are
-- DELETED at end of run; manual worklists are retained for the registrar (signed URL)
-- with a scheduled TTL purge as a tracked follow-up (breach-response-policy.md —
-- minimize PII at rest). Also mirrored as numbered migration 0012_ic_exports_bucket.sql.
insert into storage.buckets (id, name, public)
values ('ic-exports', 'ic-exports', false)
on conflict (id) do nothing;

