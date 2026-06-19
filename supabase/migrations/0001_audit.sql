-- ════════════════════════════════════════════════════════════════════════════
-- Audit trail + AI-decision log
--
-- Column names mirror the row mappers in src/services/audit.js (toRow/fromRow,
-- toAiRow/fromAiRow) 1:1. When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
-- set, audit.js routes reads/writes here instead of localStorage — no code
-- change beyond the env vars.
--
-- Run:  supabase db push      (or paste into the SQL editor)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
  id              text primary key,
  ts              timestamptz not null default now(),
  category        text not null,                 -- decision | config | submission | sync
  action          text not null,                 -- decision.admit | rubric.update | …
  actor           jsonb not null,                -- { id, name, role }   (WHO)
  device          jsonb,                         -- { id, label, ua }    (WHICH DEVICE)
  student         jsonb,                          -- { id, name }         (STUDENT AFFECTED)
  request_id      text,
  waiver_type_id  text,
  summary         text not null default '',
  before_state    jsonb,                          -- snapshot BEFORE
  after_state     jsonb,                          -- snapshot AFTER
  diff            jsonb not null default '[]',    -- field-level diff (config edits)
  ai_decision_id  text,                           -- → ai_decisions.id (decisions)
  overrode        boolean not null default false, -- human decision contradicted the AI
  note            text not null default ''
);

create index if not exists audit_log_ts_idx        on public.audit_log (ts desc);
create index if not exists audit_log_action_idx     on public.audit_log (action);
create index if not exists audit_log_category_idx   on public.audit_log (category);
create index if not exists audit_log_request_idx    on public.audit_log (request_id);
create index if not exists audit_log_student_id_idx on public.audit_log ((student->>'id'));

create table if not exists public.ai_decisions (
  id              text primary key,
  ts              timestamptz not null default now(),
  request_id      text not null,
  student         jsonb not null,                 -- { id, name }
  waiver_type_id  text,
  evaluator       text not null,                  -- model/version label
  decision        text not null,                  -- admit | deny | review
  confidence      numeric,                        -- 0..1
  rationale       text,
  checks          jsonb not null default '[]',    -- per-criterion reasoning
  score_breakdown jsonb,                          -- { base, items:[{label,delta}] }
  inputs_snapshot jsonb                            -- what the evaluator saw
);

create index if not exists ai_decisions_ts_idx      on public.ai_decisions (ts desc);
create index if not exists ai_decisions_request_idx on public.ai_decisions (request_id);

-- ── Row-level security ────────────────────────────────────────────────────────
-- Audit data is append-only and counselor/admin-scoped. The client (anon key)
-- may READ; inserts should come from a trusted context (an Edge Function using
-- the service role, or a policy keyed on a staff role claim). Tighten these to
-- your auth model before production — the read policy below is permissive for a
-- demo swap-in. Audit rows are never updated or deleted.
alter table public.audit_log   enable row level security;
alter table public.ai_decisions enable row level security;

create policy "audit read"  on public.audit_log    for select using (true);
create policy "audit insert" on public.audit_log   for insert with check (true);
create policy "ai read"      on public.ai_decisions for select using (true);
create policy "ai insert"    on public.ai_decisions for insert with check (true);
