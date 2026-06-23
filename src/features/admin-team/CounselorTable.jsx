import { ActorAvatar, roleLabel, fmtDateTime, TONE_PILL } from '../audit/auditShared.jsx'
import { CAPABILITIES } from '../../services/counselors.js'

const ROLE_TONE = { admin: 'brand', registrar: 'info', counselor: 'neutral' }

/** Roster table. Clicking a row hands the counselor id up (used to jump into the
 *  Activity tab filtered to that person). */
export function CounselorTable({ counselors, onSelect }) {
  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-muted">
            <th className="px-4 py-3 font-semibold">Counselor</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 text-right font-semibold">Decisions</th>
            <th className="px-4 py-3 text-right font-semibold">Override</th>
            <th className="px-4 py-3 text-right font-semibold">Access</th>
            <th className="px-4 py-3 font-semibold">Last active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {counselors.map((c) => (
            <tr
              key={c.id}
              onClick={() => onSelect?.(c.id)}
              className="cursor-pointer transition-colors hover:bg-scrim"
              title={`View ${c.name}'s activity`}
            >
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  <ActorAvatar actor={c} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{c.name}</span>
                    {c.email && <span className="block truncate text-xs text-muted">{c.email}</span>}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_PILL[ROLE_TONE[c.role] ?? 'neutral']}`}>
                  {roleLabel(c.role)}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink">{c.stats.decisions}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted">
                {c.stats.decisions ? `${c.stats.overrideRate}%` : '—'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted">
                {c.capabilities.length}/{CAPABILITIES.length}
              </td>
              <td className="px-4 py-3 text-muted">{fmtDateTime(c.stats.lastActivity)}</td>
            </tr>
          ))}
          {counselors.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                No counselors found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
