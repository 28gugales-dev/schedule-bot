// ════════════════════════════════════════════════════════════════════════════
// AUDIT SERVICE — records + reads the audit trail and the AI-decision log.
//
// Mirrors the api.js pattern: every function is async with the signature the
// real backend will have, so the UI codes against the final contract today and
// only the bodies change when Supabase wiring lands.
//
//   Persistence seam (same flag that gates auth in lib/supabase.js):
//     isSupabaseConfigured === true  → read/write Supabase tables
//                          === false → read/write localStorage (demo), seeded
//                                       on first run from seedAudit.js
//
// Demo mode is the live path today. The Supabase branch is written against the
// schema in supabase/migrations/0001_audit.sql and stays dormant until the
// VITE_SUPABASE_* env vars are present.
// ════════════════════════════════════════════════════════════════════════════

import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { LS_KEYS, SEED_VERSION, EXPORT_COLUMNS, actionMeta } from './audit.schema.js'
import { SEED_AUDIT_EVENTS, SEED_AI_DECISIONS } from './seedAudit.js'

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)))
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms))

// ── ids + time ────────────────────────────────────────────────────────────────
let counter = 0
function uid(prefix) {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}-${rand}`
}

// ── device fingerprint (live actions only; seeds carry a baked device) ─────────
function parseUaLabel(ua) {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone/.test(ua)
      ? 'iPhone'
      : /iPad/.test(ua)
        ? 'iPad'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'macOS'
          : /Android/.test(ua)
            ? 'Android'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'device'
  return `${browser} · ${os}`
}

/** Stable per-browser device descriptor. The id is generated once and kept in
 *  localStorage so repeat actions from the same browser group together. */
export function getDeviceInfo() {
  let id = null
  try {
    id = localStorage.getItem(LS_KEYS.device)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `dev-${crypto.randomUUID().slice(0, 12)}`
          : `dev-${Math.random().toString(36).slice(2, 14)}`
      localStorage.setItem(LS_KEYS.device, id)
    }
  } catch {
    id = 'dev-ephemeral'
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return { id, label: parseUaLabel(ua), ua }
}

/** Derive an audit Actor from the AuthProvider user + role. Pure (no React). */
export function actorFromAuth(user, role) {
  if (!user) return { id: 'demo-admin', name: 'Demo Counselor', role: role ?? 'counselor' }
  return {
    id: user.id,
    name: user.user_metadata?.name ?? user.email ?? 'User',
    role: role ?? user.user_metadata?.role ?? 'counselor',
  }
}

// ── localStorage store (demo) ──────────────────────────────────────────────────
function lsRead(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function lsWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode) — fall back to in-memory only */
  }
}

// In-memory mirrors so a private-mode browser (where writes throw) still works
// within the session.
let memAudit = null
let memAi = null

function ensureSeeded() {
  if (memAudit && memAi) return
  let audit = lsRead(LS_KEYS.audit)
  let ai = lsRead(LS_KEYS.ai)
  // Reseed when storage is empty OR the cached seed predates the current fixtures
  // (version mismatch) — otherwise returning browsers keep stale demo data.
  const versionOk = lsRead(LS_KEYS.version) === SEED_VERSION
  if (!versionOk || !Array.isArray(audit) || !Array.isArray(ai)) {
    audit = clone(SEED_AUDIT_EVENTS)
    ai = clone(SEED_AI_DECISIONS)
    lsWrite(LS_KEYS.audit, audit)
    lsWrite(LS_KEYS.ai, ai)
    lsWrite(LS_KEYS.seeded, new Date().toISOString())
    lsWrite(LS_KEYS.version, SEED_VERSION)
  }
  memAudit = audit
  memAi = ai
}

function persist() {
  lsWrite(LS_KEYS.audit, memAudit)
  lsWrite(LS_KEYS.ai, memAi)
}

// ── filtering (shared by demo + supabase post-read) ────────────────────────────
function applyFilters(rows, f = {}) {
  let out = rows
  if (f.actorId) out = out.filter((e) => e.actor?.id === f.actorId)
  if (f.category) out = out.filter((e) => e.category === f.category)
  if (f.action) out = out.filter((e) => e.action === f.action)
  if (f.studentId) out = out.filter((e) => e.student?.id === f.studentId)
  if (f.requestId) out = out.filter((e) => e.requestId === f.requestId)
  if (f.from) out = out.filter((e) => e.ts >= f.from)
  if (f.to) out = out.filter((e) => e.ts <= f.to)
  if (f.query) {
    const q = f.query.toLowerCase()
    out = out.filter((e) =>
      [e.summary, e.note, e.student?.name, e.actor?.name, actionMeta(e.action).label]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    )
  }
  return [...out].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

/**
 * Append an audit event. Fills id/ts/device/defaults the caller omits.
 * `actor` should be the session actor (UI passes it from useAuth); device is
 * captured here from the live browser.
 */
export async function recordAuditEvent(partial) {
  const event = {
    id: uid('evt'),
    ts: new Date().toISOString(),
    device: getDeviceInfo(),
    category: actionMeta(partial.action).category,
    student: null,
    requestId: null,
    waiverTypeId: null,
    before: null,
    after: null,
    diff: [],
    aiDecisionId: null,
    overrode: false,
    note: '',
    summary: '',
    ...partial,
  }

  if (isSupabaseConfigured) {
    await supabase.from('audit_log').insert(toRow(event))
    return clone(event)
  }
  ensureSeeded()
  memAudit = [event, ...memAudit]
  persist()
  return clone(event)
}

/** Append an AI-decision record. */
export async function recordAiDecision(partial) {
  const decision = {
    id: uid('ai'),
    ts: new Date().toISOString(),
    ...partial,
  }
  if (isSupabaseConfigured) {
    await supabase.from('ai_decisions').insert(toAiRow(decision))
    return clone(decision)
  }
  ensureSeeded()
  memAi = [decision, ...memAi]
  persist()
  return clone(decision)
}

/** Read the audit log (newest first), optionally filtered. */
export async function fetchAuditLog(filters = {}) {
  await delay()
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('audit_log').select('*')
    return applyFilters((data ?? []).map(fromRow), filters)
  }
  ensureSeeded()
  return clone(applyFilters(memAudit, filters))
}

/** Read AI decisions (newest first), optionally filtered. */
export async function fetchAiDecisions(filters = {}) {
  await delay()
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('ai_decisions').select('*')
    return applyFilters((data ?? []).map(fromAiRow), filters)
  }
  ensureSeeded()
  return clone(applyFilters(memAi, filters))
}

/** Look up one AI decision by id (used to render the rec a human acted against). */
export async function getAiDecision(id) {
  if (!id) return null
  const all = await fetchAiDecisions()
  return all.find((d) => d.id === id) ?? null
}

// ── distinct facets for filter dropdowns ──────────────────────────────────────
export async function fetchAuditFacets() {
  const all = await fetchAuditLog()
  const actors = new Map()
  const students = new Map()
  for (const e of all) {
    if (e.actor) actors.set(e.actor.id, e.actor)
    if (e.student) students.set(e.student.id, e.student)
  }
  return {
    actors: [...actors.values()].sort((a, b) => a.name.localeCompare(b.name)),
    students: [...students.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

// ── overview stats ────────────────────────────────────────────────────────────
export async function fetchAuditStats() {
  const [events, ai] = await Promise.all([fetchAuditLog(), fetchAiDecisions()])
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayIso = startOfToday.toISOString()

  const decisions = events.filter((e) => e.category === 'decision')
  const decisionsToday = decisions.filter((e) => e.ts >= todayIso).length
  const overrides = decisions.filter((e) => e.overrode).length
  const agreement = decisions.length
    ? Math.round(((decisions.length - overrides) / decisions.length) * 100)
    : null
  const pendingSync = events.filter(
    (e) => e.action === 'decision.admit' && !e.after?.synced,
  ).length

  return {
    total: events.length,
    decisionsToday,
    decisionsTotal: decisions.length,
    overrides,
    overrideRate: decisions.length ? Math.round((overrides / decisions.length) * 100) : 0,
    agreement,
    aiCount: ai.length,
    configChanges: events.filter((e) => e.category === 'config').length,
    pendingSync,
    lastActivity: events[0]?.ts ?? null,
  }
}

// ── diff helper for rubric/waiver edits ────────────────────────────────────────
/** Field-level diff between two rubric + waiver snapshots → DiffEntry[]. */
export function diffRubric(beforeCriteria, beforeWaivers, afterCriteria, afterWaivers) {
  const diff = []
  const byId = (arr) => new Map((arr ?? []).map((x) => [x.id, x]))

  const bC = byId(beforeCriteria)
  const aC = byId(afterCriteria)
  for (const [id, after] of aC) {
    const before = bC.get(id)
    const entity = `Criterion: ${after.label ?? id}`
    if (!before) {
      diff.push({ entity, field: '(added)', from: null, to: `${after.label} = ${fmtVal(after.value)}` })
      continue
    }
    if (before.enabled !== after.enabled)
      diff.push({ entity, field: 'enabled', from: before.enabled, to: after.enabled })
    if (before.value !== after.value)
      diff.push({ entity, field: 'value', from: fmtVal(before.value), to: fmtVal(after.value) })
    if (before.label !== after.label)
      diff.push({ entity, field: 'label', from: before.label, to: after.label })
  }
  for (const [id, before] of bC) {
    if (!aC.has(id))
      diff.push({ entity: `Criterion: ${before.label ?? id}`, field: '(removed)', from: before.label, to: null })
  }

  const bW = byId(beforeWaivers)
  const aW = byId(afterWaivers)
  for (const [id, after] of aW) {
    const before = bW.get(id)
    if (before && before.active !== after.active)
      diff.push({ entity: `Waiver: ${after.name ?? id}`, field: 'active', from: before.active, to: after.active })
  }
  return diff
}

function fmtVal(v) {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

// ── export (CSV / JSON download) ──────────────────────────────────────────────
function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = EXPORT_COLUMNS.map(([h]) => esc(h)).join(',')
  const body = rows
    .map((e) => EXPORT_COLUMNS.map(([, accessor]) => esc(accessor(e))).join(','))
    .join('\n')
  return `${header}\n${body}`
}

/** Build a downloadable Blob+filename for the given rows. Pure — no DOM. */
export function buildExport(rows, format = 'csv') {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  if (format === 'json') {
    return {
      filename: `audit-log-${stamp}.json`,
      mime: 'application/json',
      content: JSON.stringify(rows, null, 2),
    }
  }
  return { filename: `audit-log-${stamp}.csv`, mime: 'text/csv', content: toCsv(rows) }
}

/** Trigger a browser download of the rows in the chosen format. */
export function downloadAudit(rows, format = 'csv') {
  const { filename, mime, content } = buildExport(rows, format)
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ── Supabase row mappers (dormant until configured) ────────────────────────────
// Scalars become columns; nested objects ride along as jsonb. Column names match
// supabase/migrations/0001_audit.sql exactly.
function toRow(e) {
  return {
    id: e.id, ts: e.ts, category: e.category, action: e.action,
    actor: e.actor, device: e.device, student: e.student,
    request_id: e.requestId, waiver_type_id: e.waiverTypeId,
    summary: e.summary, before_state: e.before, after_state: e.after,
    diff: e.diff, ai_decision_id: e.aiDecisionId, overrode: e.overrode, note: e.note,
  }
}
function fromRow(r) {
  return {
    id: r.id, ts: r.ts, category: r.category, action: r.action,
    actor: r.actor, device: r.device, student: r.student,
    requestId: r.request_id, waiverTypeId: r.waiver_type_id,
    summary: r.summary, before: r.before_state, after: r.after_state,
    diff: r.diff ?? [], aiDecisionId: r.ai_decision_id, overrode: !!r.overrode, note: r.note ?? '',
  }
}
function toAiRow(d) {
  return {
    id: d.id, ts: d.ts, request_id: d.requestId, student: d.student,
    waiver_type_id: d.waiverTypeId, evaluator: d.evaluator, decision: d.decision,
    confidence: d.confidence, rationale: d.rationale, checks: d.checks,
    score_breakdown: d.scoreBreakdown, inputs_snapshot: d.inputsSnapshot,
  }
}
function fromAiRow(r) {
  return {
    id: r.id, ts: r.ts, requestId: r.request_id, student: r.student,
    waiverTypeId: r.waiver_type_id, evaluator: r.evaluator, decision: r.decision,
    confidence: r.confidence, rationale: r.rationale, checks: r.checks ?? [],
    scoreBreakdown: r.score_breakdown, inputsSnapshot: r.inputs_snapshot,
  }
}
