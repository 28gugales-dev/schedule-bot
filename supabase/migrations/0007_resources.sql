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
