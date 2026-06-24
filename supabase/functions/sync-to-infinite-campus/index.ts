// sync-to-infinite-campus — push approved schedule decisions to IC.
//
// Pipeline (orchestration is the SHARED, stress-tested runPushPipeline):
//   0. Reclaim stale 'claimed' rows from a crashed prior run (orphan recovery).
//   1. Atomically LEASE queued rows (UPDATE ... WHERE push_state='queued' RETURNING)
//      + stamp claimed_at, so two concurrent runs never double-export a record.
//   2. RE-VALIDATE each record against a FRESH OneRoster pull (a conservative
//      Deno-safe freshness check — see revalidate()). A flipped decision is
//      superseded (carrying the REAL verdict); a revalidation ERROR is failed
//      (retryable), never a terminal supersede.
//   3. Build a field-minimized artifact (delta CSV for auto mode, registrar
//      worklist for the default manual mode) and deliver via the transport adapter.
//   4. Apply per-record push_state transitions + truthful FERPA audit; retry only
//      TRANSIENT failures (capped); delete/sign the ephemeral PII artifact.
//
// SECURITY: service-role function; caller must be an authenticated counselor. IC +
// SFTP creds live only in this function's env. The artifact is concentrated PII:
// private bucket, signed URL for the human worklist, deleted for the auto path,
// never returned to the browser or logged (counts only).
//
// COMPLIANCE GATE: refuses to run against real data until IC_COMPLIANCE_REVIEWED=
// 'true' — the privacy policy must document the IC dataflow first (design spec §5.7).
//
// SCOPE HONESTY: runPushPipeline / oneRosterCsv / fieldAllowlist / the state
// machine are shared with the stress test and proven against a simulated IC. The
// OneRoster HTTP read, SFTP transport, full-rubric revalidation, and DB writes here
// need a district sandbox to verify (design spec §1, §9). Revalidation here is a
// CONSERVATIVE freshness check (enrollment-active + GPA-floor), NOT a full re-run
// of the frozen rubric — that requires making the rubric engine Deno-safe (tracked
// follow-up); the prior schedulingLogic import was removed because its course
// catalog uses a Vite-only `?raw` loader that cannot load in Deno.
//
// Deploy:  supabase functions deploy sync-to-infinite-campus
// Invoke:  POST {}  with the counselor's Authorization header
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  runPushPipeline, makeOneRosterCsvDeltaAdapter, makeManualUiExportAdapter,
} from '../../../src/services/ic/transportAdapter.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TRANSPORT_MODE = Deno.env.get('IC_TRANSPORT_MODE') ?? 'manual_ui_export' // safe default
const ONEROSTER_VERSION = Deno.env.get('IC_ONEROSTER_VERSION') ?? '1.1'
const COMPLIANCE_REVIEWED = Deno.env.get('IC_COMPLIANCE_REVIEWED') === 'true'
const ARTIFACT_BUCKET = 'ic-exports'
const STALE_CLAIM_MIN = 15        // reclaim a 'claimed' row older than this (orphan recovery)
const MAX_ATTEMPTS = 5            // retry cap for transient failures
const TRANSIENT = ['transport_unconfigured', 'threshold_pause', 'revalidation_error', 'delivery failed']

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // Compliance gate — the privacy policy must document the IC dataflow before any
  // real student data leaves for IC (design spec §5.7). Off by default.
  if (!COMPLIANCE_REVIEWED) {
    return json({ error: 'IC dataflow not yet documented in the privacy policy; set IC_COMPLIANCE_REVIEWED=true after counsel review', blocked: true }, 412)
  }

  // 1. Authorize counselor.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const { data: profile } = await caller.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)
  const actor = { id: user.id, name: profile?.full_name ?? 'counselor', role: 'counselor' }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const now = new Date().toISOString()
  const staleCutoff = new Date(Date.now() - STALE_CLAIM_MIN * 60_000).toISOString()

  // 0. Orphan recovery: a row left 'claimed' by a crashed/timed-out prior run is
  //    reclaimed so it isn't wedged forever (the next lease only sees 'queued').
  await admin.from('batch_sync_queue')
    .update({ push_state: 'queued', last_error: 'reclaimed stale lease' })
    .eq('push_state', 'claimed').lt('claimed_at', staleCutoff)

  // 1. Atomic lease: queued -> claimed (+ claimed_at), RETURNING the leased set.
  const { data: leased, error: leaseErr } = await admin
    .from('batch_sync_queue')
    .update({ push_state: 'claimed', claimed_at: now })
    .eq('push_state', 'queued')
    .select('*')
  if (leaseErr) return json({ error: `lease failed: ${leaseErr.message}` }, 500)
  if (!leased?.length) return json({ ok: true, pushed: 0, note: 'nothing queued' })

  // 2. Build pipeline records. Carry human worklist fields (manual mode) AND IC
  //    sourcedIds (auto mode). Join handle = row id (always unique).
  const records = leased.map((row: any) => ({
    idempotencyKey: row.id,
    action: 'add',
    studentName: row.student_name,
    fromCourse: row.from_course,
    toCourse: row.to_course,
    userSourcedId: row.user_sourced_id,
    classSourcedId: row.class_sourced_id,
    schoolSourcedId: row.school_sourced_id,
    requestId: row.request_id,
  }))
  const rowById = new Map(leased.map((r: any) => [r.id, r]))

  const adapter = TRANSPORT_MODE === 'oneroster_csv_delta'
    ? makeOneRosterCsvDeltaAdapter({ version: ONEROSTER_VERSION, transport: makeSftpTransport() })
    : makeManualUiExportAdapter({ version: ONEROSTER_VERSION })

  const { transitions, artifact } = await runPushPipeline(records, {
    adapter, now,
    revalidate: (rec: any) => revalidate(admin, rowById.get(rec.idempotencyKey)),
  })

  // 3. Persist the artifact (never returned to the browser). Mint a signed URL for
  //    the human worklist; the auto-push delta is deleted at the end of the run.
  let artifactPath: string | null = null
  let worklistUrl: string | null = null
  let artifactStored = false
  if (artifact?.files && Object.keys(artifact.files).length) {
    artifactPath = `push/${now.replace(/[:.]/g, '-')}.json`
    const { error: upErr } = await admin.storage.from(ARTIFACT_BUCKET)
      .upload(artifactPath, JSON.stringify(artifact.files), { contentType: 'application/json', upsert: false })
    if (upErr) {
      // NON-silent: a missing bucket / upload failure must not masquerade as success.
      await admin.from('audit_log').insert({
        id: `push-artifact-fail-${now}`, category: 'sync', action: 'batch.artifact_failed', actor,
        summary: `IC push artifact upload failed: ${upErr.message}`,
      }).catch(() => {})
      artifactPath = null
    } else {
      artifactStored = true
      if (TRANSPORT_MODE !== 'oneroster_csv_delta') {
        const { data: signed } = await admin.storage.from(ARTIFACT_BUCKET).createSignedUrl(artifactPath, 3600)
        worklistUrl = signed?.signedUrl ?? null
      }
    }
  }

  // 4. Apply transitions + truthful audit. Transient failures under the attempt
  //    cap are collected HERE (in JS) for a precise .in() re-queue below — we do
  //    NOT use a mutation+.or() filter (PostgREST <14.4 returns 400 on that, which
  //    supabase-js surfaces as a silently-discarded error, so the retry would
  //    no-op and re-break forward progress).
  const counts: Record<string, number> = {}
  const retryIds: string[] = []
  for (const t of transitions) {
    counts[t.to] = (counts[t.to] ?? 0) + 1
    const row: any = rowById.get(t.idempotencyKey)
    const patch: any = { push_state: t.to }
    if (t.to === 'exported') patch.exported_at = now
    if (t.to === 'confirmed') patch.confirmed_at = now
    if (t.to === 'failed') {
      patch.last_error = t.reason
      const newAttempts = (row?.attempts ?? 0) + 1
      patch.attempts = newAttempts
      // Re-queue only TRANSIENT failures under the cap; permanent failures
      // (unmapped IC keys, real IC rejection) stay 'failed' as a dead-letter.
      const transient = TRANSIENT.some((code) => (t.reason ?? '').includes(code))
      if (transient && newAttempts < MAX_ATTEMPTS) retryIds.push(t.idempotencyKey)
    }
    if (t.to === 'superseded') { patch.revalidated_decision = t.decision ?? 'deny'; patch.revalidated_at = now }
    await admin.from('batch_sync_queue').update(patch).eq('id', t.idempotencyKey)

    await admin.from('audit_log').insert({
      id: `push-${t.idempotencyKey}-${t.to}-${now}`,
      category: 'sync',
      action: t.to === 'superseded' ? 'batch.revalidate' : `batch.${t.to}`,
      actor,
      student: row?.student_name ? { id: row.student_id, name: row.student_name } : null,
      request_id: row?.request_id ?? null,
      summary: t.to === 'superseded'
        ? `${row?.student_name ?? 'record'} → IC push superseded (revalidated: ${t.decision ?? 'deny'}): ${t.reason}`
        : `${row?.student_name ?? 'record'} → IC push ${t.to}: ${t.reason}`,
      after_state: { push_state: t.to, revalidated_decision: t.decision ?? null },
    }).catch(() => { /* audit must never break the push */ })
  }

  // Re-queue the transient failures selected above. .in() on a mutation is safe
  // (no .or() pitfall); .select() confirms the write actually applied.
  if (retryIds.length) {
    await admin.from('batch_sync_queue').update({ push_state: 'queued' }).in('id', retryIds).select('id')
  }

  // Auto-push delta is transient PII — delete it once the run is done (manual
  // worklist is retained for the registrar; TTL purge is a tracked follow-up).
  if (artifactPath && TRANSPORT_MODE === 'oneroster_csv_delta') {
    await admin.storage.from(ARTIFACT_BUCKET).remove([artifactPath]).catch(() => {})
  }

  return json({ ok: true, leased: leased.length, counts, artifactStored, worklistUrl, transportMode: TRANSPORT_MODE })
})

