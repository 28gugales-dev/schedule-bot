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
