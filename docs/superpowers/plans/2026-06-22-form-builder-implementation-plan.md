# Dynamic Form Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let counselors author custom per-waiver-type forms that students fill out during intake and counselors review, without touching the AI rubric engine.

**Architecture:** AUGMENT model — custom fields are additive, never a replacement. The existing student wizard (transcript, course list, swap) and the `evaluateAgainstRubric` engine stay byte-for-byte unchanged; custom answers travel in a separate `formAnswers` namespace that never reaches the engine. A single shared `FieldRenderer.jsx` drives the 11-type render switch (editable in the student wizard, read-only in the builder preview), and counselor review renders exclusively from a frozen `form_schema_snapshot` taken at submit, so later edits cannot corrupt history.

**Tech Stack:** React + react-router, Tailwind (glass/enterprise skin tokens), Supabase (Postgres JSONB columns + RLS) with a demo-mode mirror in `services/api.js`/`mockData.js`, Vitest (Layer-A pure-logic tests only — no jsdom), gstack-browse for manual QA.

---

## Plan structure

This is the **single authoritative plan**, executed top-to-bottom in three parts:

- **Part A (Tasks 1–30)** — migrations, the pure engine (`utils/formSchema.js`), `FieldRenderer`, the gateway + mock data, and the student intake wizard.
- **Part B (Tasks B1–B9)** — the counselor Form Builder UI (`/admin/forms`): shared `Toggle`/`countFields`, route + nav, scaffold + left rail, meta editor, field add/reorder/delete, save + `validateSchema` gate, `FieldConfigPanel`, manual QA.
- **Part C (Tasks C1–C5)** — counselor review integration (`formatAnswer`, `ReviewDetail` custom answers + M2 double-render fix), the RubricBuilder one-writer handoff + shared `makeUniqueId` migration (M1), the submit-time inactive re-check (spec §9 R5), and final whole-slice verification.

The earlier per-group files (`…-form-builder-counselor-ui.md`, `…-formSchema-engine-plan.md`) were consolidated into this file and removed.

## File structure

### Create
| File | Responsibility |
|---|---|
| `supabase/migrations/0001b_base_schema.sql` | Backfill: idempotent `CREATE` for profiles/waiver_types/requests + `private.is_counselor()` + handle_new_user trigger + RLS policies (already live as `20260622114419`; repo-doc only). |
| `supabase/migrations/0002_form_builder.sql` | Add `form_schema` (waiver_types), `form_answers` + `form_schema_snapshot` (requests) + 3 JSONB type-guard constraints; no new RLS policy (D12). |
| `src/utils/formSchema.js` | Pure engine: `FIELD_REGISTRY`, `createDefaultField`, `buildDefaults`, `validateForm`, `validateSchema`, `makeUniqueId`, `slugifyWaiverId`, `buildFormAnswers`, `countFields`. |
| `src/utils/__tests__/formSchema.test.js` | Layer-A pure tests (FIELD_REGISTRY, makeUniqueId/slugifyWaiverId, createDefaultField, buildDefaults T1-3, validateForm T4-9, validateSchema T10-13, buildFormAnswers, countFields). |
| `src/features/forms/FieldRenderer.jsx` | The 11-type controlled render switch + `FieldShell` a11y scaffold. Editable in wizard, read-only in builder preview. |
| `src/utils/formatAnswer.js` | Pure presenter: one custom-field answer → display string for counselor review (yesNo→Yes/No, choice value→option label, multiCheckbox join, empty→em-dash). |
| `src/utils/__tests__/formatAnswer.test.js` | Layer-A pure tests for `formatAnswer`. |
| `src/services/__tests__/customFields.parity.test.js` | Demo↔Supabase parity + AI-isolation + backward-compat tests (diffWaiverType, T16/T17, T25-T27, T29). |
| `src/components/ui/Toggle.jsx` | Shared accessible toggle switch (extracted verbatim from RubricBuilder; used by FormBuilder, FieldConfigPanel, RubricBuilder). |
| `src/features/admin-review/FormBuilder.jsx` | `/admin/forms` page: master/detail, load via `fetchAllWaivers`, CRUD via gateway, validateSchema-gated save + toast, preview. |
| `src/features/admin-review/FieldConfigPanel.jsx` | Per-field config form (§6c matrix + options editor; read-only frozen field id). |

### Modify
| File | Change |
|---|---|
| `src/services/mockData.js` | `formSchema: []` on 8 seeds + one populated `medical-exemption` demo type; one demo submission (`req-2000`) with `formAnswers` + `formSchemaSnapshot`. |
| `src/services/api.js` | Bump `SEED_VERSION` `'1'→'2'`; `diffWaiverType` audit helper; demo bodies `createWaiverType`/`updateWaiverType`/`deleteWaiverType`/`fetchWaiverTypeForm`; `submitWaiver` stamps `formSchemaSnapshot` + adds `formAnswers`/`formSchemaSnapshot` to the queue literal (M3). |
| `src/services/supabaseApi.js` | Extract `rowToWaiverType` (+`formSchema`); add `formAnswers`/`formSchemaSnapshot` to `rowToSubmission`/`rowToQueueRow`; new `createWaiverType`/`updateWaiverType`/`deleteWaiverType`/`fetchWaiverTypeForm`; `submitWaiver` insertRow gains `form_answers` + frozen `form_schema_snapshot`. |
| `src/features/student-portal/WaiverIntake.jsx` | `steps` useMemo replacing `STEPS`; key-based gating; `customAnswers`/`customErrors` state; conditional custom step mounting `FieldRenderer`; validate-on-Continue + focus-first-error; file merge + `formAnswers` in submit payload; `reset()` clears new state. |
| `src/routes/router.jsx` | Import `FormBuilder` + `{ path:'forms', element:<FormBuilder/> }` under `/admin`. |
| `src/components/layout/navConfig.jsx` | `Form Builder` nav entry in the `admin`/`Review` group + `IconForm` SVG. |
| `src/features/admin-review/RubricBuilder.jsx` | Waiver section → read-only summary + "Manage in Form Builder →" link; `handleSave` persists only criteria; extract inline `Toggle`→`components/ui/Toggle.jsx`; replace local `makeUniqueId` with the shared `utils/formSchema` one (Set→array call sites). |
| `src/features/admin-review/ReviewDetail.jsx` | Add `<CustomAnswers>` sub-block in `SubmissionBlock` + `RawSubmission` rendering snapshot×answers; filter `custom-field:*` out of both Documents loops (M2). |
| `src/services/api.js` (existing convention reference) | `supabase/migrations/0001_audit.sql` unchanged — numeric-filename convention reference. |

---

## Build order & dependencies

Execute in this order: **migrations → engine → renderer → gateway/mockdata → intake → builder → review → final verification.**

Why: the migrations create the DB columns every persistence path depends on. The engine (`utils/formSchema.js`) is the shared contract module — `FieldRenderer`, the gateway, `WaiverIntake`, `FormBuilder`, and `RubricBuilder` all import from it, so it must land first (a signature drift here breaks every downstream group). `FieldRenderer` is the render seam consumed by both the student wizard and the builder preview, so it precedes both. The gateway + mock data wire the new columns through both backends (and bump `SEED_VERSION`) so the UI surfaces have real data to read/write. Intake (student write path) and builder (counselor authoring) consume the renderer + gateway. Review (counselor read path) consumes the frozen snapshot the gateway stamps and the shared `Toggle` the builder creates. Final verification runs the full suite + build + end-to-end manual QA last.

Cross-group notes baked into the sequence:
- `Toggle.jsx` is created once (Part B, Task B1); Part C (Task C3) only re-points RubricBuilder's import to it (no second creation).
- `buildFormAnswers` is authored as a dedicated engine task (Part A, Task 13) before its only binding consumer (intake, Task 28's submit task), with the signature pinned to `relinkFn(fieldId) -> descriptor|null` (matches spec §7d and intake's call shape).
- `makeUniqueId` is authored once in the engine (Part A); Part C (Task C3) swaps RubricBuilder's local copy for the shared import and adds an optional `prefix` arg so RubricBuilder keeps its `crit-` id format (M1).

---

## Task 1 — Backfill base schema (`0001b_base_schema.sql`)

This is a repo-documentation backfill. The DDL it contains is ALREADY applied to the live project as migration `20260622114419`. This task creates a tracked SQL file only. It MUST NOT be applied to the live DB (re-running `create policy` / `create trigger` against live would error or duplicate).

**Files**
- Create: `c:\My projects Main\Schedule AI\schedule-bot\supabase\migrations\0001b_base_schema.sql`
- Test: none (SQL repo-doc; no runtime path)

Steps:

- [ ] **Step 1: Write `0001b_base_schema.sql` with the verbatim live DDL, made idempotent where safe.**
  Create `c:\My projects Main\Schedule AI\schedule-bot\supabase\migrations\0001b_base_schema.sql` with EXACTLY this content. Semantics are unchanged from the live migration `20260622114419`; only safe idempotency guards (`if not exists`, `drop … if exists`, `create or replace`) are added. The header explicitly states this file is already applied and must not be re-applied:

```sql
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
```

  Idempotency notes (semantics preserved, do NOT deviate):
  - `create table` → `create table if not exists`.
  - `create index` → `create index if not exists`.
  - `create policy` → preceded by `drop policy if exists` (Postgres has no `create policy if not exists`). This is the only safe idempotent form.
  - `create trigger` → preceded by `drop trigger if exists` (no `create or replace trigger` in this PG version idiom; drop-then-create is safe and semantics-preserving).
  - Functions already use `create or replace` in the live DDL — kept verbatim.
  - `revoke … from public, anon` and `grant … to authenticated` are naturally idempotent — kept verbatim.
  - `alter table … enable row level security` is idempotent — kept verbatim.

- [ ] **Step 2: Verify the file was written and contains all 6 policies + both functions + 3 tables.**
  Run (Bash tool, from repo root) — expected output lists the file and shows the grep counts:
  ```bash
  ls -l "c:/My projects Main/Schedule AI/schedule-bot/supabase/migrations/0001b_base_schema.sql" \
    && grep -c "create policy" "c:/My projects Main/Schedule AI/schedule-bot/supabase/migrations/0001b_base_schema.sql" \
    && grep -c "create table if not exists" "c:/My projects Main/Schedule AI/schedule-bot/supabase/migrations/0001b_base_schema.sql"
  ```
  Expected: file exists; first count = `6` (six policies); second count = `3` (three tables). If counts differ, re-check the file content against Step 1 before committing.

- [ ] **Step 3: Commit the backfill file.**
  This is a repo-doc-only commit — no live DB change. Run (PowerShell tool):
  ```
  git add "supabase/migrations/0001b_base_schema.sql"; if ($?) { git commit -m @'
Backfill base schema migration (0001b)

Capture the live auth-slice DDL (profiles/waiver_types/requests, private.is_counselor,
handle_new_user trigger, RLS policies) as a tracked, idempotent migration so the chain is
reproducible on a clean project. Already applied to live as 20260622114419 — this file is
repo documentation only and is NOT re-applied to the live DB.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
'@ }
  ```

---

## Task 2 — Form-builder columns migration (`0002_form_builder.sql`)

Additive columns + 3 `jsonb_typeof` check constraints. Idempotent (`add column if not exists`; `drop constraint if exists` then `add constraint`). No new RLS policy (D12 — existing whole-row policies govern the new JSONB columns). This task creates the file only; Task 3 applies it.

**Files**
- Create: `c:\My projects Main\Schedule AI\schedule-bot\supabase\migrations\0002_form_builder.sql`
- Test: none (SQL ops file)

Steps:

- [ ] **Step 1: Write `0002_form_builder.sql` with the additive columns + type guards.**
  Create `c:\My projects Main\Schedule AI\schedule-bot\supabase\migrations\0002_form_builder.sql` with EXACTLY this content (matches spec §4e draft + D12 comment block; `form_schema_snapshot` stays `jsonb` per R-m1):

```sql
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
```

- [ ] **Step 2: Verify the file content.**
  Run (Bash tool) — expected: file exists; 3 columns referenced; 3 check constraints; zero `create policy` lines:
  ```bash
  ls -l "c:/My projects Main/Schedule AI/schedule-bot/supabase/migrations/0002_form_builder.sql" \
    && grep -c "add column if not exists" "c:/My projects Main/Schedule AI/schedule-bot/supabase/migrations/0002_form_builder.sql" \
    && grep -c "add constraint" "c:/My projects Main/Schedule AI/schedule-bot/supabase/migrations/0002_form_builder.sql" \
    && grep -c "create policy" "c:/My projects Main/Schedule AI/schedule-bot/supabase/migrations/0002_form_builder.sql"
  ```
  Expected: file exists; first count = `3` (form_schema, form_answers, form_schema_snapshot); second count = `3` (the three check constraints); third count = `0` (no new policy, D12). If any count is off, fix before committing.

- [ ] **Step 3: Commit the migration file (file only — not yet applied to live).**
  Run (PowerShell tool):
  ```
  git add "supabase/migrations/0002_form_builder.sql"; if ($?) { git commit -m @'
Add form-builder columns migration (0002)

Additive, idempotent: waiver_types.form_schema (jsonb default []),
requests.form_answers (jsonb default {}), requests.form_schema_snapshot (jsonb default []),
each with a jsonb_typeof check constraint. No new RLS policy (D12) — existing whole-row
policies govern the new JSONB columns. Backward-compatible by construction (defaults keep
the legacy wizard + AI rubric paths unchanged). Applied to live separately.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
'@ }
  ```

---

## Task 3 — Apply `0002` to the LIVE project (the only live-DB mutation)

This is the single task that mutates the live database. Apply the contents of `0002_form_builder.sql` via the Supabase MCP `apply_migration` tool (migration name `form_builder_columns`, project `bezdfmxetudovjbqceda`), then verify the 3 columns exist. Do NOT apply `0001b` (already live as `20260622114419`).

**Files**
- Modify (live DB only — no repo file change): project `bezdfmxetudovjbqceda` schema `public` (adds 3 columns + 3 constraints)
- Test: none (verification is a live `information_schema` SELECT)

Steps:

- [ ] **Step 1: Apply migration `0002` to the live project via `apply_migration`.**
  Call the Supabase MCP tool `mcp__plugin_supabase_supabase__apply_migration` with:
  - `project_id`: `bezdfmxetudovjbqceda`
  - `name`: `form_builder_columns`
  - `query`: the FULL SQL body from Task 2 Step 1 (the entire `0002_form_builder.sql` content above — every `alter table` statement; the leading comment header may be included or omitted, it is inert).

  Exact `query` to pass:
  ```sql
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
  ```
  Expected: `apply_migration` returns success (no error). It registers a new migration version named `form_builder_columns` in the migration history.

- [ ] **Step 2: Verify the 3 columns now exist (live SELECT).**
  Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id`: `bezdfmxetudovjbqceda` and `query`:
  ```sql
  select table_name, column_name, data_type, column_default
  from information_schema.columns
  where table_schema='public'
    and ((table_name='waiver_types' and column_name='form_schema')
      or (table_name='requests' and column_name in ('form_answers','form_schema_snapshot')))
  order by table_name, column_name;
  ```
  Expected output — exactly 3 rows (this same query returned `[]` before the apply):
  ```
  requests      | form_answers          | jsonb | '{}'::jsonb
  requests      | form_schema_snapshot  | jsonb | '[]'::jsonb
  waiver_types  | form_schema           | jsonb | '[]'::jsonb
  ```
  All three `data_type` = `jsonb`. If fewer than 3 rows return, the apply failed — re-run Step 1.

- [ ] **Step 3 (optional belt-and-suspenders): Verify the 3 check constraints exist.**
  Call `mcp__plugin_supabase_supabase__execute_sql` with `project_id`: `bezdfmxetudovjbqceda` and `query`:
  ```sql
  select conname
  from pg_constraint
  where conname in (
    'waiver_types_form_schema_is_array',
    'requests_form_answers_is_object',
    'requests_form_schema_snapshot_is_array'
  )
  order by conname;
  ```
  Expected output — exactly 3 rows:
  ```
  requests_form_answers_is_object
  requests_form_schema_snapshot_is_array
  waiver_types_form_schema_is_array
  ```

- [ ] **Step 4: Note — no repo commit for this task.**
  `apply_migration` mutates only the live DB + remote migration history; it does not change repo files (the tracked `0002_form_builder.sql` was already committed in Task 2 Step 3). The remote migration history will now show two versions: `20260622114419_auth_slice_schema_rls` and the new `form_builder_columns`. No further git action.

> **Migrations notes for the implementer:** `0001b` is documentation/reproducibility only — NEVER apply it to live (would attempt to re-create live objects). Only Task 3 mutates the live DB, and only with the `0002` body. Repo migration filenames (`0001b_`, `0002_`) follow the existing `0001_audit.sql` numeric convention; the remote MCP migration-history *version* name for Task 3 is `form_builder_columns` (the MCP assigns its own timestamp version), which is expected and harmless. TS-type generation is intentionally skipped (app is plain JS).

---

## Task 4 — Engine scaffold: empty module + test file

**Source of truth:** `docs/superpowers/specs/2026-06-22-form-builder-design.md` (read in full). This task group authors the SHARED CONTRACT module — everything else imports it; signatures MUST match the locked interface contract character-for-character.

**Scoped test command (NOT `npm test`):** `npx vitest run src/utils/__tests__/formSchema.test.js`

**TDD loop per step:** write failing test → run (expect FAIL) → minimal impl (FULL code shown) → run (expect PASS) → commit.

**Conventions (locked, used in every engine task):**
- Test file imports: `import { describe, it, expect } from 'vitest'` then named imports from `'../formSchema.js'`.
- The module is PURE: no DOM, no React imports, no side effects.
- Empty-value definition (validateForm + buildDefaults agree): `v == null || v === '' || (Array.isArray(v) && v.length === 0)`. `yesNo:false` and `number:0` are ANSWERED, not empty.
- Literal error strings (tests assert verbatim): `"This field is required."`, `"Choose a valid option."`. Other messages (number range, date, maxLength) are author's choice but must match between test and impl.
- `validateSchema` does NOT check waiver name (contract: "waiver name checked in builder").
- INTERPRETATION FLAG — `file` emptyValue: the contract's `emptyValue` enumeration omits `file`. This plan sets `FIELD_REGISTRY.file.emptyValue = () => null` (defined fallback; no test asserts the value). FieldRenderer holds file as `File[]` in component state separately.

**Files**
- Create: `src/utils/formSchema.js`
- Create test: `src/utils/__tests__/formSchema.test.js`

Steps:

- [ ] **Step 1: Create the empty test file with a single placeholder import that will fail.** Write `src/utils/__tests__/formSchema.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { FIELD_REGISTRY } from '../formSchema.js'

