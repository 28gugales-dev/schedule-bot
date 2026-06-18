// Shared presentational atoms + AG-Grid theme for the audit views.
// Keeps ActivityLog / AiDecisionLog / detail panels visually consistent and
// avoids duplicating the grid theme params.

import { themeQuartz } from 'ag-grid-community'
import { actionMeta, ROLE_LABEL, CATEGORY_META } from '../../services/audit.schema.js'

// ── date formatting ───────────────────────────────────────────────────────────
export function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
export function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
// Compact numeric date — MM/DD/YYYY — for dense grid Time columns.
export function fmtDateNum(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
  })
}

// ── tone → tailwind token classes (pills + dots) ──────────────────────────────
export const TONE_PILL = {
  success: 'bg-success-50 text-success-700 dark:text-success-300 ring-success-300',
  danger:  'bg-danger-50 text-danger-700 dark:text-danger-300 ring-danger-300',
  warning: 'bg-warning-50 text-warning-700 dark:text-warning-300 ring-warning-300',
  brand:   'bg-brand-50 text-brand-700 dark:text-brand-300 ring-brand-200',
  info:    'bg-brand-50 text-brand-700 dark:text-brand-300 ring-brand-200',
  neutral: 'bg-scrim text-muted ring-hairline',
}
export const TONE_DOT = {
  success: 'bg-success-500',
  danger:  'bg-danger-500',
  warning: 'bg-warning-500',
  brand:   'bg-brand-500',
  info:    'bg-brand-400',
  neutral: 'bg-muted',
}

/** Coloured pill for an audit action (dot + label). */
export function ActionPill({ action }) {
  const m = actionMeta(action)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${TONE_PILL[m.tone] ?? TONE_PILL.neutral}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[m.tone] ?? TONE_DOT.neutral}`} aria-hidden="true" />
      {m.label}
    </span>
  )
}

/** Pill for one of the three AI decision outcomes. */
const DECISION_TONE = { admit: 'success', deny: 'danger', review: 'warning' }
const DECISION_LABEL = { admit: 'Admit', deny: 'Deny', review: 'Review' }
export function DecisionPill({ value }) {
  const tone = DECISION_TONE[value] ?? 'neutral'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONE_PILL[tone]}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
      {DECISION_LABEL[value] ?? value}
    </span>
  )
}

/** Small "Override" flag for decisions that contradicted the AI. */
export function OverrideFlag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-700 dark:text-warning-300 ring-1 ring-warning-300">
      ⚡ Override
    </span>
  )
}

export function roleLabel(role) {
  return ROLE_LABEL[role] ?? role ?? '—'
}

/** Initials avatar for an actor (System gets a distinct mark). Pass `className`
 *  to override the default size (Tailwind needs literal class names). */
export function ActorAvatar({ actor, className = 'h-8 w-8 text-[11px]' }) {
  const isAi = actor?.role === 'ai'
  const initials = isAi
    ? '◆'
    : (actor?.name ?? '?')
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${className} ${
        isAi ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 dark:text-brand-300'
      }`}
    >
      {initials}
    </span>
  )
}

export { CATEGORY_META }

// ── AG-Grid theme (mirrors the token values used elsewhere) ───────────────────
export const gridThemeLight = themeQuartz.withParams({
  accentColor: '#0071e3',
  backgroundColor: 'rgba(255,255,255,0.35)',
  headerBackgroundColor: 'rgba(255,255,255,0.55)',
  headerTextColor: '#71717a',
  foregroundColor: '#1d1d1f',
  fontFamily: 'inherit',
  rowHoverColor: 'rgba(0,113,227,0.07)',
  selectedRowBackgroundColor: 'rgba(0,113,227,0.12)',
  oddRowBackgroundColor: 'rgba(255,255,255,0.0)',
  borderColor: 'rgba(15,23,42,0.08)',
  wrapperBorderRadius: '14px',
})
export const gridThemeDark = themeQuartz.withParams({
  accentColor: '#0a84ff',
  backgroundColor: 'rgba(28,28,33,0.0)',
  headerBackgroundColor: 'rgba(255,255,255,0.05)',
  headerTextColor: '#9a9aa6',
  foregroundColor: '#f2f2f5',
  fontFamily: 'inherit',
  rowHoverColor: 'rgba(10,132,255,0.14)',
  selectedRowBackgroundColor: 'rgba(10,132,255,0.22)',
  oddRowBackgroundColor: 'rgba(255,255,255,0.0)',
  borderColor: 'rgba(255,255,255,0.1)',
  wrapperBorderRadius: '14px',
})
