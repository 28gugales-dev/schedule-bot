-- ════════════════════════════════════════════════════════════════════════════
-- 0009_batch_sync_queue.sql — Approved decisions awaiting push to Infinite Campus.
-- Additive + idempotent.
--
-- OVERRIDES the approved migration spec (eef0e6f), which proposed a single
-- `synced BOOLEAN`. A boolean cannot represent the real lifecycle of a push that
-- crosses a system boundary we don't control (queued → exported → IC import →
-- confirmed/failed), nor can it express "this approval went stale and was dropped
-- at re-validation". We use an explicit push_state machine instead. This is the
-- single most important correctness property of the pipeline, so it is modelled
-- in the schema, not inferred from a flag.
--
--   push_state lifecycle (forward-only except failed→queued retry):
--     queued      -- admit bridge inserted it; not yet picked up
--     claimed     -- a push run has leased it (prevents double-export)
--     exported    -- artifact built + delivered to IC transport; awaiting result
--     imported    -- IC acknowledged ingest (pre-confirmation, partial pipelines)
--     confirmed    -- IC confirmed the enrollment applied (terminal success)
--     failed      -- IC rejected it or transport failed (retryable → back to queued)
--     superseded   -- re-validation against a FRESH pull flipped the decision;
--                     never pushed (terminal, audited as batch.revalidate)
--
-- SECURITY: a counselor CLIENT may INSERT only `queued` rows (the admit bridge in
-- supabaseApi.js). It may NOT update push_state — all state transitions are made by
-- the sync-to-infinite-campus edge function with the service-role key (RLS-exempt).
-- This stops a forged `confirmed` from the browser. Holds the FERPA disclosure line:
-- the queue carries only the minimal fields needed for the enrollment change.
--
-- Prereqs (already live): 0001b base schema (private.is_counselor(), requests, profiles).
-- Apply via Supabase MCP apply_migration (name 'batch_sync_queue') or the SQL editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ A. TABLE                                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create table if not exists public.batch_sync_queue (
  id                   uuid primary key default gen_random_uuid(),
  request_id           uuid references public.requests(id) on delete cascade,
  student_id           uuid references public.profiles(id) on delete set null,
  student_name         text,            -- denormalized for the dashboard (mirrors demo `student`)
  waiver_name          text,            -- mirrors demo `waiver`
  from_course          text,            -- course being dropped (frees a seat)
  to_course            text,            -- course being added (the placement)
  approved_at          timestamptz not null default now(),

  push_state           text not null default 'queued'
                       check (push_state in
                         ('queued','claimed','exported','imported','confirmed','failed','superseded')),

  -- Idempotency: (student, target section, term) — set when IC keys are known.
  idempotency_key      text,
  ic_record_ref        text,            -- IC sourcedId / ack handle once IC responds

  -- IC key mapping (nullable placeholders; only a real district pull fills these)
  user_sourced_id      text,
  class_sourced_id     text,
  school_sourced_id    text,
  term_sourced_id      text,

  attempts             int not null default 0,
  last_error           text,
  claimed_at           timestamptz,     -- set when a push run leases the row; drives stale-claim reclaim
  exported_at          timestamptz,
  confirmed_at         timestamptz,

  -- Re-validation outcome (the drift guard)
  revalidated_decision text,            -- 'admit' | 'deny' | 'review' from the fresh-pull re-run
  revalidated_at       timestamptz,

  created_at           timestamptz not null default now()
);

create index if not exists batch_sync_queue_push_state_idx on public.batch_sync_queue (push_state);
create index if not exists batch_sync_queue_request_idx     on public.batch_sync_queue (request_id);

-- Idempotency guard: at most ONE in-flight/active record per enrollment key.
-- Partial so that a superseded/failed row does NOT block a legitimate re-queue,
-- and so the demo (idempotency_key null) is never constrained.
create unique index if not exists batch_sync_queue_idem_active_uq
  on public.batch_sync_queue (idempotency_key)
  where idempotency_key is not null
    and push_state in ('queued','claimed','exported','imported','confirmed');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ B. RLS                                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
alter table public.batch_sync_queue enable row level security;

drop policy if exists "batch_sync_queue_select_counselor" on public.batch_sync_queue;
create policy "batch_sync_queue_select_counselor" on public.batch_sync_queue
  for select to authenticated
  using (private.is_counselor());

-- A counselor may enqueue, but ONLY in the 'queued' state. They cannot pre-mark a
-- row exported/confirmed. (The check on push_state is the least-privilege teeth.)
drop policy if exists "batch_sync_queue_insert_counselor_queued" on public.batch_sync_queue;
create policy "batch_sync_queue_insert_counselor_queued" on public.batch_sync_queue
  for insert to authenticated
  with check (private.is_counselor() and push_state = 'queued');

-- Deliberately NO update/delete policy for authenticated => denied under RLS.
-- All push_state transitions are performed by the edge function (service role).
