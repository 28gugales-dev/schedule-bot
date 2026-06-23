// ════════════════════════════════════════════════════════════════════════════
// COUNSELORS / TEAM SERVICE — the roster of staff with per-person activity stats
// and display-only capabilities. Powers the Admin → Team panel.
//
// Dispatches like the rest of the data layer (mirrors audit.js):
//   isSupabaseConfigured === true  → roster from profiles WHERE role='admin'
//                          === false → roster from the audit actors (seedAudit)
//
// The roster→activity join key is the audit actor.id, which equals the auth uid
// in real mode (see actorFromAuth in audit.js) and the baked staff id in demo.
// ════════════════════════════════════════════════════════════════════════════

import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { fetchAuditLog, fetchAuditFacets } from './audit.js'

// What a staff member can do, in plain language. Order = display order.
export const CAPABILITIES = [
  { id: 'review',    label: 'Review queue',         desc: 'Open and decide waiver requests' },
  { id: 'configure', label: 'Configure rubric',     desc: 'Edit grading criteria and weights' },
  { id: 'waivers',   label: 'Manage waiver types',  desc: 'Create or retire waiver programs' },
  { id: 'batch',     label: 'Batch sync to SIS',    desc: 'Push approved decisions to Infinite Campus' },
  { id: 'audit',     label: 'View audit log',       desc: 'Read the full activity and AI trail' },
  { id: 'export',    label: 'Data rights / export', desc: 'Export records, honor access + deletion' },
]

// Display-only capability grant per role. IMPORTANT: the platform enforces a
// SINGLE counselor gate today (private.is_counselor() === role 'admin'). These
// finer per-role grants are an organizational view, not the enforced model — the
// Permissions tab says so. Wire these to RLS before treating them as security.
const ROLE_CAPS = {
  admin:     ['review', 'configure', 'waivers', 'batch', 'audit', 'export'],
  counselor: ['review', 'audit'],
  registrar: ['review', 'batch', 'audit', 'export'],
}

export function capabilitiesFor(role) {
  return ROLE_CAPS[role] ?? ROLE_CAPS.counselor
}

// Staff = everyone in the roster who isn't a student / the AI / a system actor.
const STAFF_ROLES = ['counselor', 'registrar', 'admin']

function emptyStats() {
  return { total: 0, decisions: 0, overrides: 0, overrideRate: 0, configChanges: 0, lastActivity: null }
}

/** Roll audit events up per actor id → Map<id, stats>. Pure (exported for tests). */
export function aggregateByActor(events) {
  const map = new Map()
  for (const e of events) {
    const id = e.actor?.id
    if (!id) continue
    let s = map.get(id)
    if (!s) { s = emptyStats(); map.set(id, s) }
    s.total += 1
    if (e.category === 'decision') {
      s.decisions += 1
      if (e.overrode) s.overrides += 1
    }
    if (e.category === 'config') s.configChanges += 1
    if (!s.lastActivity || e.ts > s.lastActivity) s.lastActivity = e.ts
  }
  for (const s of map.values()) {
    s.overrideRate = s.decisions ? Math.round((s.overrides / s.decisions) * 100) : 0
  }
  return map
}

// Synthesise a plausible work email for demo staff (audit actors carry no email).
function demoEmail(name) {
  const parts = String(name ?? '').replace(/[.]/g, '').split(/\s+/).filter(Boolean)
  if (!parts.length) return null
  const handle = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]
  return `${handle.toLowerCase()}@school.edu`
}

/** The staff roster, each enriched with activity stats + capabilities, busiest first. */
export async function fetchCounselors() {
  const events = await fetchAuditLog()
  const byActor = aggregateByActor(events)

  let roster
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'admin')
    roster = (data ?? []).map((p) => ({
      id: p.id,
      name: p.full_name ?? p.email ?? 'Counselor',
      email: p.email ?? null,
      role: p.role,
      joinedAt: p.created_at ?? null,
    }))
  } else {
    const { actors } = await fetchAuditFacets()
    roster = actors
      .filter((a) => STAFF_ROLES.includes(a.role))
      .map((a) => ({ id: a.id, name: a.name, email: demoEmail(a.name), role: a.role, joinedAt: null }))
  }

  return roster
    .map((r) => ({ ...r, stats: byActor.get(r.id) ?? emptyStats(), capabilities: capabilitiesFor(r.role) }))
    .sort((a, b) => b.stats.decisions - a.stats.decisions || a.name.localeCompare(b.name))
}
