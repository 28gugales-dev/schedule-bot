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
