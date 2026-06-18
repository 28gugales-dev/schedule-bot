import { useSkin } from '../../features/skin/SkinProvider.jsx'
import { GlassShell } from './GlassShell.jsx'
import { EnterpriseShell } from './EnterpriseShell.jsx'

/**
 * Shell selector. Picks the chrome for the active visual skin:
 *   'enterprise' → flat Brenda-Arjun console (flush sidebar + dense topbar)
 *   'glass'      → floating liquid-glass islands
 *
 * Both shells share navConfig (destinations/icons/title) and render the same
 * <Outlet/>, so page content is identical across skins — only the chrome and
 * (via CSS-variable overrides in index.css) the surface styling differ.
 *
 * Note: switching skin swaps component types, so the routed subtree remounts and
 * transient in-page state (wizard step, selected row) resets. That's acceptable
 * for a deliberate view switch.
 */
export function AppShell({ portal }) {
  const { skin } = useSkin()
  return skin === 'enterprise'
    ? <EnterpriseShell portal={portal} />
    : <GlassShell portal={portal} />
}
