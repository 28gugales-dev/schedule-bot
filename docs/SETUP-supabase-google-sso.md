# Connecting Google SSO + Supabase — operator runbook

The code is wired for Google-Workspace-only sign-in, real document storage, and
data export/deletion. These are the **out-of-band steps** that only you can do to
make it live. Order matters.

> The automated test suite only exercises the demo (no-backend) path. Everything
> below is the **real** path and is **unverified by tests** — run the smoke test
> in step 7 against the live project.

## 1. Apply migration `0004_data_lifecycle_and_storage.sql`

```
supabase db push
```

If `db push` reports a permission error on `storage.objects`, paste **section C**
of the migration into the Supabase Dashboard → SQL Editor and run it there (the
SQL-editor role owns `storage.objects`). The migration creates the private
`documents` bucket and all RLS — confirm in Dashboard → Storage that `documents`
is **not public**.

## 2. Configure the Google OAuth app (this is the real district lock)

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID**
   → type **Web application**.
2. Authorized redirect URI:
   `https://bezdfmxetudovjbqceda.supabase.co/auth/v1/callback`
3. OAuth consent screen → **User type = Internal**. This — not the app — is what
   restricts sign-in to your Google Workspace org. The client-side domain check in
   `AuthProvider` is UX only.
4. Copy the **Client ID** and **Client Secret**.

## 3. Enable Google in Supabase

Dashboard → Authentication → Providers → **Google** → paste Client ID + Secret →
enable. Then Authentication → URL Configuration → set **Site URL** and add your
app origin (e.g. `http://localhost:5173` for dev, your prod URL for prod) to
**Redirect URLs**.

## 4. Environment variables (`.env.local`)

```
VITE_SUPABASE_URL=https://bezdfmxetudovjbqceda.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
VITE_ALLOWED_EMAIL_DOMAINS=forsyth.k12.ga.us
```

`VITE_ALLOWED_EMAIL_DOMAINS` is comma-separated; leave it empty to allow any
Google account while testing. Restart the dev server after editing.

## 5. Bootstrap the first counselor

Every new account is provisioned as **student** (the role is never taken from the
client — this is the fix for the old self-promotion hole). After the first staff
member signs in once, promote them in Dashboard → SQL Editor:

```sql
update public.profiles set role = 'admin'
where email = 'first.counselor@forsyth.k12.ga.us';
```

From then on, that counselor can elevate other staff in-app. **Skip this and the
counselor portal is unreachable.**

## 6. (Optional) Deploy the full-deletion edge function

`deleteStudentData()` destroys a student's records + documents (the FERPA
education-record destruction). To also remove the `auth.users` identity shell on
full account closure:

```
supabase functions deploy purge-student
```

It runs with the service-role key (auto-injected) and is gated to counselors.

## 7. Live smoke test (do this — tests can't)

- [ ] Sign in with a **district** Google account → lands in the **student** portal.
- [ ] Promote that account (step 5) → it now lands in the **counselor** portal,
      and does so on first paint (no student-portal flash).
- [ ] Sign in with a **non-district** Google account → rejected with the
      restriction message (requires either the Internal consent screen from step 2,
      or `VITE_ALLOWED_EMAIL_DOMAINS` set).
- [ ] As a student, upload a transcript → it lands in the **private** `documents`
      bucket under `<your-uid>/...` (Dashboard → Storage).
- [ ] As the counselor, open that document from the review screen → a fresh signed
      URL opens it.
- [ ] As a student, call **export my data** → JSON bundle of profile + requests.
- [ ] As the counselor, **delete a student** → their profile, requests, and
      documents are gone; the `record.delete` audit row is written.

## What enforcement actually rests on

| Control | Enforced by |
|---|---|
| District-only sign-in | Google OAuth consent screen = **Internal** (authoritative); app domain check is UX |
| MFA | District's Google Workspace identity provider (upstream) |
| No self-promotion to counselor | `handle_new_user` hardcodes `student`; role/gpa/grade lock trigger |
| Student sees only own data | Postgres RLS (`profiles`, `requests`, `storage.objects`) |
| Data destruction | `deleteStudentData` (records) + `purge-student` edge fn (identity) |
