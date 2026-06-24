-- ════════════════════════════════════════════════════════════════════════════
-- 0012_ic_exports_bucket.sql — private bucket for ephemeral IC push artifacts.
-- Additive + idempotent.
--
-- The sync-to-infinite-campus edge function writes the OneRoster delta package
-- (auto-push mode) or the registrar worklist (manual_ui_export mode) here. Both
-- are concentrated student PII, so the bucket is PRIVATE with NO authenticated
-- policy — browser clients cannot list/read it; access is only via short-lived
-- signed URLs the edge function (service role) mints. Auto-push artifacts are
-- deleted after the run; manual worklists are retained until the registrar
-- finishes, then purged (a scheduled TTL purge is a tracked follow-up — see the
-- design spec). This MUST exist as a numbered migration (not only in bootstrap.sql)
-- so `supabase db push` deployments create it; otherwise the edge-function upload
-- silently no-ops against a missing bucket.
--
-- Prereqs: none beyond a Supabase project with storage enabled.
-- Apply via Supabase MCP apply_migration (name 'ic_exports_bucket') or the SQL editor.
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('ic-exports', 'ic-exports', false)
on conflict (id) do nothing;

-- No storage.objects policy for authenticated => clients have no access. The
-- service-role edge function bypasses RLS to write/read/delete + mint signed URLs.