describe('formSchema module', () => {
  it('exports FIELD_REGISTRY', () => {
    expect(FIELD_REGISTRY).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL (module resolution error).** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `Failed to resolve import "../formSchema.js"` (the file does not exist yet). This is the expected first red: a resolution error, not an assertion failure.

- [ ] **Step 3: Create the module stub so the import resolves.** Write `src/utils/formSchema.js`:

```js
// Pure form-schema engine. The shared contract module imported by the form
// builder, the student wizard renderer, the gateway, and the review screen.
// No DOM, no React, no side effects — everything here is unit-testable.

export const FIELD_REGISTRY = {}
```

- [ ] **Step 4: Run the test — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS (1 passed). The export exists; the placeholder assertion `toBeTruthy()` passes because `{}` is truthy.

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: scaffold pure engine module + Layer-A test file

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Engine `FIELD_REGISTRY` (the type metadata table)

Registry shape per type: `{ type, label, isDisplayOnly:boolean, hasOptions:boolean, emptyValue:()=>any }`. `emptyValue` for display-only types is irrelevant (they have no answer key) — define it as `() => undefined` so `buildDefaults` can skip via `isDisplayOnly`.

**Files**
- Modify test: `src/utils/__tests__/formSchema.test.js` (replace placeholder describe block)
- Modify: `src/utils/formSchema.js` (replace `export const FIELD_REGISTRY = {}`)

Steps:

- [ ] **Step 1: Replace the placeholder test with the full FIELD_REGISTRY test block.** In `src/utils/__tests__/formSchema.test.js`, replace the entire `describe('formSchema module', ...)` block with:

```js
describe('FIELD_REGISTRY', () => {
  const ALL_TYPES = [
    'shortText', 'longText', 'number', 'date', 'select', 'radio',
    'multiCheckbox', 'yesNo', 'file', 'sectionHeader', 'helpText',
  ]

  it('has an entry for all 11 field types and nothing else', () => {
    expect(Object.keys(FIELD_REGISTRY).sort()).toEqual([...ALL_TYPES].sort())
  })

  it('each entry carries type, label, isDisplayOnly, hasOptions, and an emptyValue function', () => {
    for (const type of ALL_TYPES) {
      const meta = FIELD_REGISTRY[type]
      expect(meta.type).toBe(type)
      expect(typeof meta.label).toBe('string')
      expect(meta.label.length).toBeGreaterThan(0)
      expect(typeof meta.isDisplayOnly).toBe('boolean')
      expect(typeof meta.hasOptions).toBe('boolean')
      expect(typeof meta.emptyValue).toBe('function')
    }
  })

  it('marks sectionHeader and helpText as the only display-only types', () => {
    const displayOnly = ALL_TYPES.filter((t) => FIELD_REGISTRY[t].isDisplayOnly)
    expect(displayOnly.sort()).toEqual(['helpText', 'sectionHeader'])
  })

  it('marks select, radio, and multiCheckbox as the only types with options', () => {
    const withOptions = ALL_TYPES.filter((t) => FIELD_REGISTRY[t].hasOptions)
    expect(withOptions.sort()).toEqual(['multiCheckbox', 'radio', 'select'])
  })

  it('emptyValue returns the correct empty per type', () => {
    expect(FIELD_REGISTRY.shortText.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.longText.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.number.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.date.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.select.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.radio.emptyValue()).toBe('')
    expect(FIELD_REGISTRY.yesNo.emptyValue()).toBe(false)
    expect(FIELD_REGISTRY.multiCheckbox.emptyValue()).toEqual([])
  })

  it('emptyValue for multiCheckbox returns a fresh array each call (no shared reference)', () => {
    const a = FIELD_REGISTRY.multiCheckbox.emptyValue()
    const b = FIELD_REGISTRY.multiCheckbox.emptyValue()
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `Object.keys(FIELD_REGISTRY)` is `[]`, so the first assertion fails; the per-type loop throws reading `.type` of `undefined`.

- [ ] **Step 3: Implement FIELD_REGISTRY.** In `src/utils/formSchema.js`, replace the line `export const FIELD_REGISTRY = {}` with:

```js
// Per-type metadata. emptyValue is a factory (not a constant) so callers always
// get a fresh value — critical for multiCheckbox so fields never share one array.
// emptyValue for file is not built into the answer map by buildDefaults (files
// live in component File[] state and become descriptors at submit), so it returns
// null here purely as a defined fallback. Display-only types never get an answer
// key, so their emptyValue is never read.
export const FIELD_REGISTRY = {
  shortText:     { type: 'shortText',     label: 'Short text',     isDisplayOnly: false, hasOptions: false, emptyValue: () => '' },
  longText:      { type: 'longText',      label: 'Long text',      isDisplayOnly: false, hasOptions: false, emptyValue: () => '' },
  number:        { type: 'number',        label: 'Number',         isDisplayOnly: false, hasOptions: false, emptyValue: () => '' },
  date:          { type: 'date',          label: 'Date',           isDisplayOnly: false, hasOptions: false, emptyValue: () => '' },
  select:        { type: 'select',        label: 'Dropdown',       isDisplayOnly: false, hasOptions: true,  emptyValue: () => '' },
  radio:         { type: 'radio',         label: 'Single choice',  isDisplayOnly: false, hasOptions: true,  emptyValue: () => '' },
  multiCheckbox: { type: 'multiCheckbox', label: 'Multiple choice', isDisplayOnly: false, hasOptions: true,  emptyValue: () => [] },
  yesNo:         { type: 'yesNo',         label: 'Yes / No',       isDisplayOnly: false, hasOptions: false, emptyValue: () => false },
  file:          { type: 'file',          label: 'File upload',    isDisplayOnly: false, hasOptions: false, emptyValue: () => null },
  sectionHeader: { type: 'sectionHeader', label: 'Section header', isDisplayOnly: true,  hasOptions: false, emptyValue: () => undefined },
  helpText:      { type: 'helpText',      label: 'Help text',      isDisplayOnly: true,  hasOptions: false, emptyValue: () => undefined },
}
```

- [ ] **Step 4: Run — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS (all FIELD_REGISTRY tests green).

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: add FIELD_REGISTRY type metadata table

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Engine `makeUniqueId` (T13) — ported, NOT verbatim, from RubricBuilder

Contract signature: `makeUniqueId(label, existingIds) -> string`. `existingIds` is an ARRAY. No `crit-` prefix. Deterministic `'field'` fallback for an empty slug. Collision numbering starts at `-2`.

**Porting facts (verified against `RubricBuilder.jsx:99-110`):** RubricBuilder's `makeUniqueId` uses a `crit-` prefix, a `Set` arg with `.has()`, and a `Date.now()` empty-slug fallback. The contract version is DIFFERENT on all three: no prefix, array arg, deterministic `'field'` fallback. Keep RubricBuilder's from-2 collision numbering.

**Files**
- Modify test: `src/utils/__tests__/formSchema.test.js` (add import + describe block)
- Modify: `src/utils/formSchema.js` (add export)

Steps:

- [ ] **Step 1: Add `makeUniqueId` to the import and a describe block.** At the top of `src/utils/__tests__/formSchema.test.js`, change the named import line to:

```js
import { FIELD_REGISTRY, makeUniqueId } from '../formSchema.js'
```

Then append this describe block to the end of the file:

```js
describe('makeUniqueId', () => {
  it('slugifies a label to a lowercase dash-separated id with no prefix', () => {
    expect(makeUniqueId('Why are you requesting this?', [])).toBe('why-are-you-requesting-this')
  })

  it('collapses runs of non-alphanumerics and trims leading/trailing dashes', () => {
    expect(makeUniqueId('  Credits!!  earned  ', [])).toBe('credits-earned')
  })

  it('appends a numeric suffix starting at -2 on collision', () => {
    expect(makeUniqueId('Period', ['period'])).toBe('period-2')
  })

  it('keeps incrementing past existing suffixed ids', () => {
    expect(makeUniqueId('Period', ['period', 'period-2', 'period-3'])).toBe('period-4')
  })

  it('falls back to a deterministic "field" base when the slug is empty', () => {
    expect(makeUniqueId('!!!', [])).toBe('field')
    expect(makeUniqueId('', [])).toBe('field')
  })

  it('suffixes the fallback base on collision too', () => {
    expect(makeUniqueId('', ['field'])).toBe('field-2')
  })

  it('produces unique ids across a batch when threaded through an accumulator', () => {
    const taken = []
    const a = makeUniqueId('Reason', taken); taken.push(a)
    const b = makeUniqueId('Reason', taken); taken.push(b)
    const c = makeUniqueId('Reason', taken); taken.push(c)
    expect([a, b, c]).toEqual(['reason', 'reason-2', 'reason-3'])
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `makeUniqueId is not a function` (not exported yet).

- [ ] **Step 3: Implement `makeUniqueId` and the shared `slugify` helper.** In `src/utils/formSchema.js`, append:

```js
// Lowercase, dash-separated slug. Collapses non-alphanumerics, trims edge dashes.
function slugify(label) {
  return String(label || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Stable, collision-free field id from a label slug. Ported from RubricBuilder's
// makeUniqueId but WITHOUT the `crit-` prefix (field ids are bare slugs), taking
// an ARRAY of existing ids, and with a deterministic 'field' fallback (RubricBuilder
// used Date.now(), which is non-deterministic and untestable). Collision numbering
// starts at -2, matching RubricBuilder.
export function makeUniqueId(label, existingIds = []) {
  const taken = new Set(existingIds)
  const base = slugify(label) || 'field'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
```

- [ ] **Step 4: Run — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS (FIELD_REGISTRY + makeUniqueId green).

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: port makeUniqueId (bare slug, array arg, deterministic fallback)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Engine `slugifyWaiverId` (waiver-type id generator)

Contract signature: `slugifyWaiverId(name, existingIds) -> string`. Waiver-type ids are the TEXT pk (e.g. `medical-exemption`). Same slug+collision idiom as `makeUniqueId` but seeded from a waiver NAME and with a `waiver` fallback. Reuses the shared `slugify`.

**Files**
- Modify test: `src/utils/__tests__/formSchema.test.js` (add import + describe block)
- Modify: `src/utils/formSchema.js` (add export)

Steps:

- [ ] **Step 1: Add `slugifyWaiverId` to the import and a describe block.** Change the named import line to:

```js
import { FIELD_REGISTRY, makeUniqueId, slugifyWaiverId } from '../formSchema.js'
```

Append this describe block:

```js
describe('slugifyWaiverId', () => {
  it('slugifies a waiver name to a lowercase dash-separated id', () => {
    expect(slugifyWaiverId('Medical Exemption', [])).toBe('medical-exemption')
  })

  it('appends a numeric suffix starting at -2 on collision', () => {
    expect(slugifyWaiverId('Medical Exemption', ['medical-exemption'])).toBe('medical-exemption-2')
  })

  it('falls back to a deterministic "waiver" base for an empty/symbol-only name', () => {
    expect(slugifyWaiverId('', [])).toBe('waiver')
    expect(slugifyWaiverId('###', [])).toBe('waiver')
  })

  it('suffixes the fallback base on collision', () => {
    expect(slugifyWaiverId('', ['waiver'])).toBe('waiver-2')
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `slugifyWaiverId is not a function`.

- [ ] **Step 3: Implement `slugifyWaiverId`.** In `src/utils/formSchema.js`, append:

```js
// Waiver-type id (the TEXT primary key). Same slug+collision idiom as
// makeUniqueId, seeded from the waiver NAME, with a 'waiver' fallback.
export function slugifyWaiverId(name, existingIds = []) {
  const taken = new Set(existingIds)
  const base = slugify(name) || 'waiver'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
```

- [ ] **Step 4: Run — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: add slugifyWaiverId for waiver-type text primary keys

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Engine `createDefaultField(type)` (default-field factory)

Contract signature: `createDefaultField(type) -> fieldDef`. ONE arg (uniqueness-on-append is the FormBuilder's job). Builds a type-appropriate field def; `id` via `makeUniqueId(label, [])`. Type-specific keys present only when meaningful.

**Files**
- Modify test: `src/utils/__tests__/formSchema.test.js` (add import + describe block)
- Modify: `src/utils/formSchema.js` (add export)

Steps:

- [ ] **Step 1: Add `createDefaultField` to the import and a describe block.** Change the named import line to:

```js
import { FIELD_REGISTRY, makeUniqueId, slugifyWaiverId, createDefaultField } from '../formSchema.js'
```

Append this describe block:

```js
describe('createDefaultField', () => {
  it('builds a shortText field with an id slugged from its default label', () => {
    const f = createDefaultField('shortText')
    expect(f.type).toBe('shortText')
    expect(f.label).toBe('Short text')
    expect(f.id).toBe('short-text')
    expect(f.required).toBe(false)
    expect(f.maxLength).toBeNull()
  })

  it('gives choice types a seeded options array with one option', () => {
    for (const type of ['select', 'radio', 'multiCheckbox']) {
      const f = createDefaultField(type)
      expect(Array.isArray(f.options)).toBe(true)
      expect(f.options.length).toBe(1)
      expect(f.options[0]).toHaveProperty('value')
      expect(f.options[0]).toHaveProperty('label')
    }
  })

  it('gives number fields null min/max/step', () => {
    const f = createDefaultField('number')
    expect(f.min).toBeNull()
    expect(f.max).toBeNull()
    expect(f.step).toBeNull()
  })

  it('gives file fields accept and multiple defaults', () => {
    const f = createDefaultField('file')
    expect(typeof f.accept).toBe('string')
    expect(f.multiple).toBe(false)
  })

  it('gives display-only types content and no required/answer semantics', () => {
    for (const type of ['sectionHeader', 'helpText']) {
      const f = createDefaultField(type)
      expect(f.type).toBe(type)
      expect(typeof f.content).toBe('string')
      expect(f).not.toHaveProperty('required')
      expect(f).not.toHaveProperty('options')
    }
  })

  it('does not put options on non-choice types', () => {
    expect(createDefaultField('shortText')).not.toHaveProperty('options')
    expect(createDefaultField('number')).not.toHaveProperty('options')
  })

  it('returns null for an unknown type', () => {
    expect(createDefaultField('bogus')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `createDefaultField is not a function`.

- [ ] **Step 3: Implement `createDefaultField`.** In `src/utils/formSchema.js`, append:

```js
// Factory for a fresh field definition with type-appropriate defaults. Single arg
// by contract: the FormBuilder handles uniqueness on append, so the id is slugged
// from the label against an empty list here. Type-specific keys are present ONLY
// when meaningful for that type (matches the spec's field-definition object).
export function createDefaultField(type) {
  const meta = FIELD_REGISTRY[type]
  if (!meta) return null

  // Display-only types: no required/options/answer keys — just body copy.
  if (meta.isDisplayOnly) {
    return {
      id: makeUniqueId(meta.label, []),
      type,
      label: meta.label,
      content: '',
    }
  }

  const field = {
    id: makeUniqueId(meta.label, []),
    type,
    label: meta.label,
    required: false,
    helpText: '',
  }

  if (meta.hasOptions) {
    field.options = [{ value: 'option-1', label: 'Option 1' }]
  }
  if (type === 'shortText' || type === 'longText') {
    field.placeholder = ''
    field.maxLength = null
  }
  if (type === 'number') {
    field.placeholder = ''
    field.min = null
    field.max = null
    field.step = null
  }
  if (type === 'file') {
    field.accept = '.pdf,.png,.jpg,.jpeg'
    field.multiple = false
  }

  return field
}
```

- [ ] **Step 4: Run — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: add createDefaultField factory (single-arg, type-appropriate defaults)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — Engine `buildDefaults(schema)` (T1, T2, T3)

Contract signature: `buildDefaults(schema) -> { [id]: emptyValue }`. Skips display-only types (no key). number→`''`, multiCheckbox→fresh `[]`, yesNo→`false`, others→`''`.

**Files**
- Modify test: `src/utils/__tests__/formSchema.test.js` (add import + describe block)
- Modify: `src/utils/formSchema.js` (add export)

Steps:

- [ ] **Step 1: Add `buildDefaults` to the import and a describe block (T1-T3).** Change the named import line to:

```js
import {
  FIELD_REGISTRY, makeUniqueId, slugifyWaiverId, createDefaultField, buildDefaults,
} from '../formSchema.js'
```

Append this describe block:

```js
describe('buildDefaults', () => {
  it('T1: produces a per-type empty default for every input type', () => {
    const schema = [
      { id: 'a', type: 'shortText', label: 'A' },
      { id: 'b', type: 'longText', label: 'B' },
      { id: 'c', type: 'number', label: 'C' },
      { id: 'd', type: 'date', label: 'D' },
      { id: 'e', type: 'select', label: 'E', options: [{ value: 'x', label: 'X' }] },
      { id: 'f', type: 'radio', label: 'F', options: [{ value: 'x', label: 'X' }] },
      { id: 'g', type: 'multiCheckbox', label: 'G', options: [{ value: 'x', label: 'X' }] },
      { id: 'h', type: 'yesNo', label: 'H' },
    ]
    expect(buildDefaults(schema)).toEqual({
      a: '', b: '', c: '', d: '', e: '', f: '', g: [], h: false,
    })
  })

  it('T2: display-only types (sectionHeader, helpText) produce no key', () => {
    const schema = [
      { id: 'intro', type: 'sectionHeader', label: 'Intro', content: 'Welcome' },
      { id: 'note', type: 'helpText', label: 'Note', content: 'Read carefully' },
      { id: 'name', type: 'shortText', label: 'Name' },
    ]
    const defaults = buildDefaults(schema)
    expect(defaults).toEqual({ name: '' })
    expect(defaults).not.toHaveProperty('intro')
    expect(defaults).not.toHaveProperty('note')
  })

  it('T3: an empty schema yields an empty object', () => {
    expect(buildDefaults([])).toEqual({})
  })

  it('returns a fresh array for each multiCheckbox field (no shared reference)', () => {
    const schema = [
      { id: 'm1', type: 'multiCheckbox', label: 'M1', options: [{ value: 'x', label: 'X' }] },
      { id: 'm2', type: 'multiCheckbox', label: 'M2', options: [{ value: 'x', label: 'X' }] },
    ]
    const defaults = buildDefaults(schema)
    expect(defaults.m1).not.toBe(defaults.m2)
  })

  it('skips fields with an unknown type (no key, no throw)', () => {
    const schema = [
      { id: 'ok', type: 'shortText', label: 'OK' },
      { id: 'weird', type: 'bogus', label: 'Weird' },
    ]
    expect(buildDefaults(schema)).toEqual({ ok: '' })
  })

  it('tolerates a null/undefined schema', () => {
    expect(buildDefaults(null)).toEqual({})
    expect(buildDefaults(undefined)).toEqual({})
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `buildDefaults is not a function`.

- [ ] **Step 3: Implement `buildDefaults`.** In `src/utils/formSchema.js`, append:

```js
// Build the initial answer map for a schema. Skips display-only fields (they have
// no answer key) and unknown types. Each value comes from the registry's emptyValue
// factory, so multiCheckbox fields get their own fresh array (never a shared one).
export function buildDefaults(schema) {
  const out = {}
  if (!Array.isArray(schema)) return out
  for (const field of schema) {
    const meta = FIELD_REGISTRY[field?.type]
    if (!meta || meta.isDisplayOnly) continue
    out[field.id] = meta.emptyValue()
  }
  return out
}
```

- [ ] **Step 4: Run — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS (T1-T3 green).

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: add buildDefaults (T1-T3) — per-type empties, skips display-only

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — Engine `validateForm(fields, answers)` (T4-T9)

Contract signature: `validateForm(fields, answers) -> { [id]: message }` (empty object = valid). `yesNo:false` and `number:0` count as ANSWERED.

**Files**
- Modify test: `src/utils/__tests__/formSchema.test.js` (add import + describe block)
- Modify: `src/utils/formSchema.js` (add export)

Steps:

- [ ] **Step 1: Add `validateForm` to the import and a describe block (T4-T9).** Change the named import line to:

```js
import {
  FIELD_REGISTRY, makeUniqueId, slugifyWaiverId, createDefaultField, buildDefaults, validateForm,
} from '../formSchema.js'
```

Append this describe block:

```js
describe('validateForm', () => {
  it('T4: flags required-empty fields and leaves optional-empty alone', () => {
    const fields = [
      { id: 'req', type: 'shortText', label: 'Req', required: true },
      { id: 'opt', type: 'shortText', label: 'Opt', required: false },
    ]
    const errors = validateForm(fields, { req: '', opt: '' })
    expect(errors).toEqual({ req: 'This field is required.' })
  })

  it('T5: counts a satisfied answer — multiCheckbox with >=1, yesNo:false, number:0', () => {
    const fields = [
      { id: 'm', type: 'multiCheckbox', label: 'M', required: true, options: [{ value: 'a', label: 'A' }] },
      { id: 'y', type: 'yesNo', label: 'Y', required: true },
      { id: 'n', type: 'number', label: 'N', required: true },
      { id: 't', type: 'shortText', label: 'T', required: true },
    ]
    const errors = validateForm(fields, { m: ['a'], y: false, n: 0, t: 'hello' })
    expect(errors).toEqual({})
  })

  it('T5b: an empty multiCheckbox array is treated as unanswered when required', () => {
    const fields = [
      { id: 'm', type: 'multiCheckbox', label: 'M', required: true, options: [{ value: 'a', label: 'A' }] },
    ]
    expect(validateForm(fields, { m: [] })).toEqual({ m: 'This field is required.' })
  })

  it('T6: number — NaN, below min, and above max each error; empty optional is ok', () => {
    const fields = [
      { id: 'nan', type: 'number', label: 'NaN', required: false },
      { id: 'lo', type: 'number', label: 'Lo', required: false, min: 1, max: 10 },
      { id: 'hi', type: 'number', label: 'Hi', required: false, min: 1, max: 10 },
      { id: 'empty', type: 'number', label: 'Empty', required: false },
    ]
    const errors = validateForm(fields, { nan: 'abc', lo: 0, hi: 11, empty: '' })
    expect(errors.nan).toBeTruthy()
    expect(errors.lo).toBeTruthy()
    expect(errors.hi).toBeTruthy()
    expect(errors).not.toHaveProperty('empty')
  })

  it('T7: text maxLength exceeded errors; within-limit is ok', () => {
    const fields = [
      { id: 'over', type: 'shortText', label: 'Over', maxLength: 3 },
      { id: 'ok', type: 'shortText', label: 'OK', maxLength: 3 },
    ]
    const errors = validateForm(fields, { over: 'abcd', ok: 'abc' })
    expect(errors.over).toBeTruthy()
    expect(errors).not.toHaveProperty('ok')
  })

  it('T8: orphan-option guard — a value not in options errors with the literal message', () => {
    const fields = [
      { id: 's', type: 'select', label: 'S', options: [{ value: 'a', label: 'A' }] },
      { id: 'r', type: 'radio', label: 'R', options: [{ value: 'a', label: 'A' }] },
    ]
    const errors = validateForm(fields, { s: 'gone', r: 'gone' })
    expect(errors.s).toBe('Choose a valid option.')
    expect(errors.r).toBe('Choose a valid option.')
  })

  it('T8b: a valid option passes the orphan guard', () => {
    const fields = [{ id: 's', type: 'select', label: 'S', options: [{ value: 'a', label: 'A' }] }]
    expect(validateForm(fields, { s: 'a' })).toEqual({})
  })

  it('T8c: a multiCheckbox containing an orphan value errors', () => {
    const fields = [
      { id: 'm', type: 'multiCheckbox', label: 'M', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    ]
    expect(validateForm(fields, { m: ['a', 'gone'] })).toEqual({ m: 'Choose a valid option.' })
  })

  it('T9: display-only types are skipped even when marked required', () => {
    const fields = [
      { id: 'h', type: 'sectionHeader', label: 'H', required: true, content: 'X' },
      { id: 'p', type: 'helpText', label: 'P', required: true, content: 'Y' },
    ]
    expect(validateForm(fields, {})).toEqual({})
  })

  it('returns an empty object for an empty field list', () => {
    expect(validateForm([], {})).toEqual({})
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `validateForm is not a function`.

- [ ] **Step 3: Implement `validateForm` + the shared `isEmpty` helper.** In `src/utils/formSchema.js`, append:

```js
// Empty for validation/answered purposes: null, undefined, '', or an empty array.
// Critically NOT false (yesNo) and NOT 0 (number) — those are answered values.
function isEmpty(v) {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0)
}

// Pure per-field validation. Returns a map of fieldId -> message; an empty object
// means valid. Skips display-only fields. Required + empty wins first; then
// type-specific checks (number range/NaN, date parse, text maxLength, choice orphan).
export function validateForm(fields, answers = {}) {
  const errors = {}
  if (!Array.isArray(fields)) return errors

  for (const field of fields) {
    const meta = FIELD_REGISTRY[field?.type]
    if (!meta || meta.isDisplayOnly) continue

    const value = answers[field.id]

    if (field.required && isEmpty(value)) {
      errors[field.id] = 'This field is required.'
      continue
    }
    if (isEmpty(value)) continue // optional + empty → nothing more to check

    if (field.type === 'number') {
      const n = typeof value === 'number' ? value : Number(value)
      if (Number.isNaN(n)) {
        errors[field.id] = 'Enter a valid number.'
      } else if (field.min != null && n < field.min) {
        errors[field.id] = `Must be at least ${field.min}.`
      } else if (field.max != null && n > field.max) {
        errors[field.id] = `Must be at most ${field.max}.`
      }
      continue
    }

    if (field.type === 'date') {
      if (Number.isNaN(new Date(value).getTime())) {
        errors[field.id] = 'Enter a valid date.'
      }
      continue
    }

    if (field.type === 'shortText' || field.type === 'longText') {
      if (field.maxLength != null && String(value).length > field.maxLength) {
        errors[field.id] = `Must be ${field.maxLength} characters or fewer.`
      }
      continue
    }

    if (meta.hasOptions) {
      const valid = new Set((field.options ?? []).map((o) => o.value))
      const selected = Array.isArray(value) ? value : [value]
      if (selected.some((v) => !valid.has(v))) {
        errors[field.id] = 'Choose a valid option.'
      }
      continue
    }
  }

  return errors
}
```

- [ ] **Step 4: Run — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS (T4-T9 green).

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: add validateForm (T4-T9) — required/number/date/maxLength/orphan guard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — Engine `validateSchema(fields)` (T10-T12)

Contract signature: `validateSchema(fields) -> { ok:boolean, errors:{[id]:message}, formError:string|null }`. Dup ids → `formError` (errors is id-keyed, so duplicates would collapse). Choice fields need ≥1 option with non-empty labels. Non-empty labels per field. Number `min ≤ max`. Known type. Does NOT check waiver name. `ok` = `formError == null && Object.keys(errors).length === 0`.

**Files**
- Modify test: `src/utils/__tests__/formSchema.test.js` (add import + describe block)
- Modify: `src/utils/formSchema.js` (add export)

Steps:

- [ ] **Step 1: Add `validateSchema` to the import and a describe block (T10-T12).** Change the named import line to:

```js
import {
  FIELD_REGISTRY, makeUniqueId, slugifyWaiverId, createDefaultField,
  buildDefaults, validateForm, validateSchema,
} from '../formSchema.js'
```

Append this describe block:

```js
describe('validateSchema', () => {
  it('accepts a well-formed schema (ok:true, no errors, no formError)', () => {
    const fields = [
      { id: 'name', type: 'shortText', label: 'Name', required: true },
      { id: 'pick', type: 'select', label: 'Pick', options: [{ value: 'a', label: 'A' }] },
      { id: 'intro', type: 'sectionHeader', label: 'Intro', content: 'Hi' },
    ]
    const res = validateSchema(fields)
    expect(res).toEqual({ ok: true, errors: {}, formError: null })
  })

  it('T10: duplicate ids surface as a formError, not a per-field error', () => {
    const fields = [
      { id: 'dup', type: 'shortText', label: 'One' },
      { id: 'dup', type: 'shortText', label: 'Two' },
    ]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.formError).toBeTruthy()
    expect(res.formError.toLowerCase()).toContain('dup')
  })

  it('T11: a choice field with no options errors on that field', () => {
    const fields = [{ id: 's', type: 'select', label: 'S', options: [] }]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.s).toBeTruthy()
  })

  it('T11b: a choice field whose options have blank labels errors on that field', () => {
    const fields = [{ id: 's', type: 'select', label: 'S', options: [{ value: 'a', label: '  ' }] }]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.s).toBeTruthy()
  })

  it('T12: an unknown field type errors on that field', () => {
    const fields = [{ id: 'x', type: 'bogus', label: 'X' }]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.x).toBeTruthy()
  })

  it('flags a field with a blank label', () => {
    const fields = [{ id: 'x', type: 'shortText', label: '   ' }]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.x).toBeTruthy()
  })

  it('flags a number field whose min exceeds its max', () => {
    const fields = [{ id: 'n', type: 'number', label: 'N', min: 10, max: 1 }]
    const res = validateSchema(fields)
    expect(res.ok).toBe(false)
    expect(res.errors.n).toBeTruthy()
  })

  it('accepts a number field with min <= max', () => {
    const fields = [{ id: 'n', type: 'number', label: 'N', min: 1, max: 10 }]
    expect(validateSchema(fields).ok).toBe(true)
  })

  it('accepts an empty schema (a form with no fields yet is structurally valid)', () => {
    expect(validateSchema([])).toEqual({ ok: true, errors: {}, formError: null })
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `validateSchema is not a function`.

- [ ] **Step 3: Implement `validateSchema`.** In `src/utils/formSchema.js`, append:

```js
// Author-time schema validation. Per-field problems land in errors[id]; the one
// cross-field problem (duplicate ids — which would collapse an id-keyed map) lands
// in formError. Does NOT validate the waiver-type name — the builder owns that.
export function validateSchema(fields) {
  const errors = {}
  let formError = null
  const list = Array.isArray(fields) ? fields : []

  const seen = new Set()
  const dups = new Set()
  for (const field of list) {
    if (seen.has(field?.id)) dups.add(field.id)
    seen.add(field?.id)
  }
  if (dups.size > 0) {
    formError = `Duplicate field ids: ${[...dups].join(', ')}.`
  }

  for (const field of list) {
    const meta = FIELD_REGISTRY[field?.type]
    if (!meta) {
      errors[field?.id] = `Unknown field type: ${field?.type}.`
      continue
    }
    if (!String(field.label ?? '').trim()) {
      errors[field.id] = 'Every field needs a label.'
      continue
    }
    if (meta.hasOptions) {
      const opts = Array.isArray(field.options) ? field.options : []
      if (opts.length === 0) {
        errors[field.id] = 'Add at least one option.'
        continue
      }
      if (opts.some((o) => !String(o?.label ?? '').trim())) {
        errors[field.id] = 'Every option needs a label.'
        continue
      }
    }
    if (field.type === 'number' && field.min != null && field.max != null && field.min > field.max) {
      errors[field.id] = 'Minimum cannot exceed maximum.'
      continue
    }
  }

  return {
    ok: formError == null && Object.keys(errors).length === 0,
    errors,
    formError,
  }
}
```

- [ ] **Step 4: Run — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS (T10-T12 green; the full file now green).

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: add validateSchema (T10-T12) — dup-id formError, choice/label/range guards

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — Engine `buildFormAnswers(schema, customAnswers, relinkFn)`

**Why this task exists (cross-group reconcile):** the intake group's submit path imports `buildFormAnswers` from `formSchema.js` and the gateway tests fake its output, but no group authored it. It is authored here, in the engine, BEFORE its only binding consumer (the intake submit task, Task 28). Signature is pinned to **`relinkFn(fieldId) -> descriptor|null`** (matches spec §7d line 424 and the intake group's `relinkFile = (fieldId) => upload.files.find(d => d.type === 'custom-field:' + fieldId) ?? null` call shape — the highest-risk cross-group coupling, now resolved).

Contract: `buildFormAnswers(schema, customAnswers, relinkFn) -> { [id]: value }`. Builds the serializable `formAnswers` map from the in-progress `customAnswers`:
- **Display-only** types (`sectionHeader`/`helpText`) → no key (skipped).
- **file** type → call `relinkFn(field.id)`; the returned descriptor replaces the `File[]` in state (serializable, has a `url`). If `relinkFn` returns null/undefined → store `null`.
- **All other** input types → pass the answer through as-is from `customAnswers[field.id]` (string/boolean/array/number-string).
- **number coercion decision (implementer choice, called out):** `number` stays a string in component state. This module passes it through as the string. Coercion to a JSON number, if desired, is the persistence layer's call — but the spec example §4c shows `"credits": 42` (a number). **Decision for v1: pass through verbatim (string)** to keep `buildFormAnswers` pure and lossless; the existing gateway stores whatever it's given and `formatAnswer`/`validateForm` both `Number()`-coerce on read, so a string round-trips correctly. If a later slice needs numeric storage, coerce here behind a test.
- Unknown types → skipped (no key), never throw.

**Files**
- Modify test: `src/utils/__tests__/formSchema.test.js` (add import + describe block)
- Modify: `src/utils/formSchema.js` (add export)

Steps:

- [ ] **Step 1: Add `buildFormAnswers` to the import and a describe block.** Change the named import line to:

```js
import {
  FIELD_REGISTRY, makeUniqueId, slugifyWaiverId, createDefaultField,
  buildDefaults, validateForm, validateSchema, buildFormAnswers,
} from '../formSchema.js'
```

Append this describe block:

```js
describe('buildFormAnswers', () => {
  const noRelink = () => null

  it('passes scalar/array/boolean answers through by field id', () => {
    const schema = [
      { id: 'why', type: 'longText', label: 'Why' },
      { id: 'reasons', type: 'multiCheckbox', label: 'Reasons', options: [{ value: 'a', label: 'A' }] },
      { id: 'ok', type: 'yesNo', label: 'OK' },
      { id: 'credits', type: 'number', label: 'Credits' },
    ]
    const answers = { why: 'transferred', reasons: ['a'], ok: false, credits: '42' }
    expect(buildFormAnswers(schema, answers, noRelink)).toEqual({
      why: 'transferred', reasons: ['a'], ok: false, credits: '42',
    })
  })

  it('drops display-only types (no answer key)', () => {
    const schema = [
      { id: 'hdr', type: 'sectionHeader', label: 'H', content: 'x' },
      { id: 'help', type: 'helpText', label: 'P', content: 'y' },
      { id: 'name', type: 'shortText', label: 'Name' },
    ]
    const out = buildFormAnswers(schema, { name: 'Sam' }, noRelink)
    expect(out).toEqual({ name: 'Sam' })
    expect(out).not.toHaveProperty('hdr')
    expect(out).not.toHaveProperty('help')
  })

  it('replaces a file File[] answer with the descriptor relinkFn returns for that field id', () => {
    const schema = [{ id: 'note', type: 'file', label: 'Note', accept: '.pdf' }]
    const descriptor = { id: 'doc-1', name: 'note.pdf', type: 'custom-field:note', size: 10, url: '/u/note.pdf' }
    const relink = (fieldId) => (fieldId === 'note' ? descriptor : null)
    const out = buildFormAnswers(schema, { note: [{ name: 'note.pdf' }] }, relink)
    expect(out.note).toBe(descriptor)
  })

  it('stores null for a file field when relinkFn returns nothing (empty optional file)', () => {
    const schema = [{ id: 'note', type: 'file', label: 'Note' }]
    expect(buildFormAnswers(schema, { note: [] }, () => null)).toEqual({ note: null })
  })

  it('skips unknown field types without throwing', () => {
    const schema = [
      { id: 'ok', type: 'shortText', label: 'OK' },
      { id: 'weird', type: 'bogus', label: 'W' },
    ]
    expect(buildFormAnswers(schema, { ok: 'x', weird: 'y' }, noRelink)).toEqual({ ok: 'x' })
  })

  it('tolerates a null/undefined schema', () => {
    expect(buildFormAnswers(null, {}, noRelink)).toEqual({})
    expect(buildFormAnswers(undefined, {}, noRelink)).toEqual({})
  })
})
```

- [ ] **Step 2: Run — expect FAIL.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: FAIL — `buildFormAnswers is not a function`.

- [ ] **Step 3: Implement `buildFormAnswers`.** In `src/utils/formSchema.js`, append:

```js
// Build the serializable formAnswers map persisted at submit. Skips display-only
// (no answer key) and unknown types. File answers (File[] in component state) are
// replaced by the descriptor relinkFn returns for that field id — relinkFn is
// (fieldId) => descriptor|null (the caller matches upload.files by the namespaced
// docType 'custom-field:<id>'). Everything else passes through verbatim, including
// number-as-string (coercion, if ever needed, is a persistence-layer concern).
export function buildFormAnswers(schema, customAnswers = {}, relinkFn = () => null) {
  const out = {}
  if (!Array.isArray(schema)) return out
  for (const field of schema) {
    const meta = FIELD_REGISTRY[field?.type]
    if (!meta || meta.isDisplayOnly) continue
    if (field.type === 'file') {
      out[field.id] = relinkFn(field.id) ?? null
      continue
    }
    out[field.id] = customAnswers[field.id]
  }
  return out
}
```

- [ ] **Step 4: Run — expect PASS.** Run:

```
npx vitest run src/utils/__tests__/formSchema.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit.**

```
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
formSchema: add buildFormAnswers (relinkFn(fieldId) signature)

Build the serializable formAnswers map at submit: skip display-only/unknown,
replace file File[] with the descriptor relinkFn(fieldId) returns, pass other
answers through verbatim. Pins the cross-group relinkFn(fieldId)->descriptor|null
signature the intake submit path depends on.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — Engine full-suite regression gate

The engine is pure and adds no deps; the existing suites must still pass.

Steps:

- [ ] **Step 1: Run the entire test suite — expect PASS.** Run:

```
npm test
```

Expected: PASS — all pre-existing suites (`algorithms`, `eligibility`, `schedulingLogic`, `priorityQueue`, `conflictDetection`, `transcriptParser`) plus the new `formSchema` suite green. If any pre-existing suite fails, it is unrelated to this pure-additive module — investigate before continuing; do not commit a red tree.

- [ ] **Step 2: Final contract self-check (no code change — verification only).** Re-read each exported signature in `src/utils/formSchema.js` against the LOCKED INTERFACE CONTRACT and confirm character-for-character:
  - `FIELD_REGISTRY` entries: `{ type, label, isDisplayOnly, hasOptions, emptyValue }`
  - `createDefaultField(type)` — single arg
  - `buildDefaults(schema)` — skips display-only
  - `validateForm(fields, answers)` — `{[id]:message}`, empty = valid
  - `validateSchema(fields)` — `{ ok, errors, formError }`
  - `makeUniqueId(label, existingIds)` — array arg, no `crit-` prefix
  - `slugifyWaiverId(name, existingIds)`
  - `buildFormAnswers(schema, customAnswers, relinkFn)` — `relinkFn(fieldId) -> descriptor|null`

  This module is the import target for every downstream task group — a signature drift here breaks all of them. (`countFields` is added later by the builder section, Task 30.) No commit (verification step only).

---

## Task 14 — FieldRenderer scaffold: module, `FieldShell`, dispatch skeleton, display-only types

**Scope:** The shared 11-type controlled render switch + `FieldShell` a11y scaffold. Mounted editable in the student wizard's "Additional questions" step and read-only in the FormBuilder preview. Imports `FIELD_REGISTRY` from `../../utils/formSchema.js` (engine — Task 5, present by now) and `UploadZone` from `student-portal/UploadZone.jsx` (exists).

**Testing reality:** `npm test` === `vitest run`, pure-logic only — no jsdom, no testing-library. A JSX render component cannot be unit-tested here, so per U7/§10 the Layer-B render tests are DEFERRED. These are therefore **build tasks**: implement one field-type group at a time, end each with an esbuild-transform smoke check + a manual-verification note, and a commit.

**Props contract (locked):** `{ fields, answers, onChange, errors, readOnly }`
- `fields`: array of field-definition objects.
- `answers`: `{ [id]: value }` — built by `buildDefaults(schema)` upstream; every input id has a non-`undefined` value (R9).
- `onChange(id, value)`: lifts a single answer up. No-op `() => {}` in read-only preview.
- `errors`: `{ [id]: message }` — only ids with an active error are present.
- `readOnly`: boolean. When true, all controls get `disabled`/`readOnly` and `onChange` is never expected to fire.

**Behavior locks:** Display-only types (`sectionHeader`, `helpText`) render WITHOUT `FieldShell`, no `htmlFor`/error wiring, no answer. Unknown type → `FIELD_REGISTRY[type]` is `undefined` → render `null` (never throw) (R4). Render list keyed by `field.id`, never index. `useId()` only namespaces help/error sub-ids.

**Files**
- Create: `c:\My projects Main\Schedule AI\schedule-bot\src\features\forms\FieldRenderer.jsx`
- Test path: none (Layer-B deferred). Verification = esbuild transform + manual eyeball note.

**Steps**

- [ ] **Step 1: Write the module scaffold — imports, `FieldShell`, the dispatch switch with display-only branches + unknown-type guard, and the `FieldRenderer` map.** Input types route to a placeholder `renderControl` (returns `null`) filled by later tasks. Write the full file:
  ```jsx
  import { useId } from 'react'
  import { FIELD_REGISTRY } from '../../utils/formSchema.js'

  // Shared 11-type render seam. Editable in the student wizard ("Additional
  // questions" step); read-only in the FormBuilder preview. Controlled — all
  // answer state lives in the parent (WaiverIntake / FormBuilder).
  //
  // props: { fields, answers, onChange, errors, readOnly }

  // FieldShell wraps every INPUT field with the a11y scaffold:
  //   <label htmlFor> (or <legend> for grouped inputs), required *, helpText via
  //   aria-describedby, inline error <p role="alert">. Display-only types skip it.
  function FieldShell({ field, errorId, helpId, error, children, asFieldset = false }) {
    const Wrapper = asFieldset ? 'fieldset' : 'div'
    const Label = asFieldset ? 'legend' : 'label'
    return (
      <Wrapper className="space-y-1.5">
        <Label
          {...(asFieldset ? {} : { htmlFor: field.id })}
          className="block text-sm font-medium text-ink"
        >
          {field.label}
          {field.required && (
            <span className="ml-0.5 text-danger-600" aria-hidden="true">*</span>
          )}
        </Label>
        {field.helpText && (
          <p id={helpId} className="text-xs text-muted">{field.helpText}</p>
        )}
        {children}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger-700 dark:text-danger-300">
            {error}
          </p>
        )}
      </Wrapper>
    )
  }

  export function FieldRenderer({ fields = [], answers = {}, onChange, errors = {}, readOnly = false }) {
    return (
      <div className="space-y-5">
        {fields.map((field) => (
          <FieldNode
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={onChange}
            error={errors[field.id]}
            readOnly={readOnly}
          />
        ))}
      </div>
    )
  }

  function FieldNode({ field, value, onChange, error, readOnly }) {
    const uid = useId()
    const meta = FIELD_REGISTRY[field.type]

    // Unknown field type (older client meets newer schema) → render nothing,
    // never throw. (Spec R4 / T12.)
    if (!meta) return null

    // Display-only types: no FieldShell, no answer, no error wiring.
    if (meta.isDisplayOnly) {
      if (field.type === 'sectionHeader') {
        return (
          <h3 className="border-b border-hairline pb-1.5 pt-2 text-sm font-semibold uppercase tracking-wide text-ink">
            {field.content || field.label}
          </h3>
        )
      }
      // helpText
      return <p className="text-sm text-muted">{field.content || field.label}</p>
    }

    const errorId = error ? `${uid}-err` : undefined
    const helpId = field.helpText ? `${uid}-help` : undefined
    const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined

    const handle = (next) => { if (!readOnly) onChange(field.id, next) }

    return renderControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly })
  }

  // Placeholder — Tasks 15–17 replace this with the per-type switch.
  function renderControl() {
    return null
  }
  ```

- [ ] **Step 2: Run the esbuild transform smoke check (expected: TRANSFORM OK).** Transforms the single file with esbuild, the same transformer Vite uses:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx esbuild src/features/forms/FieldRenderer.jsx --loader=jsx --bundle --external:react --format=esm --outfile=/dev/null && echo "TRANSFORM OK"
  ```
  Expected output: `TRANSFORM OK` (esbuild resolves the `formSchema.js` import and finds no syntax error). If esbuild reports an unresolved import, `formSchema.js` is missing — the engine section must land first.

- [ ] **Step 3: Manual-verification note (record in the commit body, nothing to eyeball yet).** Once `FormBuilder.jsx` + its Preview toggle exist, eyeball: a `sectionHeader` renders as an uppercase divider heading; a `helpText` renders as muted body copy; neither shows a `*`, label-for, or error slot. An unknown type renders nothing and the preview does not crash.

- [ ] **Step 4: Commit.**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/features/forms/FieldRenderer.jsx && git commit -m "$(cat <<'EOF'
Add FieldRenderer scaffold: FieldShell + display-only types + unknown-type guard

FieldShell a11y wrapper (label/legend, required *, aria-describedby, role=alert
error). sectionHeader/helpText render without FieldShell or answer wiring.
Unknown type -> null (R4). Input branches stubbed for Tasks 15-17.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
  ```

---

## Task 15 — FieldRenderer text-input group: `shortText`, `longText`, `number`, `date`

**Files**
- Modify: `c:\My projects Main\Schedule AI\schedule-bot\src\features\forms\FieldRenderer.jsx` (replace the `renderControl` placeholder with the real switch; add the four text-ish branches).
- Test path: none (Layer-B deferred).

**Steps**

- [ ] **Step 1: Replace the placeholder `renderControl` with the real switch and implement the text group.** `number` keeps its value as a **string in state** (coerced only at validate/submit). Replace the entire `function renderControl() { return null }` block with:
  ```jsx
  function renderControl(ctx) {
    const { field } = ctx
    switch (field.type) {
      case 'shortText':
        return <TextControl {...ctx} />
      case 'longText':
        return <TextAreaControl {...ctx} />
      case 'number':
        return <NumberControl {...ctx} />
      case 'date':
        return <DateControl {...ctx} />
      // Tasks 16 (choice) + 17 (yesNo, file) fill the remaining branches.
      default:
        return null
    }
  }

  function TextControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    return (
      <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
        <input
          id={field.id}
          type="text"
          value={value ?? ''}
          maxLength={field.maxLength || undefined}
          placeholder={field.placeholder || undefined}
          onChange={(e) => handle(e.target.value)}
          disabled={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
        />
      </FieldShell>
    )
  }

  function TextAreaControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    return (
      <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
        <textarea
          id={field.id}
          rows={3}
          value={value ?? ''}
          maxLength={field.maxLength || undefined}
          placeholder={field.placeholder || undefined}
          onChange={(e) => handle(e.target.value)}
          disabled={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
        />
      </FieldShell>
    )
  }

  function NumberControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    // Value stays a string in state; coercion happens at validate/submit, never
    // on keystroke (avoids Number('') === 0 corrupting an in-progress edit).
    return (
      <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
        <input
          id={field.id}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          step={field.step ?? undefined}
          placeholder={field.placeholder || undefined}
          onChange={(e) => handle(e.target.value)}
          disabled={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
        />
      </FieldShell>
    )
  }

  function DateControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    return (
      <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
        <input
          id={field.id}
          type="date"
          value={value ?? ''}
          onChange={(e) => handle(e.target.value)}
          disabled={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
        />
      </FieldShell>
    )
  }
  ```

- [ ] **Step 2: Run the transform smoke check (expected: TRANSFORM OK).**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx esbuild src/features/forms/FieldRenderer.jsx --loader=jsx --bundle --external:react --format=esm --outfile=/dev/null && echo "TRANSFORM OK"
  ```

- [ ] **Step 3: Manual-verification note.** In the FormBuilder preview: add `shortText` (placeholder + maxLength), `longText`, `number` (min/max/step), `date`. Eyeball: label, optional `*`, help text, glass-input control. Typing in `number` keeps partial input (`-`, `1.`) without snapping to `0`. Read-only preview disables every control at `opacity-60`. Errors show as red `role="alert"` text and input gets `aria-invalid`.

- [ ] **Step 4: Commit.**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/features/forms/FieldRenderer.jsx && git commit -m "$(cat <<'EOF'
FieldRenderer: text-input group (shortText, longText, number, date)

Controlled inputs on glass-input tokens. number keeps a string in state
(coerced at validate/submit, not on keystroke). maxLength/placeholder/min/max/
step threaded per type. aria-invalid + aria-describedby wired.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
  ```

---

## Task 16 — FieldRenderer choice group: `select`, `radio`, `multiCheckbox`

**Files**
- Modify: `c:\My projects Main\Schedule AI\schedule-bot\src\features\forms\FieldRenderer.jsx` (add three branches to the `renderControl` switch + three control components).
- Test path: none (Layer-B deferred).

**Steps**

- [ ] **Step 1: Add the choice-group branches to the `renderControl` switch.** Locate the switch and add three `case`s above `default:`:
  ```jsx
      case 'date':
        return <DateControl {...ctx} />
      case 'select':
        return <SelectControl {...ctx} />
      case 'radio':
        return <RadioControl {...ctx} />
      case 'multiCheckbox':
        return <MultiCheckboxControl {...ctx} />
      // Task 17 fills yesNo + file.
      default:
        return null
  ```

- [ ] **Step 2: Append the three choice control components after `DateControl`.** `select` uses a disabled placeholder option; `radio`/`multiCheckbox` use `<fieldset>`+`<legend>` via `FieldShell asFieldset`, native inputs sharing `name={field.id}`, keyed by option value. `multiCheckbox` value is `string[]`, toggled immutably. Append:
  ```jsx
  function SelectControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    const options = field.options ?? []
    return (
      <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
        <select
          id={field.id}
          value={value ?? ''}
          onChange={(e) => handle(e.target.value)}
          disabled={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="glass-input w-full px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="" disabled>{field.placeholder || 'Choose…'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FieldShell>
    )
  }

  function RadioControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    const options = field.options ?? []
    return (
      <FieldShell field={field} asFieldset error={error} errorId={errorId} helpId={helpId}>
        <div role="radiogroup" aria-describedby={describedBy} aria-invalid={error ? true : undefined} className="space-y-1.5">
          {options.map((opt) => {
            const optId = `${field.id}-${opt.value}`
            return (
              <label key={opt.value} htmlFor={optId} className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  id={optId}
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => handle(opt.value)}
                  disabled={readOnly}
                  className="h-4 w-4 accent-brand-600 disabled:opacity-60"
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      </FieldShell>
    )
  }

  function MultiCheckboxControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    const options = field.options ?? []
    const selected = Array.isArray(value) ? value : []
    const toggle = (optValue) => {
      const next = selected.includes(optValue)
        ? selected.filter((v) => v !== optValue)
        : [...selected, optValue]
      handle(next)
    }
    return (
      <FieldShell field={field} asFieldset error={error} errorId={errorId} helpId={helpId}>
        <div aria-describedby={describedBy} className="space-y-1.5">
          {options.map((opt) => {
            const optId = `${field.id}-${opt.value}`
            return (
              <label key={opt.value} htmlFor={optId} className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  id={optId}
                  type="checkbox"
                  value={opt.value}
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  disabled={readOnly}
                  className="h-4 w-4 rounded accent-brand-600 disabled:opacity-60"
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      </FieldShell>
    )
  }
  ```

- [ ] **Step 3: Run the transform smoke check (expected: TRANSFORM OK).**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx esbuild src/features/forms/FieldRenderer.jsx --loader=jsx --bundle --external:react --format=esm --outfile=/dev/null && echo "TRANSFORM OK"
  ```

- [ ] **Step 4: Manual-verification note.** Preview a `select` (disabled "Choose…" placeholder when unanswered; picking calls onChange with the option *value*), a `radio` group (legend = label; radios share `name`, single-select; `accent-brand-600`), and a `multiCheckbox` (legend; multiple selectable; value is an array of values). Read-only disables all. An orphaned stored value does NOT crash — select shows placeholder, radio shows nothing checked (validation surfaces the orphan, §5c/R3).

- [ ] **Step 5: Commit.**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/features/forms/FieldRenderer.jsx && git commit -m "$(cat <<'EOF'
FieldRenderer: choice group (select, radio, multiCheckbox)

select with disabled placeholder option; radio/multiCheckbox as fieldset+legend
with native inputs sharing name=field.id, keyed by option value. multiCheckbox
value is string[] toggled immutably. role=radiogroup + accent-brand-600.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
  ```

---

## Task 17 — FieldRenderer `yesNo` (toggle radios) + `file` (UploadZone)

**Files**
- Modify: `c:\My projects Main\Schedule AI\schedule-bot\src\features\forms\FieldRenderer.jsx` (add two branches + import `UploadZone`).
- Test path: none (Layer-B deferred).

**Steps**

- [ ] **Step 1: Add the `UploadZone` import at the top of the file.** Add directly under the existing `formSchema.js` import:
  ```jsx
  import { useId } from 'react'
  import { FIELD_REGISTRY } from '../../utils/formSchema.js'
  import { UploadZone } from '../student-portal/UploadZone.jsx'
  ```

- [ ] **Step 2: Add the `yesNo` + `file` branches to the `renderControl` switch.** Replace the `// Task 17 fills yesNo + file.` + `default:` tail of the switch with:
  ```jsx
      case 'yesNo':
        return <YesNoControl {...ctx} />
      case 'file':
        return <FileControl {...ctx} />
      default:
        return null
  ```

- [ ] **Step 3: Append the `YesNoControl` and `FileControl` components.** `yesNo` value is a **boolean**; two radios styled as a pill toggle (`role=radiogroup`, sr-only native inputs). `file` mounts the existing `UploadZone` with the **namespaced** `docType='custom-field:<id>'` (§5d/D11); value is `File[]` in state. In read-only preview, render a static descriptor stub (UploadZone has no disabled mode). Append:
  ```jsx
  function YesNoControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    const current = value === true ? 'yes' : value === false ? 'no' : null
    const opts = [
      { key: 'yes', label: 'Yes', val: true },
      { key: 'no', label: 'No', val: false },
    ]
    return (
      <FieldShell field={field} asFieldset error={error} errorId={errorId} helpId={helpId}>
        <div role="radiogroup" aria-describedby={describedBy} aria-invalid={error ? true : undefined} className="inline-flex gap-1 rounded-xl bg-black/[0.04] p-1">
          {opts.map((o) => {
            const optId = `${field.id}-${o.key}`
            const active = current === o.key
            return (
              <label
                key={o.key}
                htmlFor={optId}
                className={[
                  'cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium transition',
                  active ? 'bg-brand-600 text-white' : 'text-muted hover:text-ink',
                  readOnly ? 'cursor-default opacity-60' : '',
                ].join(' ')}
              >
                <input
                  id={optId}
                  type="radio"
                  name={field.id}
                  className="sr-only"
                  checked={active}
                  onChange={() => handle(o.val)}
                  disabled={readOnly}
                />
                {o.label}
              </label>
            )
          })}
        </div>
      </FieldShell>
    )
  }

  function FileControl({ field, value, error, errorId, helpId, describedBy, handle, readOnly }) {
    // In the wizard, value is File[] (re-linked to a descriptor at submit). In the
    // builder preview (readOnly), render a static stub — UploadZone has no disabled
    // mode and must not accept uploads during preview.
    if (readOnly) {
      return (
        <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
          <div
            id={field.id}
            aria-describedby={describedBy}
            className="rounded-xl border-2 border-dashed border-hairline-strong bg-glass-weak p-6 text-center text-sm text-muted"
          >
            File upload ({field.accept || 'any file'}{field.multiple ? ', multiple' : ''})
          </div>
        </FieldShell>
      )
    }
    const files = Array.isArray(value) ? value : []
    return (
      <FieldShell field={field} error={error} errorId={errorId} helpId={helpId}>
        <UploadZone
          docType={`custom-field:${field.id}`}
          accept={field.accept || '.pdf,.png,.jpg,.jpeg'}
          multiple={field.multiple ?? false}
          files={files}
          onFilesChange={(next) => handle(next)}
        />
      </FieldShell>
    )
  }
  ```

- [ ] **Step 4: Run the transform smoke check (expected: TRANSFORM OK — now resolves the UploadZone import too).**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx esbuild src/features/forms/FieldRenderer.jsx --loader=jsx --bundle --external:react --format=esm --outfile=/dev/null && echo "TRANSFORM OK"
  ```

- [ ] **Step 5: Manual-verification note.** Preview a `yesNo` (two-pill toggle; selecting flips the boolean; legend = label) and a `file`. In the editable wizard the `file` field shows the real `UploadZone` drag-drop with the right `accept`; uploaded files carry `docType:'custom-field:<id>'` (the namespaced type prevents `findMissingDocs` false-match). In read-only preview the file field shows the static "File upload (…)" stub. yesNo read-only shows the toggle greyed at `opacity-60`.

- [ ] **Step 6: Commit.**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/features/forms/FieldRenderer.jsx && git commit -m "$(cat <<'EOF'
FieldRenderer: yesNo toggle + file (UploadZone, namespaced docType)

yesNo as two sr-only radios styled as a brand-pill toggle (boolean value).
file mounts existing UploadZone with docType='custom-field:<id>' (D11/5d);
File[] in state, re-linked to a descriptor at submit. Read-only preview renders
a static file stub (UploadZone has no disabled mode).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
  ```

---

## Task 18 — FieldRenderer final smoke check: full-module transform + all 11 types resolve

**Files**
- Modify: none (verification only). Optionally Modify `FieldRenderer.jsx` if a defect surfaces.
- Test path: none.

**Steps**

- [ ] **Step 1: Whole-module transform + bundle resolution (catches missing imports/exports across all branches).**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx esbuild src/features/forms/FieldRenderer.jsx --loader=jsx --bundle --external:react --format=esm --outfile=/dev/null && echo "FULL TRANSFORM OK"
  ```
  Expected output: `FULL TRANSFORM OK`.

- [ ] **Step 2: Confirm the production build still compiles with the new file present.**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx vite build --logLevel warn 2>&1 | tail -8
  ```
  Expected: build finishes (`✓ built in …`) with no error referencing `FieldRenderer.jsx`. (The file is tree-shaken out until WaiverIntake/FormBuilder import it, so its presence must not break the build.)

- [ ] **Step 3: Run the existing test suite to confirm zero regressions.**
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npm test 2>&1 | tail -12
  ```
  Expected: the existing suite passes unchanged (FieldRenderer contributes no Layer-A tests by design — U7).

- [ ] **Step 4: Coverage self-audit (no code — checklist against the contract).** Confirm the final file implements all 11 branches: text group (`shortText`/`longText`/`number`/`date`), choice group (`select`/`radio`/`multiCheckbox`), `yesNo`, `file`, display-only (`sectionHeader`/`helpText`), plus the unknown→`null` default. Confirm: keyed by `field.id` (not index); `onChange` no-op when `readOnly`; display-only skip `FieldShell`; `number` holds a string; `multiCheckbox` holds an array; `yesNo` holds a boolean; file `docType` is namespaced `custom-field:<id>`.

- [ ] **Step 5: Final manual-QA note (handed to the FormBuilder/WaiverIntake sections).** Once both consumer surfaces exist, run the §10 manual QA: build a form with all 11 types → toggle Preview (read-only fidelity check) → submit as a student through the "Additional questions" step → verify each answer type round-trips. Test `enterprise` (default) + glass skins, light + dark — FieldRenderer uses only token classes so both skins/themes inherit automatically. No commit (verification only).

---

> **Gateway section preconditions:** the engine (`src/utils/formSchema.js` with `slugifyWaiverId`) is present by now (Tasks 4-13). Test runner: `npm test` === `vitest run`, Node env, no jsdom. `import.meta.env.VITE_SUPABASE_*` is unset under vitest → `isSupabaseConfigured` is `false` at module load. Demo tests call `api.js` (demo path runs naturally); supabase-mapper tests call `supabaseApi.js` functions directly behind a mocked `lib/supabase.js`. **The `evaluateAgainstRubric` arg object must never gain `formAnswers`** — locked by Tasks T16/T17 (Task 23); any executor editing `submitWaiver` in either file must leave the eval-arg literal (api.js:268-273, supabaseApi.js:100-105) untouched; only `insertRow`/the queue+request literals change.

## Task 19 — mockData.js: `formSchema: []` on the 8 seeds + one populated demo type

**Files**
- Modify: `src/services/mockData.js` (the `WAIVER_TYPES` array; `SEED_SUBMISSIONS` — add one demo submission with answers + snapshot)

This task changes data only; verify by a one-off node assertion, then commit.

- [ ] **Step 1: Add `formSchema: []` to all 8 existing seeds.** Edit each of the 8 objects in `WAIVER_TYPES` to append a `formSchema: []` key after `requiredDocs`. Replace the whole array body:

```jsx
export const WAIVER_TYPES = [
  {
    id: 'prereq-override',
    name: 'Prerequisite Override',
    description: 'Skip a listed prerequisite when prior coursework or scores cover it.',
    active: true,
    requiredDocs: ['courseList'],
    formSchema: [],
  },
  {
    id: 'schedule-conflict',
    name: 'Schedule Conflict Waiver',
    description: 'Resolve two required courses scheduled in the same block.',
    active: true,
    requiredDocs: ['courseList'],
    formSchema: [],
  },
  {
    id: 'credit-recovery',
    name: 'Credit Recovery',
    description: 'Recover credit for a failed course via an alternate path.',
    active: true,
    requiredDocs: ['supporting'],
    formSchema: [],
  },
  {
    id: 'ap-entry',
    name: 'Advanced Placement Entry',
    description: 'Enter an AP course without the standard gating sequence.',
    active: false,
    requiredDocs: [],
    formSchema: [],
  },
  {
    id: 'grad-substitution',
    name: 'Graduation Requirement Substitution',
    description: 'Substitute an equivalent course for a graduation requirement.',
    active: true,
    requiredDocs: ['courseList', 'supporting'],
    formSchema: [],
  },
  {
    id: 'late-add-drop',
    name: 'Late Add/Drop',
    description: 'Add or drop a course after the standard registration deadline.',
    active: true,
    requiredDocs: ['courseList'],
    formSchema: [],
  },
  {
    id: 'online-course',
    name: 'Online Course Approval',
    description: 'Enroll in an accredited online course for credit toward graduation.',
    active: true,
    requiredDocs: ['supporting'],
    formSchema: [],
  },
  {
    id: 'pe-exemption',
    name: 'PE Exemption',
    description: 'Waive the physical education requirement due to health or athletic status.',
    active: false,
    requiredDocs: ['supporting'],
    formSchema: [],
  },
  MEDICAL_EXEMPTION_DEMO,
]
```

(The 9th entry `MEDICAL_EXEMPTION_DEMO` is a const declared in the next step, placed *above* `WAIVER_TYPES` so it's defined when the array literal evaluates.)

- [ ] **Step 2: Declare the populated demo type above `WAIVER_TYPES`.** Insert this block immediately after the file's top comment (before `export const WAIVER_TYPES`). Exercises `sectionHeader` + `shortText` + `multiCheckbox` + `file` + `yesNo` per spec §4f:

```jsx
// One richly-populated demo waiver type so the Form Builder + intake render
// non-empty in demo mode. Exercises sectionHeader + shortText + multiCheckbox
// + file + yesNo. Inactive by default so a half-built demo never leaks to
// students until a counselor flips it on (matches FormBuilder "+ New" default).
const MEDICAL_EXEMPTION_DEMO = {
  id: 'medical-exemption',
  name: 'Medical Exemption',
  description: 'Request an exemption from a course requirement for documented medical reasons.',
  active: false,
  requiredDocs: ['supporting'],
  formSchema: [
    {
      id: 'medical-details',
      type: 'sectionHeader',
      label: 'Medical details',
      content: 'Tell us about the condition and the accommodation you are requesting.',
    },
    {
      id: 'condition',
      type: 'shortText',
      label: 'Condition or diagnosis',
      required: true,
      helpText: 'A brief description is fine — no need for full medical history.',
      placeholder: 'e.g. post-surgery knee recovery',
      maxLength: 120,
    },
    {
      id: 'affected-activities',
      type: 'multiCheckbox',
      label: 'Which activities are affected?',
      required: true,
      helpText: 'Select all that apply.',
      options: [
        { value: 'physical-ed', label: 'Physical education' },
        { value: 'lab-work', label: 'Lab / hands-on work' },
        { value: 'field-trips', label: 'Field trips' },
        { value: 'extended-sitting', label: 'Extended sitting' },
      ],
    },
    {
      id: 'physician-note',
      type: 'file',
      label: 'Physician note',
      required: true,
      helpText: 'PDF or image of a signed note from your physician.',
      accept: '.pdf,.png,.jpg,.jpeg',
      multiple: false,
    },
    {
      id: 'release-consent',
      type: 'yesNo',
      label: 'Do you consent to the counselor contacting your physician if needed?',
      required: true,
    },
  ],
}
```

- [ ] **Step 3: Add one populated demo submission against `medical-exemption`.** Leave the existing seed submissions' shape as-is (they validate the null-safe legacy read path, T29). Insert this object as the **first** element of the `SEED_SUBMISSIONS` array (before the current first record):

```jsx
  {
    id: 'req-2000',
    waiverTypeId: 'medical-exemption',
    status: 'counselor-review',
    submittedAt: '2026-06-16T17:10:00Z',
    studentNote: 'Recovering from knee surgery; requesting PE exemption this term.',
    documents: [
      { id: 'doc-seed-note', name: 'physician_note.pdf', type: 'custom-field:physician-note', size: 84213, url: '/mock/uploads/physician_note.pdf' },
    ],
    formAnswers: {
      condition: 'Post-surgery knee recovery',
      'affected-activities': ['physical-ed', 'field-trips'],
      'physician-note': { id: 'doc-seed-note', name: 'physician_note.pdf', type: 'custom-field:physician-note', size: 84213, url: '/mock/uploads/physician_note.pdf' },
      'release-consent': true,
    },
    formSchemaSnapshot: [
      { id: 'medical-details', type: 'sectionHeader', label: 'Medical details', content: 'Tell us about the condition and the accommodation you are requesting.' },
      { id: 'condition', type: 'shortText', label: 'Condition or diagnosis', required: true, helpText: 'A brief description is fine — no need for full medical history.', placeholder: 'e.g. post-surgery knee recovery', maxLength: 120 },
      { id: 'affected-activities', type: 'multiCheckbox', label: 'Which activities are affected?', required: true, helpText: 'Select all that apply.', options: [{ value: 'physical-ed', label: 'Physical education' }, { value: 'lab-work', label: 'Lab / hands-on work' }, { value: 'field-trips', label: 'Field trips' }, { value: 'extended-sitting', label: 'Extended sitting' }] },
      { id: 'physician-note', type: 'file', label: 'Physician note', required: true, helpText: 'PDF or image of a signed note from your physician.', accept: '.pdf,.png,.jpg,.jpeg', multiple: false },
      { id: 'release-consent', type: 'yesNo', label: 'Do you consent to the counselor contacting your physician if needed?', required: true },
    ],
    frozenAt: '2026-06-16T17:10:00Z',
  },
```

- [ ] **Step 4: Verify the data shape with a one-off node check (expected PASS).** Run:

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && node --input-type=module -e "import('./src/services/mockData.js').then(m => { const all = m.WAIVER_TYPES; console.log('count', all.length); console.log('all have formSchema', all.every(w => Array.isArray(w.formSchema))); const me = all.find(w => w.id==='medical-exemption'); console.log('medical fields', me.formSchema.map(f=>f.type).join(',')); const sub = m.SEED_SUBMISSIONS.find(s=>s.id==='req-2000'); console.log('demo sub keys', Object.keys(sub.formAnswers).join(',')); })"
```

Expected output:
```
count 9
all have formSchema true
medical fields sectionHeader,shortText,multiCheckbox,file,yesNo
demo sub keys condition,affected-activities,physician-note,release-consent
```

- [ ] **Step 5: Commit.**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/services/mockData.js && git commit -m "$(cat <<'EOF'
Add formSchema to waiver seeds + Medical Exemption demo type

8 seeds get formSchema:[]; new inactive medical-exemption type
exercises sectionHeader+shortText+multiCheckbox+file+yesNo. One
demo submission (req-2000) carries formAnswers + formSchemaSnapshot.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20 — api.js: bump SEED_VERSION + add `diffWaiverType` helper

**Files**
- Modify: `src/services/api.js` (line 66, `SEED_VERSION`; after `WAIVER_NAME` at line 54, add `diffWaiverType` helper)
- Test: `src/services/__tests__/customFields.parity.test.js` (new file — the `diffWaiverType` unit test goes here as the first test added)

`diffWaiverType` is pure → TDD it. SEED_VERSION is a one-line constant change verified by grep.

- [ ] **Step 1: Write the failing test for `diffWaiverType`.** Create `src/services/__tests__/customFields.parity.test.js` with only the diff test for now (the parity tests come in Task 23, appended to this same file). Full initial file:

```js
import { describe, it, expect } from 'vitest'
import { diffWaiverType } from '../api.js'

describe('diffWaiverType', () => {
  it('reports name/description/active changes', () => {
    const before = { id: 'x', name: 'A', description: 'd1', active: true, requiredDocs: [], formSchema: [] }
    const after = { id: 'x', name: 'B', description: 'd1', active: false, requiredDocs: [], formSchema: [] }
    const diff = diffWaiverType(before, after)
    expect(diff).toContainEqual({ entity: 'Waiver: B', field: 'name', from: 'A', to: 'B' })
    expect(diff).toContainEqual({ entity: 'Waiver: B', field: 'active', from: true, to: false })
    expect(diff.find((d) => d.field === 'description')).toBeUndefined()
  })

  it('reports field count + requiredDocs changes without dumping arrays', () => {
    const before = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: ['courseList'], formSchema: [] }
    const after = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: ['courseList', 'supporting'], formSchema: [{ id: 'q1', type: 'shortText', label: 'Q' }] }
    const diff = diffWaiverType(before, after)
    expect(diff).toContainEqual({ entity: 'Waiver: A', field: 'fieldCount', from: 0, to: 1 })
    expect(diff).toContainEqual({ entity: 'Waiver: A', field: 'requiredDocs', from: 'courseList', to: 'courseList, supporting' })
  })

  it('returns empty diff for identical inputs', () => {
    const w = { id: 'x', name: 'A', description: 'd', active: true, requiredDocs: [], formSchema: [] }
    expect(diffWaiverType(w, { ...w })).toEqual([])
  })
})
```

- [ ] **Step 2: Run it (expected FAIL — `diffWaiverType` is not exported).**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && npx vitest run src/services/__tests__/customFields.parity.test.js
```

Expected: `diffWaiverType is not a function` — the import resolves but the symbol is `undefined`, all 3 tests FAIL.

- [ ] **Step 3: Bump SEED_VERSION.** In `src/services/api.js`, change line 66 `const SEED_VERSION = '1'` to `const SEED_VERSION = '2'`.

- [ ] **Step 4: Add the `diffWaiverType` helper.** In `src/services/api.js`, insert immediately after the `WAIVER_NAME` const (line 54). Define it with `export function` (the test imports it by name):

```jsx
// Field-level diff between two waiver-type snapshots → DiffEntry[] (same shape
// diffRubric emits). Custom fields are summarized as a count (entire schema
// arrays in the audit would be noise); requiredDocs as a joined list.
export function diffWaiverType(before, after) {
  const diff = []
  const entity = `Waiver: ${after?.name ?? after?.id ?? 'type'}`
  const b = before ?? {}
  const a = after ?? {}
  if (b.name !== a.name) diff.push({ entity, field: 'name', from: b.name ?? null, to: a.name ?? null })
  if (b.description !== a.description) diff.push({ entity, field: 'description', from: b.description ?? null, to: a.description ?? null })
  if (b.active !== a.active) diff.push({ entity, field: 'active', from: b.active ?? null, to: a.active ?? null })
  const bDocs = (b.requiredDocs ?? []).join(', ')
  const aDocs = (a.requiredDocs ?? []).join(', ')
  if (bDocs !== aDocs) diff.push({ entity, field: 'requiredDocs', from: bDocs, to: aDocs })
  const bCount = (b.formSchema ?? []).length
  const aCount = (a.formSchema ?? []).length
  if (bCount !== aCount) diff.push({ entity, field: 'fieldCount', from: bCount, to: aCount })
  return diff
}
```

- [ ] **Step 5: Run the test (expected PASS) and confirm SEED_VERSION.**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && npx vitest run src/services/__tests__/customFields.parity.test.js && grep -n "SEED_VERSION = " src/services/api.js
```

Expected: 3 passed; grep prints `const SEED_VERSION = '2'`.

- [ ] **Step 6: Commit.**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/services/api.js src/services/__tests__/customFields.parity.test.js && git commit -m "$(cat <<'EOF'
Bump SEED_VERSION to 2; add diffWaiverType audit helper

SEED_VERSION '1'->'2' forces returning demo browsers to rehydrate
the new formSchema-bearing seeds (audit seed-version-gate lesson).
diffWaiverType summarizes waiver-type edits for the audit trail
(field count, not full schema arrays).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21 — api.js demo bodies: createWaiverType / updateWaiverType / deleteWaiverType / fetchWaiverTypeForm + submitWaiver snapshot

**Files**
- Modify: `src/services/api.js` (add 4 new exported functions after `fetchAllWaivers`; `submitWaiver` demo body — request record literal + queue literal)

These are demo bodies that mutate module state and call `safeAudit`. Not pure → edit-with-full-code, then verify via a node round-trip script (Task 23 adds the formal vitest parity tests).

- [ ] **Step 1: Add the four CRUD demo bodies.** In `src/services/api.js`, insert after the `fetchAllWaivers` function (before the `existingRequestHashes` comment block). Full code:

```jsx
// Create a new waiver type. id is client-slugged from the name (TEXT pk).
// New types default INACTIVE so a half-built form never reaches students.
export async function createWaiverType(input, actor = null) {
  if (isSupabaseConfigured) return sb.createWaiverType(input, actor)
  await delay(400)
  const id = slugifyWaiverId(input.name ?? '', waivers.map((w) => w.id))
  const created = {
    id,
    name: input.name ?? '',
    description: input.description ?? '',
    active: input.active ?? false,
    requiredDocs: input.requiredDocs ?? [],
    formSchema: input.formSchema ?? [],
  }
  waivers = [...waivers, created]
  persist()
  await safeAudit({
    action: 'waiver.create',
    actor: actor ?? DEFAULT_ACTOR,
    waiverTypeId: id,
    summary: `Created waiver type "${created.name}"`,
    after: clone(created),
  })
  return clone(created)
}

// Partial patch — only the keys present in `patch` are written; everything
// else (incl. formSchema when saving meta, or meta when saving formSchema) is
// preserved. THIS is the schema-save path: updateWaiverType(id,{formSchema}).
export async function updateWaiverType(id, patch, actor = null) {
  if (isSupabaseConfigured) return sb.updateWaiverType(id, patch, actor)
  await delay(400)
  const idx = waivers.findIndex((w) => w.id === id)
  if (idx < 0) throw new Error(`Unknown waiver type: ${id}`)
  const before = clone(waivers[idx])
  waivers[idx] = { ...waivers[idx], ...patch }
  persist()
  await safeAudit({
    action: 'waiver.update',
    actor: actor ?? DEFAULT_ACTOR,
    waiverTypeId: id,
    summary: `Updated waiver type "${waivers[idx].name}"`,
    before,
    after: clone(waivers[idx]),
    diff: diffWaiverType(before, waivers[idx]),
  })
  return clone(waivers[idx])
}

// SOFT delete only — flip active=false. The live FK requests_waiver_type_id_fkey
// is NO ACTION, so a hard DELETE on a type with request history throws at the DB;
// snapshotting makes soft-delete lossless for history.
export async function deleteWaiverType(id, actor = null) {
  if (isSupabaseConfigured) return sb.deleteWaiverType(id, actor)
  await delay(350)
  const idx = waivers.findIndex((w) => w.id === id)
  if (idx < 0) throw new Error(`Unknown waiver type: ${id}`)
  const before = clone(waivers[idx])
  waivers[idx] = { ...waivers[idx], active: false }
  persist()
  await safeAudit({
    action: 'waiver.delete',
    actor: actor ?? DEFAULT_ACTOR,
    waiverTypeId: id,
    summary: `Archived waiver type "${waivers[idx].name}"`,
    before,
    after: clone(waivers[idx]),
    diff: diffWaiverType(before, waivers[idx]),
  })
  return { ok: true, id }
}

// A single type's live formSchema for the student intake step. [] for
// legacy/missing types (the wizard then skips the custom step entirely).
export async function fetchWaiverTypeForm(waiverTypeId) {
  if (isSupabaseConfigured) return sb.fetchWaiverTypeForm(waiverTypeId)
  await delay(200)
  const w = waivers.find((x) => x.id === waiverTypeId)
  return { waiverTypeId, formSchema: clone(w?.formSchema ?? []) }
}
```

- [ ] **Step 2: Import `slugifyWaiverId` from the engine.** Add a new import line after the existing `import { releaseSeat } ...` line:

```jsx
import { slugifyWaiverId } from '../utils/formSchema.js'
```

- [ ] **Step 3: Extend the demo `submitWaiver` request record with `formSchemaSnapshot`.** The request literal currently is:

```jsx
  const request = {
    id: `req-${Date.now()}`,
    ...payload,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  }
```

`formAnswers` already rides in via `...payload`, but `formSchemaSnapshot` is server-derived and must be stamped explicitly. Replace with:

```jsx
  // Freeze the waiver type's current formSchema at submit so review renders
  // from an immutable copy (mirrors freezeRuleVersion). [] for legacy/no-form
  // types. formAnswers arrives via ...payload; the snapshot is server-derived.
  const wt = waivers.find((w) => w.id === payload.waiverTypeId)
  const formSchemaSnapshot = clone(wt?.formSchema ?? [])
  const request = {
    id: `req-${Date.now()}`,
    ...payload,
    formSchemaSnapshot,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  }
```

- [ ] **Step 4: Add `formAnswers` + `formSchemaSnapshot` to the queue literal (M3 fix).** The queue literal has no spread, so neither field reaches `fetchReviewQueue`/`ReviewDetail`. Locate the queue object literal and add the two keys after `toCourse: payload.toCourse ?? null,`:

```jsx
      fromCourse: payload.fromCourse ?? null,
      toCourse: payload.toCourse ?? null,
      formAnswers: payload.formAnswers ?? {},
      formSchemaSnapshot,
      recommendation,
      ruleVersion: freezeRuleVersion(criteria),
```

(`formSchemaSnapshot` is the const declared in Step 3, in scope here.) **Do NOT** add `formAnswers` to the `evaluateAgainstRubric` arg object (api.js:268-273) — it stays exactly as-is (R1/T16).

- [ ] **Step 5: Verify demo CRUD + submit round-trip with a node script (expected PASS).** Requires `formSchema.js` to exist. Run:

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && node --input-type=module -e "
globalThis.localStorage = undefined;
const api = await import('./src/services/api.js');
const created = await api.createWaiverType({ name: 'Field Trip Waiver', description: 'd', requiredDocs: [], formSchema: [{ id:'q1', type:'shortText', label:'Why?' }] });
console.log('create active default', created.active, 'id', created.id, 'fields', created.formSchema.length);
const upd = await api.updateWaiverType(created.id, { formSchema: [] });
console.log('update preserved name', upd.name, 'fields now', upd.formSchema.length);
const del = await api.deleteWaiverType(created.id);
console.log('soft delete', JSON.stringify(del));
const form = await api.fetchWaiverTypeForm('medical-exemption');
console.log('fetchForm fields', form.formSchema.map(f=>f.type).join(','));
const sub = await api.submitWaiver({ studentId:'S-TEST-1', waiverTypeId:'medical-exemption', documents:[], courseList:[], formAnswers:{ condition:'x' } });
console.log('submit ok', sub.status);
const queue = await api.fetchReviewQueue();
const row = queue.find(r => r.id === sub.requestId);
console.log('queue row has formAnswers', !!row.formAnswers, 'snapshot len', row.formSchemaSnapshot.length);
const mine = await api.fetchMyRequests();
const m = mine.find(r => r.id === sub.requestId);
console.log('myreq has formAnswers', !!m.formAnswers, 'snapshot len', m.formSchemaSnapshot.length);
"
```

Expected output:
```
create active default false id field-trip-waiver fields 1
update preserved name Field Trip Waiver fields now 0
soft delete {"ok":true,"id":"field-trip-waiver"}
fetchForm fields sectionHeader,shortText,multiCheckbox,file,yesNo
submit ok submitted
queue row has formAnswers true snapshot len 5
myreq has formAnswers true snapshot len 5
```

(`localStorage = undefined` forces the in-memory seed path.)

- [ ] **Step 6: Commit.**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/services/api.js && git commit -m "$(cat <<'EOF'
Add waiver-type CRUD demo bodies + submit snapshot stamping

createWaiverType (slugged id, inactive default), updateWaiverType
(partial patch — the schema-save path), deleteWaiverType (soft only),
fetchWaiverTypeForm. submitWaiver freezes formSchemaSnapshot from the
waiver type onto both the submissions record and the queue literal
(M3), so review reads an immutable copy. AI path untouched.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 22 — supabaseApi.js: extract rowToWaiverType, extend mappers, add CRUD + submit columns

**Files**
- Modify: `src/services/supabaseApi.js` (add `rowToWaiverType`; rewrite `fetchAvailableWaivers`/`fetchAllWaivers` to use it; `rowToSubmission`/`rowToQueueRow` add the two form fields; new CRUD wrappers; `submitWaiver` insertRow freeze snapshot + add `form_answers`)

Pure mappers + thin client wrappers. This task adds the code + a node smoke test of module import.

- [ ] **Step 1: Extend `rowToSubmission` and `rowToQueueRow`.** `rowToSubmission`: add after `counselorNote: r.counselor_note ?? undefined,`:

```jsx
    counselorNote: r.counselor_note ?? undefined,
    formAnswers: r.form_answers ?? {},
    formSchemaSnapshot: r.form_schema_snapshot ?? [],
```

`rowToQueueRow`: add after `recommendation: r.recommendation ?? null,`:

```jsx
    recommendation: r.recommendation ?? null,
    formAnswers: r.form_answers ?? {},
    formSchemaSnapshot: r.form_schema_snapshot ?? [],
```

- [ ] **Step 2: Extract `rowToWaiverType` and rewrite the two read fns.** Insert the new mapper after `rowToQueueRow`:

```jsx
function rowToWaiverType(w) {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    active: w.active,
    requiredDocs: w.required_docs ?? [],
    formSchema: w.form_schema ?? [],
  }
}
```

Then replace `fetchAvailableWaivers` and `fetchAllWaivers` to use it:

```jsx
export async function fetchAvailableWaivers() {
  const data = unwrap(await supabase.from('waiver_types').select('*').eq('active', true))
  return data.map(rowToWaiverType)
}

export async function fetchAllWaivers() {
  const data = unwrap(await supabase.from('waiver_types').select('*').order('id'))
  return data.map(rowToWaiverType)
}
```

- [ ] **Step 3: Add the four CRUD client wrappers.** Insert after `fetchAllWaivers` (before the `// ---- Student: submit` comment). The `actor` arg is signature-parity-only (audit stays demo-only in api.js):

```jsx
// createWaiverType is called via the gateway with the raw input; slug the id
// here too so the supabase path is self-contained. The caller passes {name,...}.
export async function createWaiverType(input, _actor = null) {
  const existing = unwrap(await supabase.from('waiver_types').select('id'))
  const id = slugifyWaiverId(input.name ?? '', existing.map((r) => r.id))
  const row = {
    id,
    name: input.name ?? '',
    description: input.description ?? '',
    active: input.active ?? false,
    required_docs: input.requiredDocs ?? [],
    form_schema: input.formSchema ?? [],
  }
  return rowToWaiverType(unwrap(await supabase.from('waiver_types').insert(row).select('*').single()))
}

// Partial patch → snake_case. Only present keys are written. formSchema save
// is just updateWaiverType(id, { formSchema }).
export async function updateWaiverType(id, patch, _actor = null) {
  const row = {}
  if ('name' in patch) row.name = patch.name
  if ('description' in patch) row.description = patch.description
  if ('active' in patch) row.active = patch.active
  if ('requiredDocs' in patch) row.required_docs = patch.requiredDocs
  if ('formSchema' in patch) row.form_schema = patch.formSchema
  return rowToWaiverType(unwrap(await supabase.from('waiver_types').update(row).eq('id', id).select('*').single()))
}

// SOFT delete only — hard DELETE throws the FK NO ACTION violation when the
// type has request history.
export async function deleteWaiverType(id, _actor = null) {
  unwrap(await supabase.from('waiver_types').update({ active: false }).eq('id', id))
  return { ok: true, id }
}

export async function fetchWaiverTypeForm(waiverTypeId) {
  const data = unwrap(
    await supabase.from('waiver_types').select('id, form_schema').eq('id', waiverTypeId).maybeSingle(),
  )
  return { waiverTypeId, formSchema: data?.form_schema ?? [] }
}
```

- [ ] **Step 4: Import `slugifyWaiverId` into supabaseApi.js.** Add after the existing `import { priorityOrderQueue } ...` line:

```jsx
import { slugifyWaiverId } from '../utils/formSchema.js'
```

- [ ] **Step 5: Extend `submitWaiver` insertRow with `form_answers` + frozen `form_schema_snapshot`.** Before building `insertRow`, fetch the live schema; insert after the recommendation block (before `const insertRow = {`):

```jsx
  // Freeze the waiver type's current formSchema at submit (immutable copy, not
  // a live reference). [] for legacy/no-form types. Mirrors freezeRuleVersion.
  const wt = unwrap(
    await supabase.from('waiver_types').select('form_schema').eq('id', payload.waiverTypeId).maybeSingle(),
  )
```

Then add the two keys to the `insertRow` literal, after `documents: payload.documents ?? [],`:

```jsx
    documents: payload.documents ?? [],
    form_answers: payload.formAnswers ?? {},
    form_schema_snapshot: wt?.form_schema ?? [],
```

**Critical AI-isolation note (R1/T16):** the `evaluateAgainstRubric` call (supabaseApi.js:100-105) builds its arg object explicitly from `payload.transcriptData`/`fromCourse`/`toCourse`/`courseList` — **do not** add `formAnswers` to it. It stays exactly as-is. This task touches only `insertRow`, never the eval arg.

- [ ] **Step 6: Verify supabaseApi.js parses + imports clean via node (expected PASS).** Run:

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && node --input-type=module -e "
import('./src/services/supabaseApi.js').then(() => console.log('module imports clean')).catch(e => { console.error('IMPORT FAIL', e.message); process.exit(1); })
"
```

Expected: `module imports clean` (the module-level `import { supabase }` resolves to `null` in node since env is unset, but no top-level call uses it).

- [ ] **Step 7: Commit.**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/services/supabaseApi.js && git commit -m "$(cat <<'EOF'
Wire form columns through supabaseApi mappers + add waiver CRUD

Extract rowToWaiverType (+formSchema) used by both read fns;
rowToSubmission + rowToQueueRow gain formAnswers/formSchemaSnapshot.
New createWaiverType/updateWaiverType(partial->snake)/deleteWaiverType
(soft)/fetchWaiverTypeForm. submitWaiver freezes form_schema_snapshot
from a SELECT and inserts form_answers. evaluateAgainstRubric arg
object untouched — formAnswers never reaches the engine.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 23 — Parity tests (T25-T27) + AI-isolation (T16/T17) + backward-compat (T29)

**Files**
- Modify: `src/services/__tests__/customFields.parity.test.js` (append the parity + isolation + compat suites to the file created in Task 20)

Strategy (advisor-validated): one file-level `vi.mock('../../lib/supabase.js')` that exports `isSupabaseConfigured: false` (keeps `api.js` on demo path) and `supabase: mockClient` (gives `supabaseApi.js` a working fake). The mock client is built in `vi.hoisted` (no `vi.mock` precedent in this repo — hoisting footgun). AI-isolation spies `evaluateAgainstRubric` via `vi.mock('../../utils/schedulingLogic.js')`.

- [ ] **Step 1: Write the failing parity + isolation + compat test suites.** Append to `src/services/__tests__/customFields.parity.test.js` (after the existing `diffWaiverType` describe block). Full appended code:

```js
import { vi, beforeEach, afterEach } from 'vitest'

// ── Hoisted mock state (vi.mock factory is hoisted above imports, so the client
// and its scratch state must live in vi.hoisted or they're TDZ-undefined). ──
const h = vi.hoisted(() => {
  const state = {
    waiverRows: [],          // current waiver_types rows (snake_case)
    insertedRequest: null,   // last requests insert payload
    requestRowToReturn: null, // what a requests SELECT/insert returns
  }
  // A thenable, chainable query builder. Resolution is computed lazily from
  // `op`, `table`, and accumulated filters when the chain is awaited.
  function makeBuilder(table) {
    const ctx = { table, op: 'select', columns: '*', filters: {}, payload: null }
    const resolve = () => {
      if (ctx.table === 'waiver_types') {
        if (ctx.op === 'insert') {
          state.waiverRows.push(ctx.payload)
          return { data: ctx.payload, error: null }
        }
        if (ctx.op === 'update') {
          const row = state.waiverRows.find((r) => r.id === ctx.filters.id)
          if (row) Object.assign(row, ctx.payload)
          return { data: row ?? null, error: null }
        }
        // select
        let rows = state.waiverRows
        if ('id' in ctx.filters) rows = rows.filter((r) => r.id === ctx.filters.id)
        if ('active' in ctx.filters) rows = rows.filter((r) => r.active === ctx.filters.active)
        if (ctx.single || ctx.maybeSingle) return { data: rows[0] ?? null, error: null }
        return { data: rows, error: null }
      }
      if (ctx.table === 'requests') {
        if (ctx.op === 'insert') {
          state.insertedRequest = ctx.payload
          return { data: state.requestRowToReturn ?? { id: 'req-sb-1', status: 'submitted' }, error: null }
        }
        // select: single/maybeSingle → scalar; otherwise → array (queue/list).
        if (ctx.single || ctx.maybeSingle) return { data: state.requestRowToReturn ?? null, error: null }
        return { data: state.requestRowToReturn ? [state.requestRowToReturn] : [], error: null }
      }
      return { data: null, error: null }
    }
    const builder = {
      select(cols) { ctx.columns = cols; ctx.op = ctx.op === 'select' ? 'select' : ctx.op; return builder },
      insert(p) { ctx.op = 'insert'; ctx.payload = p; return builder },
      update(p) { ctx.op = 'update'; ctx.payload = p; return builder },
      eq(col, val) { ctx.filters[col] = val; return builder },
      order() { return builder },
      single() { ctx.single = true; return Promise.resolve(resolve()) },
      maybeSingle() { ctx.maybeSingle = true; return Promise.resolve(resolve()) },
      then(onF, onR) { return Promise.resolve(resolve()).then(onF, onR) },
    }
    return builder
  }
  const mockClient = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-sb-1', email: 's@x.edu', user_metadata: { name: 'SB Student' } } } })) },
    from: vi.fn((table) => makeBuilder(table)),
  }
  return { state, mockClient }
})

// isSupabaseConfigured:false keeps api.js on the demo path; supabase:mockClient
// gives supabaseApi.js a working client (without it, supabase is null → TypeError).
vi.mock('../../lib/supabase.js', () => ({ isSupabaseConfigured: false, supabase: h.mockClient }))

// Spy the engine to prove formAnswers never reaches it.
vi.mock('../../utils/schedulingLogic.js', () => ({
  evaluateAgainstRubric: vi.fn(() => ({ decision: 'review', confidence: 0.5, reason: 'stub', checks: [] })),
  parseTranscriptData: vi.fn(),
}))

import { evaluateAgainstRubric } from '../../utils/schedulingLogic.js'

describe('custom-fields parity + isolation', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear?.()
    h.state.waiverRows = [
      { id: 'medical-exemption', name: 'Medical Exemption', description: 'd', active: true, required_docs: ['supporting'],
        form_schema: [{ id: 'condition', type: 'shortText', label: 'Condition', required: true }] },
    ]
    h.state.insertedRequest = null
    h.state.requestRowToReturn = null
    evaluateAgainstRubric.mockClear()
  })
  afterEach(() => { vi.clearAllMocks() })

  // ── T25: demo round-trip ──────────────────────────────────────────────────
  it('T25 demo: formAnswers round-trip submit → fetchReviewQueue/fetchMyRequests', async () => {
    const api = await import('../api.js')
    const answers = { condition: 'knee recovery' }
    const { requestId } = await api.submitWaiver({
      studentId: 'S-T25', waiverTypeId: 'medical-exemption', documents: [], courseList: [],
      formAnswers: answers,
    })
    const queue = await api.fetchReviewQueue()
    const qRow = queue.find((r) => r.id === requestId)
    expect(qRow.formAnswers).toEqual(answers)
    expect(Array.isArray(qRow.formSchemaSnapshot)).toBe(true)

    const mine = await api.fetchMyRequests()
    const mRow = mine.find((r) => r.id === requestId)
    expect(mRow.formAnswers).toEqual(answers)
    expect(Array.isArray(mRow.formSchemaSnapshot)).toBe(true)
  })

  // ── T26: supabase mapping both directions ─────────────────────────────────
  it('T26 supabase: submitWaiver writes form_answers + frozen snapshot to the requests insert', async () => {
    const sb = await import('../supabaseApi.js')
    const answers = { condition: 'knee recovery' }
    await sb.submitWaiver({ waiverTypeId: 'medical-exemption', documents: [], courseList: [], formAnswers: answers })
    expect(h.state.insertedRequest.form_answers).toEqual(answers)
    expect(h.state.insertedRequest.form_schema_snapshot).toEqual(
      h.state.waiverRows[0].form_schema,
    )
  })

  it('T26 supabase: rowToWaiverType/rowToSubmission map snake↔camel', async () => {
    const sb = await import('../supabaseApi.js')
    const waivers = await sb.fetchAllWaivers()
    expect(waivers[0].formSchema).toEqual([{ id: 'condition', type: 'shortText', label: 'Condition', required: true }])
    expect(waivers[0].requiredDocs).toEqual(['supporting'])

    h.state.requestRowToReturn = {
      id: 'req-sb-9', student_id: 'user-sb-1', waiver_type_id: 'medical-exemption', status: 'submitted',
      form_answers: { condition: 'x' }, form_schema_snapshot: [{ id: 'condition', type: 'shortText', label: 'C' }],
    }
    const got = await sb.fetchRequestStatus('req-sb-9')
    expect(got.formAnswers).toEqual({ condition: 'x' })
    expect(got.formSchemaSnapshot).toEqual([{ id: 'condition', type: 'shortText', label: 'C' }])
  })

  it('T26 supabase: updateWaiverType(formSchema) → form_schema, partial preserves rest', async () => {
    const sb = await import('../supabaseApi.js')
    const newSchema = [{ id: 'q2', type: 'longText', label: 'Why?' }]
    const updated = await sb.updateWaiverType('medical-exemption', { formSchema: newSchema })
    expect(h.state.waiverRows[0].form_schema).toEqual(newSchema)
    expect(h.state.waiverRows[0].name).toBe('Medical Exemption') // untouched
    expect(updated.formSchema).toEqual(newSchema)
  })

  it('T26 supabase: deleteWaiverType is soft (active=false), createWaiverType slugs id + defaults inactive', async () => {
    const sb = await import('../supabaseApi.js')
    await sb.deleteWaiverType('medical-exemption')
    expect(h.state.waiverRows[0].active).toBe(false)
    const created = await sb.createWaiverType({ name: 'Field Trip Form', requiredDocs: [], formSchema: [] })
    expect(created.id).toBe('field-trip-form')
    expect(created.active).toBe(false)
  })

  // ── T27: identical key-sets across both paths ─────────────────────────────
  it('T27 identical key-sets: demo queue row vs supabase queue row carry the same form keys', async () => {
    const api = await import('../api.js')
    const sb = await import('../supabaseApi.js')

    const { requestId } = await api.submitWaiver({
      studentId: 'S-T27', waiverTypeId: 'medical-exemption', documents: [], courseList: [], formAnswers: { condition: 'x' },
    })
    const demoRow = (await api.fetchReviewQueue()).find((r) => r.id === requestId)

    h.state.requestRowToReturn = {
      id: 'req-sb-27', student_id: 'user-sb-1', waiver_type_id: 'medical-exemption', status: 'submitted',
      form_answers: { condition: 'x' }, form_schema_snapshot: h.state.waiverRows[0].form_schema,
    }
    const sbRow = (await sb.fetchReviewQueue()).find((r) => r.id === 'req-sb-27')

    const formKeys = (o) => Object.keys(o).filter((k) => k === 'formAnswers' || k === 'formSchemaSnapshot').sort()
    expect(formKeys(demoRow)).toEqual(['formAnswers', 'formSchemaSnapshot'])
    expect(['formAnswers', 'formSchemaSnapshot'].every((k) => k in sbRow)).toBe(true)
  })

  // ── T16/T17: AI-engine isolation (highest value) ──────────────────────────
  it('T16 demo: evaluateAgainstRubric arg object has NO formAnswers key', async () => {
    const api = await import('../api.js')
    await api.submitWaiver({
      studentId: 'S-T16', waiverTypeId: 'medical-exemption', documents: [], courseList: ['Algebra'],
      transcriptData: { gpa: 3.5, studentGrade: 11 },
      formAnswers: { condition: 'should NOT leak', secret: 'nope' },
    })
    expect(evaluateAgainstRubric).toHaveBeenCalled()
    const arg = evaluateAgainstRubric.mock.calls[0][0]
    expect('formAnswers' in arg).toBe(false)
    expect('condition' in arg).toBe(false)
    expect('secret' in arg).toBe(false)
  })

  it('T16 supabase: evaluateAgainstRubric arg object has NO formAnswers key', async () => {
    const sb = await import('../supabaseApi.js')
    await sb.submitWaiver({
      waiverTypeId: 'medical-exemption', documents: [], courseList: ['Algebra'],
      transcriptData: { gpa: 3.5, studentGrade: 11 },
      formAnswers: { condition: 'should NOT leak' },
    })
    const arg = evaluateAgainstRubric.mock.calls[0][0]
    expect('formAnswers' in arg).toBe(false)
    expect('condition' in arg).toBe(false)
  })

  it('T17 demo: the engine arg is byte-identical with vs without a populated formAnswers sibling', async () => {
    const api = await import('../api.js')
    const base = { studentId: 'S-T17a', waiverTypeId: 'medical-exemption', documents: [], courseList: ['Algebra'], transcriptData: { gpa: 3.5, studentGrade: 11 } }
    await api.submitWaiver({ ...base })
    const without = evaluateAgainstRubric.mock.calls[0][0]
    evaluateAgainstRubric.mockClear()
    await api.submitWaiver({ ...base, studentId: 'S-T17b', formAnswers: { condition: 'x', reasons: ['a', 'b'] } })
    const withAns = evaluateAgainstRubric.mock.calls[0][0]
    expect(withAns).toEqual(without)
  })

  // ── T29: backward compat — legacy request (no form fields) reads null-safe ─
  it('T29 legacy: a pre-feature request without form fields reads back null-safe', async () => {
    const sb = await import('../supabaseApi.js')
    h.state.requestRowToReturn = {
      id: 'req-legacy', student_id: 'user-sb-1', waiver_type_id: 'prereq-override', status: 'submitted',
      // no form_answers / form_schema_snapshot columns present (legacy row)
    }
    const got = await sb.fetchRequestStatus('req-legacy')
    expect(got.formAnswers).toEqual({})
    expect(got.formSchemaSnapshot).toEqual([])

    // demo legacy seed reads null-safe too (a seed with no form fields)
    const api = await import('../api.js')
    const mine = await api.fetchMyRequests()
    const legacy = mine.find((r) => r.formAnswers === undefined)
    if (legacy) expect(() => JSON.stringify(legacy)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the suite (expected PASS — the mock client returns arrays for non-single `requests` selects, so the supabase `fetchReviewQueue` path resolves correctly).**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && npx vitest run src/services/__tests__/customFields.parity.test.js
```

Expected: all tests pass (diffWaiverType ×3 from Task 20 + parity/isolation/compat ×10). If T27's supabase `fetchReviewQueue` returns the wrong shape, confirm the `requests` select branch returns `[state.requestRowToReturn]` (array) when neither `.single` nor `.maybeSingle` is called — the array branch is what `fetchReviewQueue` awaits.

- [ ] **Step 3: Run the entire test suite to confirm no regressions (expected PASS).**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && npm test
```

Expected: all pre-existing suites + the new parity suite pass. The `vi.mock` of `lib/supabase.js` is scoped to the parity file only (vitest isolates module mocks per test file).

- [ ] **Step 4: Commit.**

```bash
cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/services/__tests__/customFields.parity.test.js && git commit -m "$(cat <<'EOF'
Add custom-fields parity + AI-isolation tests (T16/17, T25-27, T29)

T25 demo round-trip; T26 supabase snake<->camel mapping both
directions + CRUD; T27 identical key-sets across paths. T16/T17
spy evaluateAgainstRubric and prove formAnswers never reaches the
engine arg (byte-identical with/without answers). T29 legacy rows
read null-safe. Mock client built in vi.hoisted, dispatches by
table, implements exact query chains.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

> **Intake section preconditions:** the engine (`src/utils/formSchema.js` exporting `buildDefaults`, `validateForm`, `buildFormAnswers`) and `FieldRenderer.jsx` are present by now. `npm test` is `vitest run` with NO jsdom — so **no component test is authored here**; WaiverIntake changes are careful edit tasks with full before/after blocks, each closed by a per-file lint gate (`npx eslint src/features/student-portal/WaiverIntake.jsx`) plus a manual gstack-browse QA note. `buildFormAnswers`'s `relinkFn(fieldId) -> descriptor|null` signature is already pinned by engine Task 12 — the intake submit path (Task 29) uses exactly that shape. Line numbers below reference the file's pre-edit state.

## Task 24 — WaiverIntake pre-flight + imports + steps useMemo replacing STEPS const

**Files**
- Modify: `src/features/student-portal/WaiverIntake.jsx` (imports :1-12; `STEPS` const :17; `WizardSteps` :30-62)

- [ ] **Step 0: Verify upstream deps (no commit).** Confirm both deps exist and export the contract names:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && node -e "const f=require('node:fs'); ['src/utils/formSchema.js','src/features/forms/FieldRenderer.jsx'].forEach(p=>console.log(p, f.existsSync(p)?'OK':'MISSING'))" \
    && grep -E "export (function|const) (buildDefaults|validateForm|buildFormAnswers)" src/utils/formSchema.js \
    && grep -E "export (function|const|default) " src/features/forms/FieldRenderer.jsx
  ```
  Expected: both `OK`; `buildDefaults`, `validateForm`, `buildFormAnswers` all present; `FieldRenderer` exported. If any MISSING → STOP, the engine/renderer sections precede this one.

- [ ] **Step 1: Add engine + FieldRenderer imports.** Edit the import block.

  BEFORE (lines 1-12):
  ```jsx
  import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
  import { fetchAvailableWaivers, uploadStudentDocuments, submitWaiver } from '../../services/api.js'
  import { useAuth } from '../auth/AuthProvider.jsx'
  import { extractTextFromFile } from '../../utils/pdfText.js'
  import { parseTranscriptData } from '../../utils/schedulingLogic.js'
  import { parseCourseListText } from '../../utils/courseListParser.js'
  import { saveTranscript, getSavedTranscripts, saveCourseList, getSavedCourseLists } from '../../services/transcriptStore.js'
  import { UploadZone } from './UploadZone.jsx'
  import { WaiverSelectGrid } from './WaiverSelectGrid.jsx'
  import { RequestTracker } from './RequestTracker.jsx'
  import { CourseSwapPanel } from './CourseSwapPanel.jsx'
  import { CourseListEntry } from './CourseListEntry.jsx'
  ```

  AFTER (import only `buildDefaults` + `validateForm` here; `buildFormAnswers` is added in Task 29 to keep this commit lint-clean of unused vars):
  ```jsx
  import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
  import { fetchAvailableWaivers, uploadStudentDocuments, submitWaiver } from '../../services/api.js'
  import { useAuth } from '../auth/AuthProvider.jsx'
  import { extractTextFromFile } from '../../utils/pdfText.js'
  import { parseTranscriptData } from '../../utils/schedulingLogic.js'
  import { parseCourseListText } from '../../utils/courseListParser.js'
  import { saveTranscript, getSavedTranscripts, saveCourseList, getSavedCourseLists } from '../../services/transcriptStore.js'
  import { buildDefaults, validateForm } from '../../utils/formSchema.js'
  import { UploadZone } from './UploadZone.jsx'
  import { WaiverSelectGrid } from './WaiverSelectGrid.jsx'
  import { RequestTracker } from './RequestTracker.jsx'
  import { CourseSwapPanel } from './CourseSwapPanel.jsx'
  import { CourseListEntry } from './CourseListEntry.jsx'
  import { FieldRenderer } from '../forms/FieldRenderer.jsx'
  ```
  > NOTE: `FieldRenderer` is a NAMED export (confirmed by the renderer section — `export function FieldRenderer`). Keep the named import.

- [ ] **Step 2: Remove the module-level `STEPS` const.** It's replaced by a per-render `steps` useMemo (steps depend on component state).

  BEFORE (lines 16-17):
  ```jsx
  // Guided student intake: Documents -> Waiver type -> Review & submit -> Tracker.
  const STEPS = ['Documents', 'Waiver type', 'Review & submit']
  ```
  AFTER:
  ```jsx
  // Guided student intake: Documents -> Waiver type -> [Additional questions] -> Review & submit -> Tracker.
  // Steps are keyed (not index-gated) because the "Additional questions" step is
  // conditional on the selected waiver type carrying a non-empty formSchema; an
  // index shift would otherwise break the Review step's gating (see steps useMemo).
  ```

- [ ] **Step 3: Make `WizardSteps` consume a `steps` prop instead of the module `STEPS` const.**

  BEFORE (lines 30-33):
  ```jsx
  function WizardSteps({ current, onStepClick }) {
    return (
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
  ```
  AFTER:
  ```jsx
  function WizardSteps({ steps, current, onStepClick }) {
    return (
      <ol className="flex flex-wrap gap-2">
        {steps.map(({ key, label }, i) => {
  ```

  BEFORE (line 37):
  ```jsx
          <li key={label}>
  ```
  AFTER:
  ```jsx
          <li key={key}>
  ```

- [ ] **Step 4: Lint-gate.** Run:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx eslint src/features/student-portal/WaiverIntake.jsx
  ```
  Expected at THIS point: errors for remaining `STEPS` usages (e.g. `STEPS.length`) — that is **expected and intended** (Task 27 fixes them). Tasks 24-27 are one logical unit; the commit lands after Task 27. Do not commit yet.

---

## Task 25 — WaiverIntake steps useMemo + currentKey/isLastStep + custom state

**Files**
- Modify: `src/features/student-portal/WaiverIntake.jsx` (state block; `selectedWaiver` useMemo; add `steps`/`currentKey`/`isLastStep` + stale-state effects)

- [ ] **Step 1: Add `customAnswers` / `customErrors` state.** Place immediately after the `swap` state.

  BEFORE:
  ```jsx
    const [swap, setSwap] = useState({ fromCourse: null, toCourse: null })
  ```
  AFTER:
  ```jsx
    const [swap, setSwap] = useState({ fromCourse: null, toCourse: null })
    // Custom dynamic-form answers + displayed validation errors for the
    // conditional "Additional questions" step. Errors are committed only on a
    // failed Continue (non-nagging), and a field's error clears as the student edits.
    const [customAnswers, setCustomAnswers] = useState({})
    const [customErrors, setCustomErrors] = useState({})
  ```
  > Initialized to `{}` (not `buildDefaults(...)`): at first render `waivers` is loading and `selectedWaiverId` is null, so there is no schema yet. The Step 3 effect seeds defaults the moment a waiver with a schema is selected.

- [ ] **Step 2: Derive the dynamic `steps` array + `currentKey` + `isLastStep`.** Place directly after the existing `selectedWaiver` useMemo and BEFORE `const needsSwap = ...`:
  ```jsx
    // The "Additional questions" step exists only when the chosen waiver type
    // carries a non-empty custom form schema. Steps are objects {key,label} so
    // all gating keys off `currentKey` (identity), never an integer index —
    // inserting/removing this step shifts the Review index and index-gating
    // would silently break the Review step. (spec §5a, trap verified.)
    const hasCustomFields = (selectedWaiver?.formSchema?.length ?? 0) > 0
    const steps = useMemo(
      () => [
        { key: 'documents', label: 'Documents' },
        { key: 'waiver', label: 'Waiver type' },
        ...(hasCustomFields ? [{ key: 'custom', label: 'Additional questions' }] : []),
        { key: 'review', label: 'Review & submit' },
      ],
      [hasCustomFields],
    )
    const currentKey = steps[step]?.key
    const isLastStep = step === steps.length - 1
  ```

- [ ] **Step 3: Add stale-state guards (two effects).** Insert AFTER the `isLastStep` line:
  ```jsx
    // Clear the previous type's answers/errors whenever the chosen type changes,
    // and re-seed defaults from the new type's schema (no uncontrolled flips).
    useEffect(() => {
      setCustomAnswers(buildDefaults(selectedWaiver?.formSchema ?? []))
      setCustomErrors({})
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWaiverId])
    // If the custom step disappears (type changed to one with no schema) while
    // the user is on/after it, clamp the step index into the new range.
    useEffect(() => {
      setStep((s) => Math.min(s, steps.length - 1))
    }, [steps.length])
  ```
  > `selectedWaiverId` (not `selectedWaiver`) is the dep so this fires exactly on user re-selection. The `eslint-disable` is intentional — including `selectedWaiver` would re-run on unrelated `waivers` updates and wipe in-progress answers.

- [ ] **Step 4: Lint-gate.** Run:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx eslint src/features/student-portal/WaiverIntake.jsx
  ```
  Expected: still the `STEPS.length` error (Task 27 fixes). No NEW errors from Steps 1-3 (`buildDefaults` now imported and used). Do not commit yet.

---

## Task 26 — WaiverIntake key-based gating conversion (canAdvance, advanceHint, render blocks)

Converts every integer-index gating site to `currentKey`.

**Files**
- Modify: `src/features/student-portal/WaiverIntake.jsx` (`canAdvance`; `advanceHint`; render guards `step === 0/1/2`; `WizardSteps` call)

- [ ] **Step 1: Convert `canAdvance` to key-based + add the `custom` case.**

  BEFORE:
  ```jsx
    // Step gating: docs step needs a transcript (uploaded or applied previous)
    // plus at least one recognized course; waiver step needs a pick, plus a
    // from/to course pair for swap-style waivers.
    const canAdvance =
      step === 0
        ? Boolean(transcriptFileName) && courseListData.courseNames.length > 0
        : step === 1
          ? Boolean(selectedWaiverId) && (!needsSwap || (swap.fromCourse && swap.toCourse))
          : true
  ```
  AFTER:
  ```jsx
    // Live per-step validity for the custom step — derived, not stored. Displayed
    // errors (customErrors) are a separate, deferred commit (Task 29 handleContinue).
    const customLiveErrors =
      currentKey === 'custom'
        ? validateForm(selectedWaiver?.formSchema ?? [], customAnswers)
        : {}

    // Step gating, keyed by step identity (NOT integer index — the custom step is
    // conditional, so indices shift). docs: transcript + ≥1 recognized course;
    // waiver: a pick + (for swap types) a from/to pair; custom: zero validation
    // errors; review: always advanceable (submit handles the rest).
    const canAdvance =
      currentKey === 'documents'
        ? Boolean(transcriptFileName) && courseListData.courseNames.length > 0
        : currentKey === 'waiver'
          ? Boolean(selectedWaiverId) && (!needsSwap || (swap.fromCourse && swap.toCourse))
          : currentKey === 'custom'
            ? Object.keys(customLiveErrors).length === 0
            : true
  ```

- [ ] **Step 2: Convert `advanceHint` to key-based + add the `custom` hint.**

  BEFORE:
  ```jsx
    // Why "Continue" is disabled — surfaced to the user instead of a dead button.
    const advanceHint =
      step === 0
        ? 'Upload your transcript and enter your course list to continue.'
        : step === 1
          ? needsSwap
            ? 'Select a waiver type and a course swap to continue.'
            : 'Select a waiver type to continue.'
          : ''
  ```
  AFTER:
  ```jsx
    // Why "Continue" is disabled — surfaced to the user instead of a dead button.
    const advanceHint =
      currentKey === 'documents'
        ? 'Upload your transcript and enter your course list to continue.'
        : currentKey === 'waiver'
          ? needsSwap
            ? 'Select a waiver type and a course swap to continue.'
            : 'Select a waiver type to continue.'
          : currentKey === 'custom'
            ? 'Answer the required questions to continue.'
            : ''
  ```

- [ ] **Step 3: Pass `steps` to `WizardSteps`.**

  BEFORE:
  ```jsx
        <WizardSteps current={step} onStepClick={setStep} />
  ```
  AFTER:
  ```jsx
        <WizardSteps steps={steps} current={step} onStepClick={setStep} />
  ```

- [ ] **Step 4: Convert the Documents render guard.** `{step === 0 && (` → `{currentKey === 'documents' && (`.

- [ ] **Step 5: Convert the Waiver-type render guard.** `{step === 1 && (` → `{currentKey === 'waiver' && (`.

- [ ] **Step 6: Convert the Review render guard** (the site the spec calls out as silently breaking under index gating). `{step === 2 && (` → `{currentKey === 'review' && (`.

- [ ] **Step 7: Lint-gate.** Run:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx eslint src/features/student-portal/WaiverIntake.jsx
  ```
  Expected: only the `STEPS.length` reference remains as an error (`'STEPS' is not defined`). `validateForm` now imported and used. No other new errors. Do not commit yet.

---

## Task 27 — WaiverIntake Continue/Submit footer: key-based isLastStep + handleContinue

**Files**
- Modify: `src/features/student-portal/WaiverIntake.jsx` (footer `step < 2`; Continue onClick; last `STEPS.length`; add `handleContinue`)

- [ ] **Step 1: Convert the footer Continue-vs-Submit branch.**

  BEFORE:
  ```jsx
          {step < 2 ? (
            <div className="flex items-center gap-3">
              {!canAdvance && advanceHint && (
                <span className="hidden text-xs text-muted sm:inline">{advanceHint}</span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (step === 0) persistCourseList()
                  setStep((s) => Math.min(STEPS.length - 1, s + 1))
                }}
                disabled={!canAdvance}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          ) : (
  ```
  AFTER:
  ```jsx
          {!isLastStep ? (
            <div className="flex items-center gap-3">
              {!canAdvance && advanceHint && (
                <span className="hidden text-xs text-muted sm:inline">{advanceHint}</span>
              )}
              <button
                type="button"
                onClick={handleContinue}
                disabled={!canAdvance}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          ) : (
  ```

- [ ] **Step 2: Add the `handleContinue` callback.** Place it immediately after `handleSubmit` and BEFORE `const reset = () => {`. It persists the course list when leaving Documents; on the custom step runs `validateForm`, commits errors + focuses the first invalid field on failure; otherwise clears errors and advances:
  ```jsx
    const handleContinue = useCallback(() => {
      if (currentKey === 'documents') persistCourseList()
      if (currentKey === 'custom') {
        const errs = validateForm(selectedWaiver?.formSchema ?? [], customAnswers)
        if (Object.keys(errs).length > 0) {
          setCustomErrors(errs)
          // Focus the first invalid field's error region for screen readers /
          // keyboard users. FieldRenderer renders <p id={`${id}-err`} role="alert">.
          const firstId = (selectedWaiver?.formSchema ?? [])
            .map((f) => f.id)
            .find((id) => errs[id])
          if (firstId) {
            requestAnimationFrame(() => {
              document.getElementById(`${firstId}-err`)?.scrollIntoView({ block: 'center' })
              document.getElementById(firstId)?.focus?.()
            })
          }
          return
        }
        setCustomErrors({})
      }
      setStep((s) => Math.min(steps.length - 1, s + 1))
    }, [currentKey, persistCourseList, selectedWaiver, customAnswers, steps.length])
  ```
  > `steps.length - 1` replaces the old `STEPS.length - 1` cap. `requestAnimationFrame` defers focus to after React commits the error props. The focus target uses the field's `id` on the control (renderer puts `id={field.id}` on inputs); the `-err` node `scrollIntoView` is the resilient fallback.

- [ ] **Step 3: Lint-gate (must now be CLEAN of `STEPS`).** Run:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx eslint src/features/student-portal/WaiverIntake.jsx
  ```
  Expected: zero errors — `STEPS` fully removed; `isLastStep`, `handleContinue`, `validateForm`, `buildDefaults` all used. (`buildFormAnswers` is NOT imported yet — it lands in Task 29 — so no `no-unused-vars` flag.)

- [ ] **Step 4: Commit Tasks 24-27 (gating conversion).** First safe commit point — the wizard is fully key-gated and lints clean, custom step not yet mounted (so behavior is identical for all 8 empty-schema seeds). Run:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && git add src/features/student-portal/WaiverIntake.jsx && git commit -m "$(cat <<'EOF'
WaiverIntake: convert wizard to key-based step gating

Replace the module STEPS const + integer-index gating (step===0/1/2,
step<2, STEPS.length) with a dynamic steps useMemo and currentKey/
isLastStep identity gating. Adds (unmounted) custom-answers state +
stale-state guards (clear answers on waiver change, clamp step on
steps.length change) + handleContinue (validate-on-Continue, focus
first error). Behavior identical for the 8 seeds (formSchema empty
-> no custom step).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
  ```

---

## Task 28 — WaiverIntake: render the conditional "Additional questions" step

**Files**
- Modify: `src/features/student-portal/WaiverIntake.jsx` (insert a new render block between the Waiver-type block end and the Review block start)

- [ ] **Step 1: Mount `<FieldRenderer>` editable behind `currentKey === 'custom'`.** Insert between the closing `)}` of the `{currentKey === 'waiver' && (...)}` block and the `{currentKey === 'review' && (` block:
  ```jsx
        {currentKey === 'custom' && (
          <div className="glass-card space-y-5 p-5">
            <div>
              <h2 className="text-base font-semibold text-ink">Additional questions</h2>
              <p className="mt-1 text-sm text-muted">
                This waiver type asks for a few more details.
              </p>
            </div>
            <FieldRenderer
              fields={selectedWaiver?.formSchema ?? []}
              answers={customAnswers}
              errors={customErrors}
              onChange={(id, value) => {
                setCustomAnswers((prev) => ({ ...prev, [id]: value }))
                // Clear this field's displayed error as the student edits it
                // (non-nagging: errors return only on the next failed Continue).
                setCustomErrors((prev) => {
                  if (!prev[id]) return prev
                  const next = { ...prev }
                  delete next[id]
                  return next
                })
              }}
            />
          </div>
        )}
  ```
  > `readOnly` is omitted (defaults falsy) → editable. File fields inside the renderer hold `File[]` in `customAnswers[id]` and use `docType='custom-field:<id>'` internally; Task 29 relinks them at submit.

- [ ] **Step 2: Lint + commit.** Run:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx eslint src/features/student-portal/WaiverIntake.jsx && git add src/features/student-portal/WaiverIntake.jsx && git commit -m "$(cat <<'EOF'
WaiverIntake: mount conditional Additional-questions step

Render FieldRenderer (editable) for the selected waiver type's
formSchema between Waiver-type and Review. Wires onChange to update
customAnswers and clear a field's displayed error on edit; shows
customErrors. Step only appears when the type carries fields.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
  ```
  Expected: lint clean (`buildFormAnswers` not yet imported → no unused flag). Commit succeeds.

---

## Task 29 — WaiverIntake: submit-time file merge + formAnswers payload + reset

**Files**
- Modify: `src/features/student-portal/WaiverIntake.jsx` (import add `buildFormAnswers`; `handleSubmit`; `reset`)

- [ ] **Step 1: Add the `buildFormAnswers` import.** Edit the engine import line added in Task 24.

  BEFORE:
  ```jsx
  import { buildDefaults, validateForm } from '../../utils/formSchema.js'
  ```
  AFTER:
  ```jsx
  import { buildDefaults, validateForm, buildFormAnswers } from '../../utils/formSchema.js'
  ```

- [ ] **Step 2: Merge custom file answers into the upload + thread `formAnswers` into the submit payload.** `formAnswers` is the ONLY new payload key (AI path untouched). `buildFormAnswers` uses the engine signature `(schema, customAnswers, relinkFn)` with `relinkFn(fieldId) -> descriptor|null` (pinned in Task 12).

  BEFORE:
  ```jsx
    const handleSubmit = useCallback(async () => {
      setSubmitting(true)
      setError(null)
      try {
        // Flatten controlled File[] lists into the plain descriptors the API reads
        // ({name, size, docType}). File objects are never mutated — docType is
        // assigned here, at the seam, from which list each file came.
        const docs = [
          ...transcript.map((f) => ({ name: f.name, size: f.size, docType: 'transcript' })),
          ...supporting.map((f) => ({ name: f.name, size: f.size, docType: 'supporting' })),
        ]
        const upload = await uploadStudentDocuments(docs)
        const res = await submitWaiver({
          studentId,
          waiverTypeId: selectedWaiverId,
          uploadId: upload.uploadId,
          documents: upload.files,
          studentNote: note.trim(),
          courseList: courseListData.courseNames,
          fromCourse: swap.fromCourse,
          toCourse: swap.toCourse,
          transcriptData,
        })
        setSubmittedId(res.requestId)
      } catch (e) {
        setError(e?.message ?? 'Submission failed — please try again.')
      } finally {
        setSubmitting(false)
      }
    }, [transcript, supporting, selectedWaiverId, note, studentId, courseListData, swap, transcriptData])
  ```
  AFTER:
  ```jsx
    const handleSubmit = useCallback(async () => {
      setSubmitting(true)
      setError(null)
      try {
        const schema = selectedWaiver?.formSchema ?? []
        // Custom file-type answers are File[] held in customAnswers under the
        // field id; flatten them with a namespaced docType ('custom-field:<id>')
        // so findMissingDocs (api.js) can never false-match requiredDocs.
        const customFileDocs = schema
          .filter((f) => f.type === 'file')
          .flatMap((f) =>
            (Array.isArray(customAnswers[f.id]) ? customAnswers[f.id] : [])
              .filter((file) => file instanceof File)
              .map((file) => ({ name: file.name, size: file.size, docType: `custom-field:${f.id}` })),
          )

        // Flatten controlled File[] lists into the plain descriptors the API reads
        // ({name, size, docType}). File objects are never mutated — docType is
        // assigned here, at the seam, from which list each file came.
        const docs = [
          ...transcript.map((f) => ({ name: f.name, size: f.size, docType: 'transcript' })),
          ...supporting.map((f) => ({ name: f.name, size: f.size, docType: 'supporting' })),
          ...customFileDocs,
        ]
        const upload = await uploadStudentDocuments(docs)

        // Re-link each custom file answer to its returned descriptor by matching
        // the namespaced docType (upload.files[].type === the docType we sent).
        // buildFormAnswers replaces every file File[] in customAnswers with the
        // descriptor; non-file answers pass through; display-only types are dropped.
        const relinkFile = (fieldId) =>
          upload.files.find((d) => d.type === `custom-field:${fieldId}`) ?? null

        const res = await submitWaiver({
          studentId,
          waiverTypeId: selectedWaiverId,
          uploadId: upload.uploadId,
          documents: upload.files,
          studentNote: note.trim(),
          courseList: courseListData.courseNames,
          fromCourse: swap.fromCourse,
          toCourse: swap.toCourse,
          transcriptData,
          formAnswers: buildFormAnswers(schema, customAnswers, relinkFile),
        })
        setSubmittedId(res.requestId)
      } catch (e) {
        setError(e?.message ?? 'Submission failed — please try again.')
      } finally {
        setSubmitting(false)
      }
    }, [transcript, supporting, selectedWaiver, selectedWaiverId, note, studentId, courseListData, swap, transcriptData, customAnswers])
  ```

- [ ] **Step 3: Clear the new state in `reset()`.**

  BEFORE:
  ```jsx
    const reset = () => {
      setStep(0)
      setTranscript([])
      setTranscriptData(null)
      setTranscriptFileName(null)
      setCourseListEntries(EMPTY_COURSE_BOXES)
      setSupporting([])
      setSelectedWaiverId(null)
      setNote('')
      setSubmittedId(null)
      setError(null)
      setSwap({ fromCourse: null, toCourse: null })
    }
  ```
  AFTER:
  ```jsx
    const reset = () => {
      setStep(0)
      setTranscript([])
      setTranscriptData(null)
      setTranscriptFileName(null)
      setCourseListEntries(EMPTY_COURSE_BOXES)
      setSupporting([])
      setSelectedWaiverId(null)
      setNote('')
      setSubmittedId(null)
      setError(null)
      setSwap({ fromCourse: null, toCourse: null })
      setCustomAnswers({})
      setCustomErrors({})
    }
  ```

- [ ] **Step 4: Lint-gate (final, must be clean) + commit.** Run:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx eslint src/features/student-portal/WaiverIntake.jsx && git add src/features/student-portal/WaiverIntake.jsx && git commit -m "$(cat <<'EOF'
WaiverIntake: thread formAnswers + custom file uploads at submit

Collect custom file-type answers as namespaced 'custom-field:<id>'
docs, upload via the existing uploadStudentDocuments, relink each to
its descriptor, and pass buildFormAnswers(schema, customAnswers,
relink) as the single new formAnswers payload key. AI rubric path
unchanged. reset() clears customAnswers/customErrors.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
  ```
  Expected: zero eslint errors; all imported engine helpers now used.

---

## Task 30 — WaiverIntake full build + manual QA (component-level, no test file)

- [ ] **Step 1: Production build gate.** WaiverIntake has no pure-logic unit test (component). The build is the integration gate that catches a broken import / JSX. Run:
  ```bash
  cd "c:/My projects Main/Schedule AI/schedule-bot" && npx vite build
  ```
  Expected: build succeeds (exit 0). If it fails on `FieldRenderer`/`formSchema` resolution, the upstream sections are not landed (Step 0 should have caught this). No commit (build artifacts are gitignored).

- [ ] **Step 2: Manual QA via gstack-browse (both skins/themes).** No automated equivalent exists (no jsdom). Invoke `gstack-browse` and execute:
  1. Seed demo with the `medical-exemption` field-bearing type (authored in Task 19).
  2. Sign in as student (localStorage `demo_role=student`). Open New waiver request.
  3. Step 1 Documents: upload transcript + course list → Continue.
  4. Step 2 Waiver type: select the field-bearing type. **Verify the "Additional questions" step appears** in `WizardSteps`. Select a no-field type → **verify the step disappears** and prior answers are cleared (Task 25 effect).
  5. Step 3 Additional questions: leave a required field empty, click Continue → **verify the error appears only now (not before), focus jumps to the first invalid field**, and Continue is blocked. Fill it → error clears on edit → Continue advances.
  6. Exercise each rendered field type incl. a `file` field; submit.
  7. **Verify in ReviewDetail** (counselor side — review section) that answers render from the snapshot and the custom file appears once (not doubled).
  8. Repeat under `enterprise` (default) + glass skins, light + dark (`data-theme`).
  Capture before/after screenshots as bug evidence if anything is off. This step gates the slice; it is not committed (verification only).


---

# Part B — Counselor Builder UI

Source of truth: `docs/superpowers/specs/2026-06-22-form-builder-design.md` §6, §11.
Depends on (must land first): engine group (`utils/formSchema.js`: `FIELD_REGISTRY`, `createDefaultField`, `validateSchema`, `makeUniqueId`), FieldRenderer group (`src/features/forms/FieldRenderer.jsx`), gateway group (`createWaiverType` / `updateWaiverType` / `deleteWaiverType` in `services/api.js`).

TDD note: UI components are NOT unit-tested in this repo (no jsdom / testing-library — `npm test` === `vitest run`, pure logic only, per spec §10/U7). `validateSchema` is already covered by the engine group (T10-T13) — referenced, never duplicated here. Therefore the TDD loop for these UI tasks is: build-with-full-code → `npm run build` (must pass, no type/parse errors) → commit. The one pure-logic helper introduced here (`countFields`) gets a real failing→passing vitest. Manual QA via gstack-browse is the acceptance gate (Task B9).

Verified facts used below:
- `requiredDocs` vocabulary is exactly `['courseList','transcript','supporting']` (api.js `findMissingDocs` matches these tokens; mockData seeds use them).
- `Toggle` currently lives inline in `RubricBuilder.jsx:7-31`; spec §11 extracts it to `components/ui/Toggle.jsx`. Task B1 creates that shared file so FormBuilder + FieldConfigPanel import it without depending on RubricBuilder's refactor timing.
- `ConfirmDialog` (`components/ui/ConfirmDialog.jsx`): props `{open,title,message,confirmLabel,cancelLabel,tone,onConfirm,onCancel}`; `tone="danger"` for destructive.
- `actorFromAuth(user, role)` from `services/audit.js`; `useAuth()` returns `{ user, role }`.
- `fetchAllWaivers()` returns every waiver incl. inactive; each row is `{ id, name, description, active, requiredDocs, formSchema }` (gateway group extends the mapper with `formSchema`).

---

## Task B1 — Shared `Toggle` component + `countFields` helper (+ test)

**Files**
- Create: `src/components/ui/Toggle.jsx`
- Modify: `src/utils/formSchema.js` (append `countFields` export near the other public exports)
- Test: `src/utils/__tests__/formSchema.test.js` (append `countFields` describe block; file already exists from engine group)

- [ ] **Step 1: Write failing test for `countFields`.** Append to `src/utils/__tests__/formSchema.test.js`:
```js
import { countFields } from '../formSchema.js'

describe('countFields', () => {
  it('counts only answerable fields (skips sectionHeader + helpText)', () => {
    const schema = [
      { id: 'a', type: 'shortText', label: 'A' },
      { id: 'h', type: 'sectionHeader', label: 'H' },
      { id: 'n', type: 'number', label: 'N' },
      { id: 'p', type: 'helpText', label: 'P' },
    ]
    expect(countFields(schema)).toBe(2)
  })
  it('returns 0 for empty / missing schema', () => {
    expect(countFields([])).toBe(0)
    expect(countFields(undefined)).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL.**
```
npm test -- formSchema
```
Expected: FAIL — `countFields is not a function` (export missing).

- [ ] **Step 3: Add `countFields` to `utils/formSchema.js`.** Append after the existing `validateSchema` export (uses `FIELD_REGISTRY.isDisplayOnly`):
```js
/** Number of answerable fields in a schema (excludes display-only types).
 *  Used by the builder's "N fields" badge. Pure. */
export function countFields(schema) {
  if (!Array.isArray(schema)) return 0
  return schema.filter((f) => !FIELD_REGISTRY[f?.type]?.isDisplayOnly).length
}
```

- [ ] **Step 4: Run the test — expect PASS.**
```
npm test -- formSchema
```
Expected: PASS (full `formSchema` suite green, incl. the new `countFields` block).

- [ ] **Step 5: Create the shared `Toggle` component.** Write `src/components/ui/Toggle.jsx` — verbatim port of the inline RubricBuilder Toggle so the extraction in the RubricBuilder task group can re-import this exact file:
```jsx
// Shared accessible toggle switch. Extracted verbatim from RubricBuilder so the
// Form Builder and Rubric Builder share one control (spec §11).
export function Toggle({ checked, onChange, id, label }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        checked ? 'bg-brand-600' : 'bg-scrim-strong',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}
```

- [ ] **Step 6: Build — expect PASS.**
```
npm run build
```
Expected: build succeeds (new files parse; `Toggle` is unused-but-exported, fine).

- [ ] **Step 7: Commit.**
```
git add src/components/ui/Toggle.jsx src/utils/formSchema.js src/utils/__tests__/formSchema.test.js
git commit -m "$(cat <<'EOF'
Add shared Toggle component + countFields helper for Form Builder

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task B2 — Route + nav entry for `/admin/forms`

**Files**
- Modify: `src/routes/router.jsx` (import at line 11-14 block; route under `/admin` children, line 51)
- Modify: `src/components/layout/navConfig.jsx` (add `IconForm` near line 39; add nav entry at line 107)

- [ ] **Step 1: Add the FormBuilder import to `router.jsx`.** After line 11 (`import { RubricBuilder } ...`), add:
```jsx
import { FormBuilder } from '../features/admin-review/FormBuilder.jsx'
```
(FormBuilder is scaffolded in Task B3; placing the import now means the route compiles only after Task B3 — so commit this task AFTER Task B3's scaffold lands, OR scaffold first. To keep commits independent, do Task B3 Step 1 before this. See Task B3.)

- [ ] **Step 2: Add the route under `/admin` children.** In `router.jsx`, the `/admin` `children` array currently starts (line 50) `{ index: true, element: <ReviewQueue /> },` then `{ path: 'rubric', element: <RubricBuilder /> },`. Insert the forms route immediately after the `rubric` route:
```jsx
          { index: true, element: <ReviewQueue /> },
          { path: 'rubric', element: <RubricBuilder /> },
          { path: 'forms', element: <FormBuilder /> },
          { path: 'batch', element: <BatchSyncDashboard /> },
```

- [ ] **Step 3: Add the `IconForm` SVG to `navConfig.jsx`.** After the `IconRubric` component (ends line 39), add:
```jsx
const IconForm = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="10" height="12" rx="1.5" />
    <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
    <line x1="5.5" y1="8" x2="10.5" y2="8" />
    <line x1="5.5" y1="10.5" x2="8.5" y2="10.5" />
  </svg>
)
```

- [ ] **Step 4: Add the nav entry.** In `navConfig.jsx`, the `admin` array (line 106-114). Insert the Form Builder entry right after the Rubric Builder line (line 107):
```jsx
    { to: '/admin', label: 'Review Queue', end: true, section: 'Review', icon: <IconQueue /> },
    { to: '/admin/rubric', label: 'Rubric Builder', section: 'Review', icon: <IconRubric /> },
    { to: '/admin/forms', label: 'Form Builder', section: 'Review', icon: <IconForm /> },
    { to: '/admin/rejected', label: 'Rejected', section: 'Review', icon: <IconRejected /> },
```

- [ ] **Step 5: Build — expect PASS.**
```
npm run build
```
Expected: PASS (requires Task B3 scaffold to exist; sequence Task B3 Step 1 before this build).

- [ ] **Step 6: Commit.**
```
git add src/routes/router.jsx src/components/layout/navConfig.jsx
git commit -m "$(cat <<'EOF'
Wire /admin/forms route + Form Builder nav entry

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task B3 — FormBuilder scaffold + left rail (waiver-type list, load, select, + New, delete)

**Files**
- Create: `src/features/admin-review/FormBuilder.jsx` (scaffold: state, load, left rail; right pane is a stub filled in Tasks B5–B7)

- [ ] **Step 1: Create the FormBuilder scaffold with the left rail.** Write `src/features/admin-review/FormBuilder.jsx`:
```jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchAllWaivers,
  createWaiverType,
  updateWaiverType,
  deleteWaiverType,
} from '../../services/api.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { actorFromAuth } from '../../services/audit.js'
import { countFields, validateSchema, createDefaultField } from '../../utils/formSchema.js'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { Toggle } from '../../components/ui/Toggle.jsx'
import { FieldRenderer } from '../forms/FieldRenderer.jsx'
import { FieldConfigPanel } from './FieldConfigPanel.jsx'

const REQUIRED_DOC_OPTIONS = [
  { value: 'courseList', label: 'Course list' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'supporting', label: 'Supporting document' },
]

export function FormBuilder() {
  const { user, role } = useAuth()
  const [waivers, setWaivers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [error, setError] = useState(null)
  const [schemaErrors, setSchemaErrors] = useState({})   // { [fieldId]: msg }
  const [formError, setFormError] = useState(null)        // form-level (e.g. name)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // waiver pending soft-delete
  const [showPalette, setShowPalette] = useState(false)

  const selected = useMemo(
    () => waivers.find((w) => w.id === selectedId) ?? null,
    [waivers, selectedId],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAllWaivers()
      .then((w) => {
        if (cancelled) return
        setWaivers(w)
        setSelectedId(w[0]?.id ?? null)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message ?? 'Failed to load')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Auto-dismiss the "Saved" confirmation.
  useEffect(() => {
    if (!savedMsg) return undefined
    const t = setTimeout(() => setSavedMsg(false), 2500)
    return () => clearTimeout(t)
  }, [savedMsg])

  // Selecting a different type clears transient per-type editor state.
  useEffect(() => {
    setSelectedFieldId(null)
    setShowPreview(false)
    setSchemaErrors({})
    setFormError(null)
  }, [selectedId])

  const patchSelected = useCallback((patch) => {
    setWaivers((prev) => prev.map((w) => (w.id === selectedId ? { ...w, ...patch } : w)))
    setDirty(true)
    setSavedMsg(false)
  }, [selectedId])

  const handleNew = useCallback(async () => {
    setError(null)
    try {
      const created = await createWaiverType(
        {
          name: 'Untitled form',
          description: '',
          active: false,          // new forms start inactive — students never see a half-built form
          requiredDocs: [],
          formSchema: [],
        },
        actorFromAuth(user, role),
      )
      setWaivers((prev) => [...prev, created])
      setSelectedId(created.id)
      setDirty(false)
      setSavedMsg(false)
    } catch (err) {
      setError(err?.message ?? 'Could not create form')
    }
  }, [user, role])

  const confirmDelete = useCallback(async () => {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    setError(null)
    try {
      await deleteWaiverType(target.id, actorFromAuth(user, role)) // soft-delete (active=false)
      setWaivers((prev) => prev.map((w) => (w.id === target.id ? { ...w, active: false } : w)))
    } catch (err) {
      setError(err?.message ?? 'Could not deactivate form')
    }
  }, [pendingDelete, user, role])

  // Field ops + save are added in Tasks B5–B7; placeholders keep the scaffold compiling.
  const handleSave = useCallback(() => {}, [])
  const addField = useCallback(() => {}, [])
  const moveField = useCallback(() => {}, [])
  const removeField = useCallback(() => {}, [])
  const patchField = useCallback(() => {}, [])

  if (loading) {
    return (
      <section>
        <p className="text-sm text-muted">Loading…</p>
      </section>
    )
  }

  if (error && waivers.length === 0) {
    return (
      <section>
        <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
      </section>
    )
  }

  return (
    <section className="fade-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Form Builder</h1>
          <p className="mt-1 text-sm text-muted">
            Author the custom questions students answer for each waiver type.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {savedMsg && (
            <span className="text-sm font-medium text-success-700 dark:text-success-300" role="status">
              Saved
            </span>
          )}
          {error && (
            <span className="text-sm text-danger-600 dark:text-danger-400" role="alert">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* LEFT RAIL — waiver-type list */}
        <aside className="glass-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Forms</h2>
            <button
              type="button"
              onClick={handleNew}
              className="glass-input rounded-lg px-2 py-1 text-xs font-medium text-ink transition hover:bg-glass-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              + New
            </button>
          </div>
          <ul className="space-y-1" role="list">
            {waivers.map((w) => (
              <li key={w.id}>
                <div
                  className={[
                    'group flex items-center gap-2 rounded-lg px-2 py-2 transition',
                    w.id === selectedId ? 'bg-glass-hover ring-1 ring-brand-600/40' : 'hover:bg-glass-hover',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    aria-current={w.id === selectedId}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        'h-2 w-2 flex-shrink-0 rounded-full',
                        w.active ? 'bg-success-600' : 'bg-scrim-strong',
                      ].join(' ')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{w.name}</span>
                      <span className="block text-xs text-muted">{countFields(w.formSchema)} fields</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(w)}
                    aria-label={`Deactivate ${w.name}`}
                    className="flex-shrink-0 rounded-md p-1 text-muted opacity-0 transition hover:text-danger-600 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 group-hover:opacity-100"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l8 8M14 6l-8 8" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* RIGHT PANE — type editor (meta in Task B4, fields in Tasks B5–B7) */}
        <div className="glass-card p-5">
          {!selected ? (
            <p className="text-sm text-muted">Select a form on the left, or create a new one.</p>
          ) : (
            <RightPane
              selected={selected}
              patchSelected={patchSelected}
              schemaErrors={schemaErrors}
              formError={formError}
              showPreview={showPreview}
              setShowPreview={setShowPreview}
              selectedFieldId={selectedFieldId}
              setSelectedFieldId={setSelectedFieldId}
              showPalette={showPalette}
              setShowPalette={setShowPalette}
              addField={addField}
              moveField={moveField}
              removeField={removeField}
              patchField={patchField}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Deactivate this form?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" will be hidden from students. Past submissions keep their own frozen copy, so history is unaffected. You can reactivate it later.`
            : ''
        }
        confirmLabel="Deactivate"
        cancelLabel="Keep active"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}

// RightPane is fleshed out across Tasks B4–B7. Scaffold renders type meta only.
function RightPane({ selected, patchSelected }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Editing: <span className="font-medium text-ink">{selected.name}</span></p>
    </div>
  )
}

export { REQUIRED_DOC_OPTIONS }
```

- [ ] **Step 2: Build — expect PASS.**
```
npm run build
```
Expected: PASS. (`FieldConfigPanel` import resolves once Task B8 lands — if building this task in isolation, temporarily stub the import; preferred sequence: author Task B8's scaffold export first, OR comment the FieldConfigPanel import + usage until Task B6. To keep this task self-contained, create a minimal `FieldConfigPanel.jsx` stub now — see Step 3.)

- [ ] **Step 3: Create a minimal `FieldConfigPanel` stub so the scaffold compiles.** Write `src/features/admin-review/FieldConfigPanel.jsx`:
```jsx
// Stub — full per-field config matrix lands in Task B8.
export function FieldConfigPanel() {
  return null
}
```

- [ ] **Step 4: Build again — expect PASS.**
```
npm run build
```
Expected: PASS (FieldRenderer + gateway fns resolve from their respective groups; FieldConfigPanel stub resolves).

- [ ] **Step 5: Commit.**
```
git add src/features/admin-review/FormBuilder.jsx src/features/admin-review/FieldConfigPanel.jsx
git commit -m "$(cat <<'EOF'
FormBuilder scaffold: master/detail shell + waiver-type left rail

Load via fetchAllWaivers; + New creates inactive type; soft-delete via
ConfirmDialog calling deleteWaiverType. Right pane + field ops stubbed.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task B4 — Right pane: type meta editor (name / description / active / required docs)

**Files**
- Modify: `src/features/admin-review/FormBuilder.jsx` (replace the `RightPane` stub from Task B3)

- [ ] **Step 1: Replace the `RightPane` stub with the meta editor.** In `FormBuilder.jsx`, replace the entire `RightPane` function (the scaffold version) with:
```jsx
function RightPane({
  selected, patchSelected, schemaErrors, formError,
  showPreview, setShowPreview, selectedFieldId, setSelectedFieldId,
  showPalette, setShowPalette, addField, moveField, removeField, patchField,
}) {
  const toggleDoc = (docValue) => {
    const cur = Array.isArray(selected.requiredDocs) ? selected.requiredDocs : []
    const next = cur.includes(docValue) ? cur.filter((d) => d !== docValue) : [...cur, docValue]
    patchSelected({ requiredDocs: next })
  }

  return (
    <div className="space-y-6">
      {/* Type meta */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="ft-name" className="text-xs font-medium text-muted">Form name</label>
          <input
            id="ft-name"
            type="text"
            value={selected.name ?? ''}
            onChange={(e) => patchSelected({ name: e.target.value })}
            className="glass-input px-3 py-2 text-sm text-ink"
            placeholder="e.g. Medical Exemption"
          />
          {formError && (
            <p className="text-xs text-danger-600 dark:text-danger-400" role="alert">{formError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="ft-desc" className="text-xs font-medium text-muted">Description</label>
          <textarea
            id="ft-desc"
            rows={2}
            value={selected.description ?? ''}
            onChange={(e) => patchSelected({ description: e.target.value })}
            className="glass-input px-3 py-2 text-sm text-ink"
            placeholder="Shown to students when they pick this waiver type."
          />
        </div>

        <div className="flex items-center gap-3">
          <Toggle
            id="ft-active"
            checked={!!selected.active}
            onChange={(val) => patchSelected({ active: val })}
            label={`${selected.active ? 'Deactivate' : 'Activate'} ${selected.name}`}
          />
          <span className="text-sm text-muted">
            {selected.active ? 'Active — offered to students' : 'Inactive — hidden from students'}
          </span>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium text-muted">Required documents</legend>
          <div className="flex flex-wrap gap-3">
            {REQUIRED_DOC_OPTIONS.map((opt) => {
              const checked = (selected.requiredDocs ?? []).includes(opt.value)
              return (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDoc(opt.value)}
                    className="h-4 w-4 rounded border-hairline-strong text-brand-600 focus:ring-brand-600"
                  />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </fieldset>
      </div>

      {/* Custom fields section — built in Tasks B5–B7 */}
      <FieldsSection
        selected={selected}
        schemaErrors={schemaErrors}
        showPreview={showPreview}
        setShowPreview={setShowPreview}
        selectedFieldId={selectedFieldId}
        setSelectedFieldId={setSelectedFieldId}
        showPalette={showPalette}
        setShowPalette={setShowPalette}
        addField={addField}
        moveField={moveField}
        removeField={removeField}
        patchField={patchField}
      />
    </div>
  )
}

// FieldsSection stub — replaced in Task B5.
function FieldsSection() {
  return null
}
```

- [ ] **Step 2: Build — expect PASS.**
```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit.**
```
git add src/features/admin-review/FormBuilder.jsx
git commit -m "$(cat <<'EOF'
FormBuilder: type meta editor (name/description/active/required docs)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task B5 — Custom-fields list + Add palette (11 types) + reorder + delete

**Files**
- Modify: `src/features/admin-review/FormBuilder.jsx` (real `addField`/`moveField`/`removeField`/`patchField` callbacks in `FormBuilder`; replace `FieldsSection` stub)

- [ ] **Step 1: Replace the placeholder field-op callbacks in `FormBuilder`.** In `FormBuilder`, replace the five placeholder callbacks (`handleSave` stays a placeholder until Task B7; replace the other four):
```jsx
  const setSelectedSchema = useCallback((updater) => {
    setWaivers((prev) =>
      prev.map((w) =>
        w.id === selectedId
          ? { ...w, formSchema: updater(Array.isArray(w.formSchema) ? w.formSchema : []) }
          : w,
      ),
    )
    setDirty(true)
    setSavedMsg(false)
  }, [selectedId])

  const addField = useCallback((type) => {
    setSelectedSchema((schema) => {
      const field = createDefaultField(type)   // id auto-slugged from label; type-appropriate defaults
      setSelectedFieldId(field.id)
      return [...schema, field]
    })
    setShowPalette(false)
  }, [setSelectedSchema])

  const moveField = useCallback((id, dir) => {
    setSelectedSchema((schema) => {
      const i = schema.findIndex((f) => f.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= schema.length) return schema
      const next = schema.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [setSelectedSchema])

  const removeField = useCallback((id) => {
    setSelectedSchema((schema) => schema.filter((f) => f.id !== id))
    setSelectedFieldId((cur) => (cur === id ? null : cur))
  }, [setSelectedSchema])

  const patchField = useCallback((id, patch) => {
    setSelectedSchema((schema) => schema.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [setSelectedSchema])
```
(Keep `const handleSave = useCallback(() => {}, [])` — replaced in Task B7. Remove the old stub lines for `addField`/`moveField`/`removeField`/`patchField`.)

- [ ] **Step 2: Define the field-type palette constant.** Near the top of `FormBuilder.jsx`, after `REQUIRED_DOC_OPTIONS`, add (uses `FIELD_REGISTRY` for labels so it stays in lockstep with the engine):
```jsx
import { FIELD_REGISTRY } from '../../utils/formSchema.js'

const PALETTE_TYPES = [
  'shortText', 'longText', 'number', 'date',
  'select', 'radio', 'multiCheckbox', 'yesNo',
  'file', 'sectionHeader', 'helpText',
]
```
(Add `FIELD_REGISTRY` to the existing `from '../../utils/formSchema.js'` import rather than a second import line — the existing import is `import { countFields, validateSchema, createDefaultField } from '../../utils/formSchema.js'`; extend it to `import { countFields, validateSchema, createDefaultField, FIELD_REGISTRY } from '../../utils/formSchema.js'`.)

- [ ] **Step 3: Replace the `FieldsSection` stub with the real list + palette + preview slot.**
```jsx
function FieldsSection({
  selected, schemaErrors, showPreview, setShowPreview,
  selectedFieldId, setSelectedFieldId, showPalette, setShowPalette,
  addField, moveField, removeField, patchField,
}) {
  const schema = Array.isArray(selected.formSchema) ? selected.formSchema : []
  const selectedField = schema.find((f) => f.id === selectedFieldId) ?? null

  return (
    <div className="space-y-4 border-t border-hairline pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">Custom fields</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            aria-pressed={showPreview}
            className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            {showPreview ? 'Edit fields' : 'Preview'}
          </button>
          {!showPreview && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPalette((v) => !v)}
                aria-expanded={showPalette}
                className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                + Add field
              </button>
              {showPalette && (
                <div
                  role="menu"
                  className="glass-card absolute right-0 z-20 mt-2 grid w-64 grid-cols-2 gap-1 p-2 shadow-lg"
                >
                  {PALETTE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="menuitem"
                      onClick={() => addField(type)}
                      className="rounded-lg px-2 py-2 text-left text-xs font-medium text-ink transition hover:bg-glass-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                    >
                      {FIELD_REGISTRY[type]?.label ?? type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPreview ? (
        <div className="rounded-xl bg-scrim p-4 ring-1 ring-hairline">
          {schema.length === 0 ? (
            <p className="text-sm text-muted">No custom fields — nothing to preview.</p>
          ) : (
            <FieldRenderer fields={schema} answers={{}} onChange={() => {}} errors={{}} readOnly />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Field list */}
          <ul className="space-y-1" role="list">
            {schema.length === 0 && (
              <li className="text-sm text-muted">No fields yet. Use “+ Add field”.</li>
            )}
            {schema.map((f, i) => (
              <li key={f.id}>
                <div
                  className={[
                    'flex items-center gap-2 rounded-lg px-2 py-2 transition',
                    f.id === selectedFieldId ? 'bg-glass-hover ring-1 ring-brand-600/40' : 'hover:bg-glass-hover',
                    schemaErrors[f.id] ? 'ring-1 ring-danger-600/50' : '',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFieldId(f.id)}
                    className="flex min-w-0 flex-1 flex-col text-left focus:outline-none"
                  >
                    <span className="truncate text-sm font-medium text-ink">
                      {f.label || <span className="text-muted italic">Untitled field</span>}
                    </span>
                    <span className="text-xs text-muted">{FIELD_REGISTRY[f.type]?.label ?? f.type}</span>
                    {schemaErrors[f.id] && (
                      <span className="text-xs text-danger-600 dark:text-danger-400">{schemaErrors[f.id]}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(f.id, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${f.label || 'field'} up`}
                    className="flex-shrink-0 rounded-md p-1 text-muted transition hover:text-ink disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 12l4-4 4 4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(f.id, 1)}
                    disabled={i === schema.length - 1}
                    aria-label={`Move ${f.label || 'field'} down`}
                    className="flex-shrink-0 rounded-md p-1 text-muted transition hover:text-ink disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 8l4 4 4-4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(f.id)}
                    aria-label={`Delete ${f.label || 'field'}`}
                    className="flex-shrink-0 rounded-md p-1 text-muted transition hover:text-danger-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l8 8M14 6l-8 8" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Per-field config (Task B8) */}
          <div>
            {selectedField ? (
              <FieldConfigPanel
                field={selectedField}
                schema={schema}
                error={schemaErrors[selectedField.id]}
                onPatch={(patch) => patchField(selectedField.id, patch)}
              />
            ) : (
              <p className="text-sm text-muted">Select a field to configure it.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Build — expect PASS.**
```
npm run build
```
Expected: PASS (FieldConfigPanel stub returns null, so the config slot renders nothing yet).

- [ ] **Step 5: Commit.**
```
git add src/features/admin-review/FormBuilder.jsx
git commit -m "$(cat <<'EOF'
FormBuilder: custom-fields list, add palette (11 types), reorder, delete, preview toggle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task B6 — Save + schema validation (validateSchema gate, whole-form updateWaiverType)

**Files**
- Modify: `src/features/admin-review/FormBuilder.jsx` (replace the `handleSave` placeholder)

- [ ] **Step 1: Replace the `handleSave` placeholder with the validating save.** In `FormBuilder`, replace `const handleSave = useCallback(() => {}, [])` with:
```jsx
  const handleSave = useCallback(async () => {
    if (!selected) return
    setError(null)
    setFormError(null)
    setSchemaErrors({})

    // Engine-validated (dup ids, choice options, labels, number min<=max, known type).
    const result = validateSchema(selected.formSchema ?? [])
    const nameMissing = !String(selected.name ?? '').trim()
    if (!result.ok || nameMissing) {
      setSchemaErrors(result.errors ?? {})
      setFormError(nameMissing ? 'Form name is required.' : result.formError)
      return // block — do NOT call the gateway
    }

    setSaving(true)
    try {
      const saved = await updateWaiverType(
        selected.id,
        {
          name: selected.name,
          description: selected.description ?? '',
          active: !!selected.active,
          requiredDocs: selected.requiredDocs ?? [],
          formSchema: selected.formSchema ?? [],
        },
        actorFromAuth(user, role),
      )
      setWaivers((prev) => prev.map((w) => (w.id === saved.id ? saved : w)))
      setDirty(false)
      setSavedMsg(true)
    } catch (err) {
      setError(err?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [selected, user, role])
```

- [ ] **Step 2: Build — expect PASS.**
```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit.**
```
git add src/features/admin-review/FormBuilder.jsx
git commit -m "$(cat <<'EOF'
FormBuilder: validateSchema-gated save via updateWaiverType (whole-form patch)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task B7 — Stale-state guards (clamp selection on delete; deselect deleted field already handled)

**Files**
- Modify: `src/features/admin-review/FormBuilder.jsx` (add a clamp effect)

- [ ] **Step 1: Add an effect that reselects a valid type if the selected one disappears.** In `FormBuilder`, after the existing `useEffect` that clears per-type editor state on `selectedId` change, add:
```jsx
  // If the selected type is no longer in the list (e.g. data reload removed it),
  // fall back to the first available type so the right pane never shows a stale id.
  useEffect(() => {
    if (selectedId && !waivers.some((w) => w.id === selectedId)) {
      setSelectedId(waivers[0]?.id ?? null)
    }
  }, [waivers, selectedId])
```
(Soft-delete keeps the row in `waivers` with `active=false`, so it stays selectable — this guard only fires on a true removal/reload mismatch. Field deselect-on-delete is already handled in `removeField` (Task B5).)

- [ ] **Step 2: Build — expect PASS.**
```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit.**
```
git add src/features/admin-review/FormBuilder.jsx
git commit -m "$(cat <<'EOF'
FormBuilder: clamp selection to a valid type if the selected id vanishes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task B8 — FieldConfigPanel (per-field config matrix, spec §6c) + options editor

**Files**
- Modify: `src/features/admin-review/FieldConfigPanel.jsx` (replace the Task B3 stub with the full component)

- [ ] **Step 1: Replace the stub with the full per-field config component.** Write `src/features/admin-review/FieldConfigPanel.jsx`:
```jsx
import { Toggle } from '../../components/ui/Toggle.jsx'
import { FIELD_REGISTRY, makeUniqueId } from '../../utils/formSchema.js'

const CHOICE_TYPES = new Set(['select', 'radio', 'multiCheckbox'])

// Per-field configuration matrix (spec §6c). Renders only the controls that
// apply to the field's type. The field `id` is shown read-only — editing it
// would orphan stored answers (immutable-after-submit convention, D2/R-m3).
export function FieldConfigPanel({ field, schema = [], error, onPatch }) {
  const meta = FIELD_REGISTRY[field.type]
  const isDisplayOnly = !!meta?.isDisplayOnly
  const isChoice = CHOICE_TYPES.has(field.type)
  const options = Array.isArray(field.options) ? field.options : []

  const addOption = () => {
    const taken = new Set(options.map((o) => o.value))
    const value = makeUniqueId('option', taken) // slug + collision suffix
    onPatch({ options: [...options, { value, label: '' }] })
  }
  const patchOption = (i, patch) => {
    onPatch({ options: options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) })
  }
  const removeOption = (i) => {
    onPatch({ options: options.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4 rounded-xl bg-scrim p-4 ring-1 ring-hairline">
      <div>
        <p className="text-xs text-muted">
          field id: <code className="rounded bg-glass-weak px-1 py-0.5 text-[11px] text-ink ring-1 ring-hairline">{field.id}</code>
        </p>
        <p className="mt-0.5 text-xs text-muted">{meta?.label ?? field.type}</p>
        {error && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400" role="alert">{error}</p>}
      </div>

      {/* label — all types */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`fc-label-${field.id}`} className="text-xs font-medium text-muted">Label</label>
        <input
          id={`fc-label-${field.id}`}
          type="text"
          value={field.label ?? ''}
          onChange={(e) => onPatch({ label: e.target.value })}
          className="glass-input px-3 py-2 text-sm text-ink"
        />
      </div>

      {/* content — display-only types */}
      {isDisplayOnly && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`fc-content-${field.id}`} className="text-xs font-medium text-muted">Body text</label>
          <textarea
            id={`fc-content-${field.id}`}
            rows={3}
            value={field.content ?? ''}
            onChange={(e) => onPatch({ content: e.target.value })}
            className="glass-input px-3 py-2 text-sm text-ink"
          />
        </div>
      )}

      {/* helpText + required — all INPUT types */}
      {!isDisplayOnly && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor={`fc-help-${field.id}`} className="text-xs font-medium text-muted">Help text</label>
            <input
              id={`fc-help-${field.id}`}
              type="text"
              value={field.helpText ?? ''}
              onChange={(e) => onPatch({ helpText: e.target.value })}
              className="glass-input px-3 py-2 text-sm text-ink"
            />
          </div>
          <div className="flex items-center gap-3">
            <Toggle
              id={`fc-required-${field.id}`}
              checked={!!field.required}
              onChange={(val) => onPatch({ required: val })}
              label={`Required: ${field.label || field.id}`}
            />
            <span className="text-sm text-muted">{field.required ? 'Required' : 'Optional'}</span>
          </div>
        </>
      )}

      {/* placeholder — shortText / number / select */}
      {['shortText', 'number', 'select'].includes(field.type) && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`fc-ph-${field.id}`} className="text-xs font-medium text-muted">Placeholder</label>
          <input
            id={`fc-ph-${field.id}`}
            type="text"
            value={field.placeholder ?? ''}
            onChange={(e) => onPatch({ placeholder: e.target.value })}
            className="glass-input px-3 py-2 text-sm text-ink"
          />
        </div>
      )}

      {/* options — choice types */}
      {isChoice && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted">Options</span>
          {options.length === 0 && <p className="text-xs text-muted">No options yet.</p>}
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={o.label ?? ''}
                onChange={(e) => patchOption(i, { label: e.target.value })}
                placeholder="Option label"
                className="glass-input flex-1 px-2 py-1.5 text-sm text-ink"
                aria-label={`Option ${i + 1} label`}
              />
              <code className="rounded bg-glass-weak px-1 py-0.5 text-[11px] text-muted ring-1 ring-hairline">{o.value}</code>
              <button
                type="button"
                onClick={() => removeOption(i)}
                aria-label={`Remove option ${i + 1}`}
                className="rounded-md p-1 text-muted transition hover:text-danger-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l8 8M14 6l-8 8" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="self-start glass-input rounded-lg px-2 py-1 text-xs font-medium text-ink transition hover:bg-glass-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            + Add option
          </button>
        </div>
      )}

      {/* min / max / step — number */}
      {field.type === 'number' && (
        <div className="flex flex-wrap gap-3">
          {['min', 'max', 'step'].map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <label htmlFor={`fc-${k}-${field.id}`} className="text-xs font-medium text-muted capitalize">{k}</label>
              <input
                id={`fc-${k}-${field.id}`}
                type="number"
                value={field[k] ?? ''}
                onChange={(e) => onPatch({ [k]: e.target.value === '' ? null : Number(e.target.value) })}
                className="glass-input w-24 px-2 py-1.5 text-sm text-ink"
              />
            </div>
          ))}
        </div>
      )}

      {/* maxLength — shortText / longText */}
      {['shortText', 'longText'].includes(field.type) && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`fc-maxlen-${field.id}`} className="text-xs font-medium text-muted">Max length</label>
          <input
            id={`fc-maxlen-${field.id}`}
            type="number"
            min="0"
            value={field.maxLength ?? ''}
            onChange={(e) => onPatch({ maxLength: e.target.value === '' ? null : Number(e.target.value) })}
            className="glass-input w-28 px-2 py-1.5 text-sm text-ink"
          />
        </div>
      )}

      {/* accept / multiple — file */}
      {field.type === 'file' && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor={`fc-accept-${field.id}`} className="text-xs font-medium text-muted">Accepted types</label>
            <input
              id={`fc-accept-${field.id}`}
              type="text"
              value={field.accept ?? ''}
              onChange={(e) => onPatch({ accept: e.target.value })}
              placeholder=".pdf,.png,.jpg"
              className="glass-input px-3 py-2 text-sm text-ink"
            />
          </div>
          <div className="flex items-center gap-3">
            <Toggle
              id={`fc-multiple-${field.id}`}
              checked={!!field.multiple}
              onChange={(val) => onPatch({ multiple: val })}
              label="Allow multiple files"
            />
            <span className="text-sm text-muted">{field.multiple ? 'Multiple files' : 'Single file'}</span>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build — expect PASS.**
```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit.**
```
git add src/features/admin-review/FieldConfigPanel.jsx
git commit -m "$(cat <<'EOF'
FieldConfigPanel: per-field config matrix (spec 6c) + options editor

Read-only frozen field id; type-gated controls; auto-slugged option values.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task B9 — Manual QA gate (gstack-browse, both skins + themes)

No code. Acceptance gate per spec §10 "Manual QA". Prereq: engine + FieldRenderer + gateway groups landed; dev server running; admin/counselor session.

- [ ] **Step 1: Launch the app and sign in as a counselor (DB-admin role).** `npm run dev`; use gstack-browse to open `/admin/forms`.

- [ ] **Step 2: Build a form exercising all 11 types.** Click **+ New** (verify it appears in the left rail with an inactive grey dot and "0 fields"). Set a name. Add one of each: shortText, longText, number (set min/max/step), date, select (≥2 options), radio (≥2 options), multiCheckbox (≥2 options), yesNo, file (set accept + multiple), sectionHeader (set content), helpText (set content). Verify the "N fields" badge counts 9 (display-only excluded).

- [ ] **Step 3: Reorder + delete.** Move a field up/down with ▲/▼; confirm ▲ disabled at top, ▼ at bottom. Delete a field; confirm it leaves the list and the config panel deselects.

- [ ] **Step 4: Validation gate.** Clear a choice field's options (or a field's label) and click **Save changes**; confirm the save is blocked, the offending field row shows a red ring + inline message, and the gateway was not called (no "Saved" toast). Fix it; confirm save succeeds and "Saved" appears.

- [ ] **Step 5: Preview fidelity.** Toggle **Preview**; confirm `FieldRenderer` renders the form read-only exactly as a student will see it (labels, help text, options, section headers, help paragraphs; display-only types show no input).

- [ ] **Step 6: Activate + soft-delete.** Toggle the form active; Save. Confirm the left-rail dot turns green. Click the row's ✕; confirm the ConfirmDialog explains soft-delete; confirm; verify the dot returns to grey and the row remains (not removed).

- [ ] **Step 7: Theme/skin matrix.** Repeat a quick pass in `enterprise` (default) + glass skins, light + dark, verifying tokens (`glass-card`, `text-ink`, `text-muted`, `bg-scrim`, danger/success colors) render correctly and the palette popover + ConfirmDialog are legible in all four combinations. Capture screenshots for the PR.

- [ ] **Step 8: Round-trip with student.** Submit the form as a student, then open ReviewDetail as counselor; confirm the snapshot render shows the answers (validated by the review-integration task group, but spot-check here). Edit/delete a field on the type afterward; reopen the old request; confirm it is unchanged (snapshot immutability).

---

### Dependency / sequencing summary
- Tasks 1, 9 are this group's bookends.
- Task B2 (route/nav) must build against Task B3's scaffold — run Task B3 Steps 1+3 before Task B2's build, or land Task B3 first.
- Tasks 4-8 each mutate `FormBuilder.jsx` / `FieldConfigPanel.jsx` incrementally; keep them in order.
- Hard external deps (must exist before Task B9 QA, and before Tasks 3/5/6/8 build cleanly): `utils/formSchema.js` exports `FIELD_REGISTRY`, `createDefaultField`, `validateSchema`, `makeUniqueId`; `features/forms/FieldRenderer.jsx`; gateway `createWaiverType`/`updateWaiverType`/`deleteWaiverType` in `services/api.js`.

---

# Part C — Counselor review integration & finalize

> **Preconditions (land first):** Part A (engine `utils/formSchema.js`, gateway `submitWaiver`, `FieldRenderer`) and Part B (`src/components/ui/Toggle.jsx`, `countFields` in `utils/formSchema.js`) are complete. Part C is the counselor *read* path plus the RubricBuilder one-writer handoff and two correctness fixes (M1 `makeUniqueId` migration, spec §9 R5 submit-time active re-check). UI components are not unit-tested (no jsdom); the one pure addition (`formatAnswer`) gets a real failing→passing vitest. Verified facts: `ReviewDetail.jsx` `SubmissionBlock` destructures `{ submittedAt, studentNote, documents, courseList }` (`:75`) and renders a `documents.map` in the summary view (`:103-113`); `RawSubmission` has a second `documents.map` (`:160-167`); a reusable `<Field label>` exists (`:23-30`); `RubricBuilder.jsx` has an inline `Toggle` (`:7-31`), an inline `makeUniqueId` using a `Set` + `'crit-'` prefix (`:99-110`) called at `:116` and `:166`, and `handleSave` calls `updateRubricCriteria(normalized, waivers, actor)` (`:203`); `api.js` `updateRubricCriteria(nextCriteria, nextWaivers, actor)` (`:470`) and `submitWaiver` demo body resolves nothing by `active` and rejects with `throw new Error(...)` (`:241-253`); the AI eval arg object is `{ ...payload.transcriptData, fromCourse, toCourse, courseList, missingDocs }` (`:270`) — Part C must never add `formAnswers` to it.

---

## Task C1 — `formatAnswer` presenter util (+ Layer-A test)

**Files:**
- Create: `src/utils/formatAnswer.js`
- Test: `src/utils/__tests__/formatAnswer.test.js`

`formatAnswer(field, value)` turns one stored custom-field answer into a display string for counselor review, using the field's **snapshotted** options for choice labels. Display-only types (`sectionHeader`/`helpText`) and `file` are handled by the renderer in Task C2, never by this function. Implements spec §8a (yesNo→Yes/No, choice value→option label, multiCheckbox→join, empty→em-dash) and spec §9 R3 (orphaned option → `"<value> (option removed)"`).

- [ ] **Step 1: Write the failing test.**

```js
// src/utils/__tests__/formatAnswer.test.js
import { describe, it, expect } from 'vitest'
import { formatAnswer } from '../formatAnswer.js'

const sel = { type: 'select', label: 'Period', options: [{ value: 'p1', label: 'Period 1' }, { value: 'p2', label: 'Period 2' }] }
const multi = { type: 'multiCheckbox', label: 'Reasons', options: [{ value: 'med', label: 'Medical' }, { value: 'fam', label: 'Family' }] }

describe('formatAnswer', () => {
  it('renders em-dash for empty/null/blank/empty-array', () => {
    expect(formatAnswer({ type: 'shortText' }, null)).toBe('—')
    expect(formatAnswer({ type: 'shortText' }, '')).toBe('—')
    expect(formatAnswer(multi, [])).toBe('—')
  })
  it('renders yesNo as Yes/No', () => {
    expect(formatAnswer({ type: 'yesNo' }, true)).toBe('Yes')
    expect(formatAnswer({ type: 'yesNo' }, false)).toBe('No')
  })
  it('maps select/radio value to its option label', () => {
    expect(formatAnswer(sel, 'p2')).toBe('Period 2')
    expect(formatAnswer({ ...sel, type: 'radio' }, 'p1')).toBe('Period 1')
  })
  it('flags an orphaned choice value', () => {
    expect(formatAnswer(sel, 'p9')).toBe('p9 (option removed)')
    expect(formatAnswer(multi, ['med', 'gone'])).toBe('Medical, gone (option removed)')
  })
  it('joins multiCheckbox labels', () => {
    expect(formatAnswer(multi, ['med', 'fam'])).toBe('Medical, Family')
  })
  it('stringifies number and passes text/date through', () => {
    expect(formatAnswer({ type: 'number' }, 42)).toBe('42')
    expect(formatAnswer({ type: 'shortText' }, 'hi')).toBe('hi')
    expect(formatAnswer({ type: 'date' }, '2026-05-14')).toBe('2026-05-14')
  })
})
```

- [ ] **Step 2: Run it — expect FAIL.**

Run: `npm test -- formatAnswer`
Expected: FAIL — `Cannot find module '../formatAnswer.js'`.

- [ ] **Step 3: Implement `formatAnswer`.**

```js
// src/utils/formatAnswer.js
// Pure presenter: one custom-field answer -> display string for counselor review.
// Choice labels resolve against the field's SNAPSHOTTED options. file/sectionHeader/
// helpText are handled by the review renderer, not here.

function isEmpty(value) {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0)
}

function optionLabel(options, value) {
  const opt = (options ?? []).find((o) => o.value === value)
  return opt ? opt.label : `${value} (option removed)` // spec §9 R3: orphaned option
}

export function formatAnswer(field, value) {
  if (!field || isEmpty(value)) return '—'
  switch (field.type) {
    case 'yesNo':
      return value ? 'Yes' : 'No'
    case 'multiCheckbox':
      return value.map((v) => optionLabel(field.options, v)).join(', ')
    case 'select':
    case 'radio':
      return optionLabel(field.options, value)
    default: // shortText, longText, number, date
      return String(value)
  }
}
```

- [ ] **Step 4: Run it — expect PASS.**

Run: `npm test -- formatAnswer`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/utils/formatAnswer.js src/utils/__tests__/formatAnswer.test.js
git commit -m "feat(forms): formatAnswer presenter for custom-field review (+tests)"
```

---

## Task C2 — ReviewDetail: render custom answers + M2 double-render fix

**Files:**
- Modify: `src/features/admin-review/ReviewDetail.jsx` (`SubmissionBlock` `:74-133`, `RawSubmission` `:138-188`)

Render the student's custom answers from the frozen `formSchemaSnapshot × formAnswers` in both the summary and raw views, and filter the namespaced `custom-field:*` uploads out of the two Documents lists so they don't appear twice (M2).

- [ ] **Step 1: Import `formatAnswer` + add the `CustomAnswers` component.** At the top of `ReviewDetail.jsx`, after the existing imports (`:1-3`), add:

```jsx
import { formatAnswer } from '../../utils/formatAnswer.js'
```

Then add this component just above `SubmissionBlock` (before `:74`):

```jsx
// Custom-form answers, rendered ONLY from the request's frozen schema snapshot
// (so later builder edits never change a historical submission). Display-only
// field types render as structure; file answers render as a download link.
function CustomAnswers({ schema = [], answers = {} }) {
  const inputFields = schema.filter((f) => f.type !== 'sectionHeader' && f.type !== 'helpText')
  if (inputFields.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs text-muted">Additional information</span>
      <div className="flex flex-col gap-3">
        {schema.map((field) => {
          if (field.type === 'sectionHeader') {
            return <p key={field.id} className="eyebrow pt-1">{field.label}</p>
          }
          if (field.type === 'helpText') {
            return <p key={field.id} className="text-xs leading-relaxed text-muted">{field.content || field.label}</p>
          }
          const value = answers[field.id]
          if (field.type === 'file') {
            return (
              <Field key={field.id} label={field.label}>
                {value && value.url ? (
                  <a href={value.url} target="_blank" rel="noreferrer" className="text-ink underline-offset-2 hover:underline">
                    {value.name}
                  </a>
                ) : '—'}
              </Field>
            )
          }
          return <Field key={field.id} label={field.label}>{formatAnswer(field, value)}</Field>
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Destructure the new fields + filter docs in `SubmissionBlock`.** Replace the destructure at `:75`:

```jsx
  // BEFORE
  const { submittedAt, studentNote, documents, courseList } = request
```
```jsx
  // AFTER
  const { submittedAt, studentNote, documents, courseList, formAnswers, formSchemaSnapshot } = request
  // M2: custom file uploads are surfaced in <CustomAnswers/>; keep them out of the
  // generic Documents list so they don't render twice.
  const visibleDocs = (documents ?? []).filter((d) => !d.type?.startsWith('custom-field:'))
```

- [ ] **Step 3: Use `visibleDocs` + add `<CustomAnswers/>` in the summary view.** In `SubmissionBlock`'s summary branch, replace the Documents block (`:99-115`) so its guard and map use `visibleDocs`:

```jsx
          {visibleDocs.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Documents</span>
              <ul className="flex flex-col gap-1.5">
                {visibleDocs.map((doc, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="rounded bg-scrim px-2 py-0.5 text-xs font-medium capitalize text-muted">
                      {doc.type}
                    </span>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">
                      {doc.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
```

Then, immediately after the existing `courseList.length > 0` block (after `:126`, still inside the summary `<div className="flex flex-col gap-4 px-4 pb-4 text-sm">`), add:

```jsx
          <CustomAnswers schema={formSchemaSnapshot} answers={formAnswers} />
```

- [ ] **Step 4: Mirror in `RawSubmission`.** Replace its destructure (`:139`):

```jsx
  const { submittedAt, studentNote, documents, courseList, formAnswers, formSchemaSnapshot } = request
  const visibleDocs = (documents ?? []).filter((d) => !d.type?.startsWith('custom-field:'))
```

Change the raw Documents block (`:156-172`) to use `visibleDocs` in both its `documents.length > 0` guard and the `documents.map` (rename both to `visibleDocs`). Then, after the closing `</div>` of the course-list block (after `:185`, before the component's closing `</div>` at `:186`), add:

```jsx
      <CustomAnswers schema={formSchemaSnapshot} answers={formAnswers} />
```

- [ ] **Step 5: Build + commit.**

Run: `npm run build`
Expected: success (no parse/type errors).

```bash
git add src/features/admin-review/ReviewDetail.jsx
git commit -m "feat(review): show custom-form answers from snapshot; filter custom-field docs (M2)"
```

- [ ] **Step 6: Manual QA note.** Covered by Task C5 — verify a submission with custom answers shows the new block in both Summary and As-submitted views, with each file appearing exactly once.

---

## Task C3 — RubricBuilder one-writer handoff + shared `makeUniqueId` migration (M1)

**Files:**
- Modify: `src/utils/formSchema.js` (add optional `prefix` to `makeUniqueId`)
- Modify: `src/utils/__tests__/formSchema.test.js` (one prefix test)
- Modify: `src/services/api.js` (`updateRubricCriteria` — criteria only)
- Modify: `src/features/admin-review/RubricBuilder.jsx` (import shared `Toggle`/`makeUniqueId`/`countFields`; read-only waiver section + link; criteria-only save)

Goal: `waiver_types` has exactly **one** writer (`updateWaiverType`, Part A/B). RubricBuilder stops mutating waivers (its section becomes a read-only summary linking to the Form Builder) and adopts the shared engine `makeUniqueId` while preserving its `crit-` id format (M1).

- [ ] **Step 1: Add an optional `prefix` to the engine `makeUniqueId` (backward-compatible).** In `src/utils/formSchema.js` replace the function authored in Part A:

```js
// BEFORE
export function makeUniqueId(label, existingIds = []) {
  const taken = new Set(existingIds)
  const base = slugify(label) || 'field'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
```
```js
// AFTER — prefix defaults to '' so existing callers (FormBuilder, slugifyWaiverId) are unchanged
export function makeUniqueId(label, existingIds = [], prefix = '') {
  const taken = new Set(existingIds)
  const base = `${prefix}${slugify(label) || 'field'}`
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
```

- [ ] **Step 2: Add a failing prefix test, then confirm it passes.** In `src/utils/__tests__/formSchema.test.js`, inside the existing `describe('makeUniqueId', …)` block, add:

```js
  it('applies an optional prefix and still de-collides', () => {
    expect(makeUniqueId('Minimum GPA', [], 'crit-')).toBe('crit-minimum-gpa')
    expect(makeUniqueId('Minimum GPA', ['crit-minimum-gpa'], 'crit-')).toBe('crit-minimum-gpa-2')
    expect(makeUniqueId('', [], 'crit-')).toBe('crit-field')
  })
```

Run: `npm test -- formSchema`
Expected: PASS (the new assertion + all prior engine tests).

- [ ] **Step 3: Make `updateRubricCriteria` criteria-only in `api.js`.** Replace the signature + waiver reassignment (`:470`, `:477`). Keep `prevWaivers` so the existing diff call still type-checks; with `waivers` never reassigned, `waiverDiff` is naturally empty and the `waiver.toggle` audit no longer fires (waiver edits are audited by `updateWaiverType`).

```js
// BEFORE
export async function updateRubricCriteria(nextCriteria, nextWaivers, actor = null) {
```
```js
// AFTER
export async function updateRubricCriteria(nextCriteria, actor = null) {
```

Delete the waiver-reassignment line (`:477`):

```js
  if (Array.isArray(nextWaivers)) waivers = nextWaivers.map((w) => ({ ...w }))
```

(Leave `const prevWaivers = clone(waivers)`, the `diffRubric(prevCriteria, prevWaivers, criteria, waivers)` call, the now-dormant `waiverDiff` block, and the `return { ok, criteria, waivers }` as-is — all still valid, waiver diff is empty.)

- [ ] **Step 4: RubricBuilder — swap to shared `Toggle`, `makeUniqueId`, `countFields`.** Edit the imports (`:1-4`):

```jsx
// BEFORE
import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchRubricCriteria, fetchAllWaivers, updateRubricCriteria } from '../../services/api.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { actorFromAuth } from '../../services/audit.js'
```
```jsx
// AFTER
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchRubricCriteria, fetchAllWaivers, updateRubricCriteria } from '../../services/api.js'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { actorFromAuth } from '../../services/audit.js'
import { Toggle } from '../../components/ui/Toggle.jsx'
import { makeUniqueId, countFields } from '../../utils/formSchema.js'
```

Delete the inline `Toggle` definition (`:6-31`) and the inline `makeUniqueId` definition (`:97-110`).

> If Part B already re-pointed RubricBuilder's `Toggle` import, skip the `Toggle` half of this step.

- [ ] **Step 5: Convert the two `makeUniqueId` call sites Set→array + `crit-` prefix (M1).** At the manual-add call (`:116`):

```jsx
// BEFORE
      const id = makeUniqueId(label, new Set(prev.map((c) => c.id)))
// AFTER
      const id = makeUniqueId(label, prev.map((c) => c.id), 'crit-')
```

At the import-merge call (`:166`) — the local `taken` Set stays for `.has()`/`.add()` dedup; only the `makeUniqueId` argument changes:

```jsx
// BEFORE
            const id = entry.id || makeUniqueId(entry.label, taken)
// AFTER
            const id = entry.id || makeUniqueId(entry.label, [...taken], 'crit-')
```

- [ ] **Step 6: Criteria-only save + drop the waiver mutation callback.** In `handleSave`, change the persist call (`:203`):

```jsx
// BEFORE
      const result = await updateRubricCriteria(normalized, waivers, actorFromAuth(user, role))
      if (result?.ok !== false) {
        if (result?.criteria) setCriteria(result.criteria)
        if (result?.waivers) setWaivers(result.waivers)
        setDirty(false)
```
```jsx
// AFTER
      const result = await updateRubricCriteria(normalized, actorFromAuth(user, role))
      if (result?.ok !== false) {
        if (result?.criteria) setCriteria(result.criteria)
        setDirty(false)
```

Remove `waivers` from the `handleSave` dependency array (`:217`): `}, [criteria, waivers])` → `}, [criteria])`. Delete the now-unused `updateWaiver` callback (`:85-89`). (Keep the `waivers` state + the `fetchAllWaivers()` load — the section still displays them, read-only.)

- [ ] **Step 7: Make the waiver section read-only + link to the Form Builder.** Replace the entire "Section 2 — Waiver types" block (`:481-537`):

```jsx
      {/* Section 2 — Waiver types (read-only; managed in the Form Builder) */}
      <div className="glass-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Waiver types</h2>
          <Link
            to="/admin/forms"
            className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            Manage in Form Builder →
          </Link>
        </div>
        {waivers.length === 0 ? (
          <p className="text-sm text-muted">No waiver types defined.</p>
        ) : (
          <ul className="divide-y divide-hairline" role="list">
            {waivers.map((waiver) => (
              <li key={waiver.id} className={['flex items-center gap-4 py-3', !waiver.active ? 'opacity-40' : ''].join(' ')}>
                <span
                  className={['h-2 w-2 flex-shrink-0 rounded-full', waiver.active ? 'bg-success-500' : 'bg-scrim-strong'].join(' ')}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{waiver.name}</p>
                  {waiver.description && <p className="mt-0.5 truncate text-xs text-muted">{waiver.description}</p>}
                </div>
                <span
                  className={[
                    'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    waiver.active ? 'bg-success-50 text-success-700 dark:text-success-300' : 'bg-scrim text-muted',
                  ].join(' ')}
                >
                  {waiver.active ? 'Active' : 'Inactive'}
                </span>
                {countFields(waiver.formSchema) > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-300">
                    {countFields(waiver.formSchema)} field{countFields(waiver.formSchema) !== 1 ? 's' : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
```

- [ ] **Step 8: Build + commit.**

Run: `npm test -- formSchema && npm run build`
Expected: tests PASS, build success.

```bash
git add src/utils/formSchema.js src/utils/__tests__/formSchema.test.js src/services/api.js src/features/admin-review/RubricBuilder.jsx
git commit -m "refactor(rubric): one-writer waiver handoff to Form Builder + shared makeUniqueId (M1)"
```

---

## Task C4 — Submit-time inactive re-check in both backends (spec §9 R5)

**Files:**
- Modify: `src/services/api.js` (`submitWaiver` demo body, after the dedupe guard ~`:253`)
- Modify: `src/services/supabaseApi.js` (`submitWaiver` — extend the existing `waiver_types` select to include `active`)
- Modify: `src/services/__tests__/customFields.parity.test.js` (one rejection test)

A waiver type can be deactivated by a counselor while a student has the wizard open. Reject a submission against an inactive (or missing) type, mirroring the existing rejection style (`throw new Error`).

- [ ] **Step 1: Demo body guard (`api.js`).** Immediately after the duplicate-request guard (the `if (existingRequestHashes().has(hash)) { … }` block, `:251-253`), insert:

```jsx
  const waiverType = waivers.find((w) => w.id === payload.waiverTypeId)
  if (!waiverType || waiverType.active === false) {
    throw new Error('This waiver type is no longer available — please refresh and choose another.')
  }
```

- [ ] **Step 2: Supabase body guard (`supabaseApi.js`).** In Part A's `submitWaiver`, the body already fetches the waiver type to freeze `form_schema_snapshot`. Extend that select to include `active` and reject when inactive. Locate the snapshot fetch (authored in Part A as a `select('form_schema')` on `waiver_types`) and change it to:

```js
  const { data: wt, error: wtErr } = await supabase
    .from('waiver_types')
    .select('active, form_schema')
    .eq('id', payload.waiverTypeId)
    .maybeSingle()
  if (wtErr) throw wtErr
  if (!wt || wt.active === false) {
    throw new Error('This waiver type is no longer available — please refresh and choose another.')
  }
  // …existing insertRow continues, using wt.form_schema for form_schema_snapshot
```

Ensure the `insertRow` `form_schema_snapshot` value reads `wt?.form_schema ?? []` (unchanged from Part A — just sourced from this combined select).

- [ ] **Step 3: Add a rejection test (demo path).** In `src/services/__tests__/customFields.parity.test.js`, add (demo mode, `isSupabaseConfigured=false`):

```js
  it('rejects submission against an inactive waiver type (R5)', async () => {
    const api = await import('../api.js')
    // medical-exemption demo type is active; deactivate it, then submit against it.
    await api.updateWaiverType('medical-exemption', { active: false })
    await expect(
      api.submitWaiver({ studentId: 'stu-r5', waiverTypeId: 'medical-exemption', documents: [], courseList: ['X'], transcriptData: null }),
    ).rejects.toThrow(/no longer available/)
  })
```

> If the demo seed/rate-limiter makes id reuse flaky in this suite, use a fresh `studentId` per assertion (the rate limiter is per-student) and reset modules in `beforeEach` consistent with the other parity tests in this file.

- [ ] **Step 4: Run + commit.**

Run: `npm test -- customFields`
Expected: PASS (incl. the new rejection test).

```bash
git add src/services/api.js src/services/supabaseApi.js src/services/__tests__/customFields.parity.test.js
git commit -m "fix(forms): reject submissions against inactive waiver types (spec R5)"
```

---

## Task C5 — Final whole-slice verification

**Files:** none (verification gate).

- [ ] **Step 1: Full unit suite.**

Run: `npm test`
Expected: all green — including `formSchema.test.js`, `formatAnswer.test.js`, and `customFields.parity.test.js` (engine, presenter, parity + AI-isolation T16/T17 + R5).

- [ ] **Step 2: Production build.**

Run: `npm run build`
Expected: success, no parse/type errors across new files (`FieldRenderer`, `FormBuilder`, `FieldConfigPanel`, `Toggle`, `formSchema`, `formatAnswer`) and modified files.

- [ ] **Step 3: End-to-end manual QA (gstack-browse, both skins + themes).**

  - [ ] As **admin**, open `/admin/forms`. Create a new waiver type; add one field of **each of the 11 types**; set options on the choice fields, a min/max on number, required on a couple; toggle the Preview and confirm it matches what a student would see. Save (Active).
  - [ ] As **student**, start intake, select that waiver type. Confirm the **"Additional questions"** step appears (and is **absent** for a field-less type). Fill all fields incl. a file upload; verify required-field validation fires on Continue; submit.
  - [ ] As **admin**, open the request in Review. Confirm the **Additional information** block renders every answer correctly (yesNo→Yes/No, choice→labels, multiCheckbox joined, file as a single download link — appearing **once**, not duplicated in Documents). Check both **Summary** and **As submitted** views.
  - [ ] Back in `/admin/forms`, **edit a field label and delete a field** on that type, save. Reopen the earlier request — confirm it still renders with the **original** labels/fields (snapshot immutability).
  - [ ] In **RubricBuilder**, confirm the Waiver types section is read-only with a working **"Manage in Form Builder →"** link, and that saving criteria still works.
  - [ ] Repeat the create→submit→review spot-check in the **enterprise** (default) skin and the **glass** skin, in both **light** and **dark**.

- [ ] **Step 4: Final commit (if any QA tweaks were needed).**

```bash
git add -A
git commit -m "chore(forms): final verification pass for dynamic form builder"
```
