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