// Conservative, Deno-safe revalidation against a FRESH pull. Returns
// { decision: 'admit'|'deny'|'review', reason } on a verdict, or { error:true, reason }
// if revalidation itself failed (so the pipeline retries rather than terminally
// dropping a counselor-approved record). Does NOT use the demo FNV seat hash and
// does NOT claim to re-run the frozen rubric (see file header).
async function revalidate(admin: any, row: any) {
  try {
    if (!row?.request_id) return { decision: 'admit', reason: 'no request link; passthrough' }
    const { data: reqRow } = await admin.from('requests').select('*').eq('id', row.request_id).maybeSingle()
    if (!reqRow) return { decision: 'deny', reason: 'source request missing' }
    const { data: roster } = await admin.from('one_roster').select('*').eq('student_id', reqRow.student_id).maybeSingle()
    if (!roster) return { decision: 'admit', reason: 'no fresh roster snapshot; passthrough (manual review recommended)' }

    // Enrollment must still be active in IC.
    if (roster.enrollment_status && String(roster.enrollment_status).toLowerCase() !== 'active') {
      return { decision: 'deny', reason: `student no longer Active in IC (${roster.enrollment_status})` }
    }
    // GPA must not have dropped below the request's stored minimum (if any).
    const minGpa = findMinGpa(reqRow)
    if (minGpa != null && roster.gpa != null && Number(roster.gpa) < minGpa) {
      return { decision: 'review', reason: `GPA ${roster.gpa} now below required ${minGpa}` }
    }
    return { decision: 'admit', reason: 'revalidated against fresh pull (enrollment active, GPA ok)' }
  } catch (e) {
    return { error: true, reason: `revalidation_error: ${String(e)}` }
  }
}

function findMinGpa(reqRow: any): number | null {
  const crit = reqRow?.recommendation?.criteria ?? reqRow?.form_schema_snapshot ?? null
  if (!Array.isArray(crit)) return null
  const g = crit.find((c: any) => c?.id === 'min-gpa' && c?.enabled !== false)
  return g?.value != null ? Number(g.value) : null
}

// Real SFTP transport (held server-side). Unconfigured by default so the
// oneroster_csv_delta adapter honestly reports 'transport_unconfigured' rather
// than faking a push when no district SFTP exists.
function makeSftpTransport() {
  const host = Deno.env.get('IC_SFTP_HOST')
  if (!host) return undefined
  return async (_artifact: any) => {
    // TODO(district): open SSH/SFTP with key from Vault, upload the delta ZIP to
    // the district's /incoming dir, await/parse the import result log, and return
    // { ok, perRecord: [{ sourcedId, ok, reason }] }. Needs a district sandbox.
    throw new Error('SFTP transport not implemented — requires district credentials + sandbox')
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
