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
