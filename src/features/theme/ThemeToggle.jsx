import { useTheme } from './ThemeProvider.jsx'

// Sun (shown in dark mode — click goes to light)
const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="8" r="3.25" />
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1.1 1.1M11.9 11.9 13 13M13 3l-1.1 1.1M4.1 11.9 3 13" />
  </svg>
)

// Moon (shown in light mode — click goes to dark)
const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.5 9.2A5.5 5.5 0 1 1 6.8 2.5 4.3 4.3 0 0 0 13.5 9.2Z" />
  </svg>
)

/**
 * Single-tap light/dark toggle. Icon shows the mode you'll switch TO.
 * Styled to sit beside the header's other glass controls.
 */
export function ThemeToggle({ className = '' }) {
  const { resolvedTheme, toggle } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`glass-input flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:text-ink hover:bg-glass-hover ${className}`}
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  )
}
