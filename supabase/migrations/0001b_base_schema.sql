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
