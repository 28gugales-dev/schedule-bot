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

/** Action status — colored dot + plain label (matches ReviewQueue's
 *  RecommendationPill; no bubble/ring). */
export function ActionPill({ action }) {
  const m = actionMeta(action)
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[m.tone] ?? TONE_DOT.neutral}`} aria-hidden="true" />
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
    <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
      {DECISION_LABEL[value] ?? value}
    </span>
  )
}

/** Small "Override" flag for decisions that contradicted the AI — matches the
 *  dot + plain-label language of ActionPill / DecisionPill. */
export function OverrideFlag() {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT.warning}`} aria-hidden="true" />
      Override
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
  rowHoverColor: 'rgba(255,255,255,0.06)',
  selectedRowBackgroundColor: 'rgba(255,255,255,0.10)',
  oddRowBackgroundColor: 'rgba(255,255,255,0.0)',
  borderColor: 'rgba(255,255,255,0.1)',
  wrapperBorderRadius: '14px',
})

// Enterprise skin: opaque console grid — mirrors the [data-skin="enterprise"]
// tokens (ag-grid builds its theme in JS, so it can't read those CSS vars).
// Dark variant is pure neutral grey to match the de-blued enterprise tokens.
export const gridThemeEnterpriseLight = themeQuartz.withParams({
  accentColor: '#0071e3',
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#f8fafc',
  headerTextColor: '#64748b',
  foregroundColor: '#0f172a',
  fontFamily: 'inherit',
  rowHoverColor: '#f1f5f9',
  selectedRowBackgroundColor: '#e0edfb',
  oddRowBackgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  wrapperBorderRadius: '0px',
})
export const gridThemeEnterpriseDark = themeQuartz.withParams({
  accentColor: '#0a84ff',
  backgroundColor: '#1c1c1c',
  headerBackgroundColor: '#161616',
  headerTextColor: '#9a9aa6',
  foregroundColor: '#f2f2f5',
  fontFamily: 'inherit',
  rowHoverColor: '#262626',
  selectedRowBackgroundColor: '#333333',
  oddRowBackgroundColor: '#1c1c1c',
  borderColor: '#2c2c2c',
  wrapperBorderRadius: '0px',
})
