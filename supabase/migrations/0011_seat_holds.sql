-- ════════════════════════════════════════════════════════════════════════════
-- 0011_seat_holds.sql — Atomic SOFT seat holds for approved placements.
-- Additive + idempotent.
--
-- WHY: today's demo seat check (src/utils/seatAvailability.js) is a non-atomic
-- read-then-write — two counselors admitting the last seat in the same
-- course+period both "succeed" because nothing serializes the check against the
-- claim. This migration replaces that with claim_seat(), a check-and-insert that
-- is atomic under concurrency via a per-(course,period) transaction advisory lock.
--
-- SOFT HOLD, NOT SOURCE OF TRUTH: Infinite Campus's section `Max Students` is the
-- real authority and is enforced server-side by IC on import. A hold here is an
-- in-app reservation that prevents US from over-promising before the push; at push
-- time the edge function reconciles against a FRESH OneRoster read of the class and
-- IC wins. Holds therefore carry an expiry and are explicitly documented as soft.
--
-- Prereqs (already live): 0001b base schema (private.is_counselor(), profiles).
-- Apply via Supabase MCP apply_migration (name 'seat_holds') or the SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ A. TABLE                                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create table if not exists public.seat_holds (
  id          uuid primary key default gen_random_uuid(),
  course      text not null,
  period      int  not null,
  request_id  uuid references public.requests(id) on delete cascade,
  student_id  uuid references public.profiles(id) on delete set null,
  held_at     timestamptz not null default now(),
  expires_at  timestamptz,                       -- soft hold lifetime
  released    boolean not null default false,    -- freed on drop / supersede / deny
  -- One hold per (course, period) per request makes a retried claim idempotent.
  unique (course, period, request_id)
);

create index if not exists seat_holds_course_period_idx
  on public.seat_holds (course, period) where not released;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ B. RLS — counselors may READ holds; all WRITES go through the RPCs below   ║
-- ║    (security definer), so no direct insert/update/delete policy exists.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
alter table public.seat_holds enable row level security;

drop policy if exists "seat_holds_select_counselor" on public.seat_holds;
create policy "seat_holds_select_counselor" on public.seat_holds
  for select to authenticated
  using (private.is_counselor());

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ C. claim_seat() — ATOMIC check-and-insert                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Returns jsonb { claimed: bool, seats_left?: int, idempotent?: bool }.
-- Atomicity: a per-(course,period) transaction-scoped advisory lock serializes
-- concurrent claims for the same seat, so the count→capacity check and the insert
-- are one indivisible step. The lock is released automatically at txn commit (an
-- RPC call is its own transaction). security definer so it can write past RLS;
-- the caller is still verified to be a counselor.
create or replace function public.claim_seat(
  p_course text,
  p_period int,
  p_request_id uuid,
  p_student_id uuid,
  p_capacity int default 30
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_active int;
  v_exists boolean;
begin
  if not private.is_counselor() then
    raise exception 'not authorized to claim a seat' using errcode = '42501';
  end if;

  -- Serialize same-seat claimants. hashtext is stable per (course|period).
  perform pg_advisory_xact_lock(hashtext(p_course || '|' || p_period::text));

  -- Idempotent retry: this request already holds a LIVE (unreleased, unexpired)
  -- seat here. An expired-but-unreleased or released row falls through to the
  -- reactivate path below (it must NOT short-circuit as already-held).
  select exists (
    select 1 from public.seat_holds
    where course = p_course and period = p_period
      and request_id = p_request_id and not released
      and (expires_at is null or expires_at > now())
  ) into v_exists;
  if v_exists then
    return jsonb_build_object('claimed', true, 'idempotent', true);
  end if;

  select count(*) into v_active
  from public.seat_holds
  where course = p_course and period = p_period
    and not released
    and (expires_at is null or expires_at > now());

  if v_active >= p_capacity then
    return jsonb_build_object('claimed', false, 'seats_left', 0);
  end if;

  -- The only reachable conflict is a released/expired row for this same
  -- (course,period,request) — a live hold was already short-circuited above. So
  -- REACTIVATE it (do nothing would silently leave it released → over-promise).
  insert into public.seat_holds (course, period, request_id, student_id, expires_at)
  values (p_course, p_period, p_request_id, p_student_id, now() + interval '14 days')
  on conflict (course, period, request_id)
    do update set released = false, held_at = now(), expires_at = excluded.expires_at;

  return jsonb_build_object('claimed', true, 'seats_left', p_capacity - v_active - 1);
end;
$$;

revoke execute on function public.claim_seat(text, int, uuid, uuid, int) from public, anon;
grant execute on function public.claim_seat(text, int, uuid, uuid, int) to authenticated;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ D. release_seat_hold() — free a hold on drop / deny / supersede            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create or replace function public.release_seat_hold(p_request_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_counselor() then
    raise exception 'not authorized to release a seat' using errcode = '42501';
  end if;
  update public.seat_holds set released = true
  where request_id = p_request_id and not released;
end;
$$;

revoke execute on function public.release_seat_hold(uuid) from public, anon;
grant execute on function public.release_seat_hold(uuid) to authenticated;
