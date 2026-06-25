-- demo/reset-avery-mitchell.sql — put Avery Mitchell's request back to
-- 'submitted' (pending) before a demo, if a previous session already
-- admitted/denied it. Run AFTER seed-avery-mitchell.sql has been run at
-- least once. Safe to re-run any time.
update public.requests
set
  status = 'submitted',
  decided_by = null,
  decided_at = null,
  counselor_note = null,
  withdrawn_at = null
where id = 'e1d0a000-0000-4000-8000-0000000a0001';
