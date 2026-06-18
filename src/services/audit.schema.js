// ════════════════════════════════════════════════════════════════════════════
// AUDIT CONTRACT — single source of truth for the audit trail + AI-decision log.
//
// Every producer and consumer imports from here so the shapes never drift:
//   • seedAudit.js            (historical fixtures)
//   • api.js                  (emits events at the mutation seams)
//   • audit.js                (persistence + export)
//   • features/audit/*        (the three views + detail panels)
//   • supabase/migrations     (column names mirror these field names 1:1)
//
// When Supabase lands, the table columns map directly onto AuditEvent /
// AiDecision below — keep them aligned and the swap stays a one-branch change.
// ════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} Actor   WHO performed the action.
 * @property {string} id     'demo-admin' | 'staff-alvarez' | 'system' …
 * @property {string} name   'M. Alvarez' | 'System'
 * @property {('counselor'|'registrar'|'admin'|'student'|'ai')} role
 */

/**
 * @typedef {Object} Device  WHICH DEVICE the action came from.
 * @property {string} id     stable per-browser uuid (or a baked id for seeds)
 * @property {string} label  human label e.g. "Chrome · Windows" / "Safari · iPad"
 * @property {string} ua     raw user-agent string (forensic detail)
 */

/**
 * @typedef {Object} DiffEntry  one field-level change, for config edits.
 * @property {string} entity  e.g. 'Criterion: Minimum GPA' | 'Waiver: PE Exemption'
 * @property {string} field   'value' | 'enabled' | 'active' | 'label' | '(added)' | '(removed)'
 * @property {*} from
 * @property {*} to
 */

/**
 * @typedef {Object} AuditEvent
 * @property {string} id
 * @property {string} ts            ISO timestamp (WHEN)
 * @property {Actor}  actor         (WHO)
 * @property {Device} device        (WHICH DEVICE)
 * @property {string} category      one of AUDIT_CATEGORY
 * @property {string} action        one of AUDIT_ACTION keys
 * @property {?{id:string,name:string}} student  (STUDENT AFFECTED)
 * @property {?string} requestId
 * @property {?string} waiverTypeId
 * @property {string} summary       human one-liner
 * @property {*} before            snapshot BEFORE the change (shape varies by action)
 * @property {*} after             snapshot AFTER the change
 * @property {DiffEntry[]} diff     field-level diff (config edits; [] otherwise)
 * @property {?string} aiDecisionId cross-link → AiDecision.id that informed a decision
 * @property {boolean} overrode     true when a human decision contradicts the AI rec
 * @property {string} note          free-text note attached to the action
 */

/**
 * @typedef {Object} AiCheck
 * @property {string} id
 * @property {string} label
 * @property {string} claimed
 * @property {string} actual
 * @property {boolean} passed
 * @property {number} weight        relative weight in the score (0..1)
 * @property {number} contribution  signed points this check added to confidence
 * @property {string} reasoning
 */

/**
 * @typedef {Object} AiDecision
 * @property {string} id
 * @property {string} ts
 * @property {string} requestId
 * @property {{id:string,name:string}} student
 * @property {string} waiverTypeId
 * @property {string} evaluator     model/version label, e.g. 'rubric-eval-v1'
 * @property {('admit'|'deny'|'review')} decision
 * @property {number} confidence    0..1
 * @property {string} rationale     summary of WHY this score
 * @property {AiCheck[]} checks
 * @property {{base:number,items:{label:string,delta:number}[]}} scoreBreakdown  HOW confidence was built
 * @property {Object} inputsSnapshot  WHAT the evaluator saw (claim + roster digest)
 */

// ── Categories ──────────────────────────────────────────────────────────────
export const AUDIT_CATEGORY = {
  DECISION: 'decision',
  CONFIG: 'config',
  SUBMISSION: 'submission',
  SYNC: 'sync',
}

export const CATEGORY_META = {
  decision:   { label: 'Decision',   tone: 'brand'   },
  config:     { label: 'Config',     tone: 'warning' },
  submission: { label: 'Submission', tone: 'neutral' },
  sync:       { label: 'Sync',       tone: 'info'    },
}

// ── Actions ─────────────────────────────────────────────────────────────────
// tone drives pill colour: success | danger | warning | brand | neutral | info
export const AUDIT_ACTION = {
  'decision.admit':  { key: 'decision.admit',  label: 'Admitted',        category: 'decision',   tone: 'success' },
  'decision.deny':   { key: 'decision.deny',   label: 'Denied',          category: 'decision',   tone: 'danger'  },
  'decision.flag':   { key: 'decision.flag',   label: 'Flagged',         category: 'decision',   tone: 'warning' },
  'rubric.update':   { key: 'rubric.update',   label: 'Rubric edited',   category: 'config',     tone: 'warning' },
  'waiver.toggle':   { key: 'waiver.toggle',   label: 'Waiver toggled',  category: 'config',     tone: 'warning' },
  'waiver.submit':   { key: 'waiver.submit',   label: 'Waiver submitted',category: 'submission', tone: 'neutral' },
  'batch.sync':      { key: 'batch.sync',      label: 'Batch synced',    category: 'sync',       tone: 'info'    },
}

/** Safe lookup for an action's metadata (never throws on unknown keys). */
export function actionMeta(action) {
  return (
    AUDIT_ACTION[action] ?? { key: action, label: action, category: 'config', tone: 'neutral' }
  )
}

// ── Actor role labels ─────────────────────────────────────────────────────────
export const ROLE_LABEL = {
  counselor: 'Counselor',
  registrar: 'Registrar',
  admin: 'Administrator',
  student: 'Student',
  ai: 'AI',
}

/** The non-human actor used for AI-generated evaluation records. */
export const SYSTEM_ACTOR = Object.freeze({ id: 'system', name: 'System', role: 'ai' })

/** Evaluator label stamped on every AiDecision (bump when scoring logic changes). */
export const EVALUATOR = 'rubric-eval-v1'

// ── Export column order — the single source for CSV headers/columns ───────────
// Each entry: [columnHeader, accessor(event) => string]. Defined here so the
// export file and any column UI agree on order + naming.
export const EXPORT_COLUMNS = [
  ['Time',        (e) => e.ts],
  ['Action',      (e) => actionMeta(e.action).label],
  ['Category',    (e) => e.category],
  ['Actor',       (e) => e.actor?.name ?? ''],
  ['Actor role',  (e) => ROLE_LABEL[e.actor?.role] ?? e.actor?.role ?? ''],
  ['Device',      (e) => e.device?.label ?? ''],
  ['Student',     (e) => e.student?.name ?? ''],
  ['Student ID',  (e) => e.student?.id ?? ''],
  ['Request',     (e) => e.requestId ?? ''],
  ['Overrode AI', (e) => (e.overrode ? 'yes' : '')],
  ['Summary',     (e) => e.summary ?? ''],
  ['Note',        (e) => e.note ?? ''],
]

// ── localStorage keys (demo persistence) ─────────────────────────────────────
export const LS_KEYS = {
  audit: 'waiver:audit-log',
  ai: 'waiver:ai-decisions',
  device: 'waiver:device-id',
  seeded: 'waiver:audit-seeded',
}
