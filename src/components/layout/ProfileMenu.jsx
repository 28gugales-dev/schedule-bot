import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import { ThemeToggle } from '../../features/theme/ThemeToggle.jsx'

const MENU_W = 256

// gear (settings affordance on the trigger)
const IconGear = ({ className = '' }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="8" cy="8" r="2.25" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
  </svg>
)
const IconSignOut = ({ className = '' }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
    <polyline points="10 11 13 8 10 5" />
    <line x1="13" y1="8" x2="6" y2="8" />
  </svg>
)

/**
 * Profile footer turned into a settings menu. Replaces the bare sign-out button
 * in both shells' sidebar footers. The trigger keeps each shell's existing avatar
 * look (via `variant`); the popover is token-themed and identical across skins.
 *
 * Rendered through a portal to <body> with fixed coords measured from the trigger
 * — the GlassShell footer lives inside an `overflow-hidden` glass-card, so an
 * inline absolute popover would be clipped. Fixed-to-viewport is safe because both
 * sidebars are sticky/fixed (the trigger never scrolls).
 */
export function ProfileMenu({ variant = 'enterprise', collapsed = false }) {
  const navigate = useNavigate()
  const { user, role, signOut, demoMode, setRole } = useAuth()

  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ left: 0, bottom: 0 })
  const triggerRef = useRef(null)
  const popRef = useFocusTrap(open, { onClose: () => setOpen(false) })

  useLayoutEffect(() => {
    if (!open) return
    const compute = () => {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      const left = Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8))
      const bottom = window.innerHeight - r.top + 8
      setCoords({ left, bottom })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [open])

  const initials = role === 'admin' ? 'C' : 'S'
  const roleLabel = role === 'admin' ? 'Counselor' : 'Student'
  const displayName = user?.user_metadata?.name ?? roleLabel
  const avatarClass =
    variant === 'glass'
      ? 'bg-brand-50 text-brand-700 dark:text-brand-300'
      : 'bg-scrim text-ink'

  const switchRole = (next) => {
    setRole(next)
    setOpen(false)
    navigate(next === 'admin' ? '/admin' : '/student')
  }
  const handleSignOut = () => {
    setOpen(false)
    signOut()
  }
  const seg = (active) =>
    `flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
      active ? 'bg-elevated text-ink shadow-sm' : 'text-muted hover:text-ink'
    }`

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account and settings"
        title="Account and settings"
        className={`flex w-full items-center rounded-md transition-colors hover:bg-scrim ${
          collapsed ? 'justify-center p-1' : 'gap-2.5 p-1.5'
        }`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarClass}`}>
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 overflow-hidden text-left">
              <span className="block truncate text-[12px] font-medium text-ink">{displayName}</span>
              <span className="block truncate text-[10px] text-muted">{demoMode ? 'Demo session' : user?.email}</span>
            </span>
            <IconGear className="shrink-0 text-muted" />
          </>
        )}
      </button>

      {open &&
        createPortal(
          <>
            {/* transparent click-catcher — click anywhere to close */}
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              ref={popRef}
              role="menu"
              aria-label="Account menu"
              style={{ position: 'fixed', left: coords.left, bottom: coords.bottom, width: MENU_W }}
              className="glass-card animate-toast-in z-[61] overflow-hidden p-1.5"
            >
              {/* Account header */}
              <div className="flex items-center gap-2.5 px-2 py-2">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${avatarClass}`}>
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{displayName}</p>
                  <p className="truncate text-[11px] text-muted">{user?.email ?? 'Demo session'}</p>
                </div>
                <span className="shrink-0 rounded-md bg-scrim px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {roleLabel}
                </span>
              </div>

              <div className="my-1 border-t border-border" />

              {/* Appearance */}
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[13px] text-ink">Appearance</span>
                <ThemeToggle />
              </div>

              {/* Demo role switch — demo mode only */}
              {demoMode && (
                <>
                  <div className="my-1 border-t border-border" />
                  <div className="px-2 py-1.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Demo role</p>
                    <div className="flex gap-0.5 rounded-lg bg-scrim p-0.5">
                      <button type="button" role="menuitemradio" aria-checked={role === 'student'} onClick={() => switchRole('student')} className={seg(role === 'student')}>
                        Student
                      </button>
                      <button type="button" role="menuitemradio" aria-checked={role === 'admin'} onClick={() => switchRole('admin')} className={seg(role === 'admin')}>
                        Counselor
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="my-1 border-t border-border" />

              {/* Sign out */}
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-danger-600 transition-colors hover:bg-danger-50"
              >
                <IconSignOut />
                Sign out
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
