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
