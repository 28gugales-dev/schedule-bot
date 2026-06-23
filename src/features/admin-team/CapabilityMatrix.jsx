import { CAPABILITIES, capabilitiesFor } from '../../services/counselors.js'
import { roleLabel } from '../audit/auditShared.jsx'

const ROLE_ORDER = ['admin', 'registrar', 'counselor']

const IconCheck = ({ className = '' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-label="granted">
    <polyline points="3 8.5 6.5 12 13 4" />
  </svg>
)

/** Role → capability grid (display-only). Columns are the roles actually present
 *  in the roster; cells show which capabilities each role carries. */
export function CapabilityMatrix({ counselors }) {
  const present = ROLE_ORDER.filter((r) => counselors.some((c) => c.role === r))
  const roles = present.length ? present : ['admin']
  const countByRole = (r) => counselors.filter((c) => c.role === r).length

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Capability</th>
              {roles.map((r) => (
                <th key={r} className="px-4 py-3 text-center">
                  <span className="block text-[13px] font-semibold text-ink">{roleLabel(r)}</span>
                  <span className="block text-[11px] font-normal text-muted">
                    {countByRole(r)} {countByRole(r) === 1 ? 'person' : 'people'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {CAPABILITIES.map((cap) => (
              <tr key={cap.id}>
                <td className="px-4 py-3">
                  <span className="block font-medium text-ink">{cap.label}</span>
                  <span className="block text-xs text-muted">{cap.desc}</span>
                </td>
                {roles.map((r) => {
                  const granted = capabilitiesFor(r).includes(cap.id)
                  return (
                    <td key={r} className="px-4 py-3 text-center">
                      {granted ? (
                        <IconCheck className="mx-auto text-success-600 dark:text-success-400" />
                      ) : (
                        <span className="text-muted/60" aria-label="not granted">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rounded-lg bg-scrim px-4 py-3 text-xs leading-relaxed text-muted">
        Capabilities are granted by role. The platform currently enforces a single counselor gate —
        every admin has full access — so the finer roles shown here are organizational, not yet
        enforced server-side. Wiring per-role enforcement into row-level security is a separate change.
      </p>
    </div>
  )
}
