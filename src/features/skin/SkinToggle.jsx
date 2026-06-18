import { useSkin } from './SkinProvider.jsx'

// Enterprise target — a dashboard/panels glyph (shown while in Glass view; click
// switches TO enterprise). Mirrors the ThemeToggle convention: the icon depicts
// the mode you'll land on.
const IconEnterprise = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <line x1="6" y1="2.5" x2="6" y2="13.5" />
    <line x1="6" y1="7" x2="14" y2="7" />
  </svg>
)

// Glass target — a droplet (shown while in Enterprise view; click → glass).
const IconGlass = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 1.5c2.4 3 4 5 4 7a4 4 0 0 1-8 0c0-2 1.6-4 4-7Z" />
    <path d="M6.4 9.2a1.8 1.8 0 0 0 1.6 1.7" />
  </svg>
)

/**
 * Single-tap view switcher (glass ⇄ enterprise). Lives in BOTH shells so a user
 * can always get back. Shares the ThemeToggle's `glass-input` base, which itself
 * degrades to a flat slate control under the enterprise skin — so the pair reads
 * consistently in either view.
 */
export function SkinToggle({ className = '' }) {
  const { skin, toggleSkin } = useSkin()
  const isEnterprise = skin === 'enterprise'
  return (
    <button
      type="button"
      onClick={toggleSkin}
      aria-label={isEnterprise ? 'Switch to Glass view' : 'Switch to Enterprise view'}
      title={isEnterprise ? 'Glass view' : 'Enterprise view'}
      className={`glass-input flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:text-ink hover:bg-glass-hover ${className}`}
    >
      {isEnterprise ? <IconGlass /> : <IconEnterprise />}
    </button>
  )
}
