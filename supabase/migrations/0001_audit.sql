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
  category        text not null,                 -- decision | config | submission | sync | disclosure
  action          text not null,                 -- decision.admit | rubric.update | record.view | …
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
  score_breakdown jsonb,                           -- { base, items:[{label,delta}] }
  inputs_snapshot jsonb                            -- what the evaluator saw
);

create index if not exists ai_decisions_ts_idx      on public.ai_decisions (ts desc);
create index if not exists ai_decisions_request_idx on public.ai_decisions (request_id);

-- ── Row-level security (HARDENED) ─────────────────────────────────────────────
-- Audit data is append-only and counselor-only.
--   SELECT : counselors only  (private.is_counselor() -> profiles.role='admin').
--   INSERT : counselors only via the client (authenticated JWT). audit.js writes
--            through the browser client (audit.js:190,207), NOT the service role,
--            so the gate must be is_counselor(), not service-role-only. The
--            service role bypasses RLS, so any future Edge Function still writes.
--   No UPDATE / DELETE policies => those ops are denied under RLS (append-only).
-- Students / anon can neither read nor write.
-- NOTE: this gate is only sufficient once 0003_ferpa_hardening.sql's profiles
-- role-lock is applied (an escalated student would otherwise satisfy
-- is_counselor()). Ship them together.
alter table public.audit_log    enable row level security;
alter table public.ai_decisions enable row level security;

-- drop legacy permissive names (in case an older copy was ever applied):
drop policy if exists "audit read"   on public.audit_log;
drop policy if exists "audit insert" on public.audit_log;
drop policy if exists "ai read"      on public.ai_decisions;
drop policy if exists "ai insert"    on public.ai_decisions;
-- drop new names so re-runs are clean:
drop policy if exists "audit_log_select_counselor"    on public.audit_log;
drop policy if exists "audit_log_insert_counselor"    on public.audit_log;
drop policy if exists "ai_decisions_select_counselor" on public.ai_decisions;
drop policy if exists "ai_decisions_insert_counselor" on public.ai_decisions;

create policy "audit_log_select_counselor"
  on public.audit_log for select to authenticated
  using ( private.is_counselor() );

create policy "audit_log_insert_counselor"
  on public.audit_log for insert to authenticated
  with check ( private.is_counselor() );

create policy "ai_decisions_select_counselor"
  on public.ai_decisions for select to authenticated
  using ( private.is_counselor() );

create policy "ai_decisions_insert_counselor"
  on public.ai_decisions for insert to authenticated
  with check ( private.is_counselor() );
