import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { ThemeToggle } from '../../features/theme/ThemeToggle.jsx'
import { LiquidGlassCard, LiquidGlassFilter } from '../ui/LiquidGlass.jsx'

const COLLAPSE_KEY = 'ccc:sidebar-collapsed'

const NAV = {
  student: [
    {
      to: '/student',
      label: 'New Request',
      end: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <line x1="8" y1="5" x2="8" y2="11" />
          <line x1="5" y1="8" x2="11" y2="8" />
        </svg>
      ),
    },
    {
      to: '/student/requests',
      label: 'My Requests',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="4" x2="13" y2="4" />
          <line x1="3" y1="8" x2="13" y2="8" />
          <line x1="3" y1="12" x2="9" y2="12" />
        </svg>
      ),
    },
  ],
  admin: [
    {
      to: '/admin',
      label: 'Review Queue',
      end: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <line x1="5" y1="6" x2="11" y2="6" />
          <line x1="5" y1="9" x2="9" y2="9" />
        </svg>
      ),
    },
    {
      to: '/admin/rubric',
      label: 'Rubric Builder',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="5" x2="13" y2="5" />
          <line x1="3" y1="8" x2="10" y2="8" />
          <line x1="3" y1="11" x2="7" y2="11" />
          <circle cx="12" cy="11" r="1.5" />
        </svg>
      ),
    },
    {
      to: '/admin/batch',
      label: 'Batch Sync',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 6A5 5 0 1 0 10 12" />
          <polyline points="10 12 13 12 13 9" />
        </svg>
      ),
    },
  ],
}

const TITLE = {
  student: 'Student Portal',
  admin: 'Command Center',
}

// Inline SVG: panel-left-close (collapse — chevrons point left)
const IconCollapse = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <line x1="6" y1="2" x2="6" y2="14" />
    <polyline points="9 6 7 8 9 10" />
  </svg>
)

// Inline SVG: panel-left-open (expand — chevrons point right)
const IconExpand = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <line x1="6" y1="2" x2="6" y2="14" />
    <polyline points="8 6 10 8 8 10" />
  </svg>
)

export function AppShell({ portal }) {
  const navigate = useNavigate()
  const { user, role, signOut, demoMode, setRole } = useAuth()
  const links = NAV[portal] ?? []

  // Start expanded; reconcile from localStorage on mount (avoids hydration flash)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch { /* ignore */ }
  }, [])

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  // Easing shared with the design system — width + padding glide as one motion.
  const ease = 'transition-[width,padding] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none'

  return (
    <div className="relative min-h-screen text-ink">
      {/* Single shared SVG displacement filter for every LiquidGlassCard on screen */}
      <LiquidGlassFilter />

      {/* ── Floating liquid-glass sidebar (lg+) — Brenda v1 LiquidGlassCard island, CSS-width collapse ── */}
      <aside
        className={`fixed left-3 top-3 bottom-3 z-30 hidden lg:flex ${ease} ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <LiquidGlassCard
          className="h-full w-full ring-1 ring-highlight"
          contentClassName="bg-gradient-to-b from-glass-strong to-glass-weak"
          blurIntensity="xl"
          shadowIntensity="md"
          glowIntensity="md"
          borderRadius="22px"
        >
          <div className={`flex h-full flex-col ${collapsed ? 'px-2' : 'px-3'}`}>
            {/* Brand + collapse toggle */}
            <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-1.5'}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-base font-semibold text-white shadow-[0_4px_12px_-2px_rgba(0,113,227,0.5)]">
                W
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate font-display text-[19px] font-semibold leading-none tracking-tight text-ink">
                    Waiver
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-muted">{TITLE[portal]}</p>
                </div>
              )}
              <button
                type="button"
                onClick={toggle}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-scrim hover:text-ink ${
                  collapsed ? 'mt-2' : ''
                }`}
              >
                {collapsed ? <IconExpand /> : <IconCollapse />}
              </button>
            </div>

            <nav className="mt-2 flex flex-1 flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  title={collapsed ? link.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center rounded-xl text-[13px] font-medium transition-colors ${
                      collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-brand-600/12 text-brand-700 dark:text-brand-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                        : 'text-muted hover:bg-scrim hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`shrink-0 transition-colors ${isActive ? 'text-brand-600 dark:text-brand-300' : 'text-muted group-hover:text-ink'}`}>
                        {link.icon}
                      </span>
                      {!collapsed && <span className="truncate">{link.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Footer — current role identity */}
            <div className="mt-auto border-t border-highlight py-3">
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-1.5'}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                  {role === 'admin' ? 'C' : 'S'}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-[12px] font-medium capitalize text-ink">{role}</p>
                    <p className="truncate text-[10px] text-muted">{demoMode ? 'Demo session' : user?.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </LiquidGlassCard>
      </aside>

      {/* ── Main column — left padding tracks sidebar width ── */}
      <div className={`relative z-10 flex min-h-screen flex-col ${ease} ${collapsed ? 'lg:pl-[88px]' : 'lg:pl-[248px]'}`}>
        {/* ── Floating liquid-glass top bar — mirrors the sidebar island ── */}
        <header className="sticky top-0 z-20 px-4 pt-3 sm:px-6 lg:px-8">
          <LiquidGlassCard
            className="ring-1 ring-highlight"
            contentClassName="flex h-14 items-center justify-between gap-3 px-4 sm:px-5"
            blurIntensity="xl"
            shadowIntensity="md"
            glowIntensity="md"
            borderRadius="18px"
          >
            {/* Mobile brand (sidebar hidden < lg) */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
                W
              </div>
              <span className="font-display text-[17px] font-semibold tracking-tight text-ink">Waiver</span>
            </div>
            <span className="hidden text-sm font-medium capitalize text-muted lg:inline">{role} workspace</span>

            <div className="flex items-center gap-3">
              {demoMode ? (
                <>
                  <span className="hidden rounded-full bg-warning-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning-700 dark:text-warning-300 ring-1 ring-warning-100 sm:inline">
                    Demo
                  </span>
                  <div className="flex gap-0.5 rounded-xl bg-scrim p-0.5 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => { setRole('student'); navigate('/student') }}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        role === 'student'
                          ? 'bg-elevated text-ink shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRole('admin'); navigate('/admin') }}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        role === 'admin'
                          ? 'bg-elevated text-ink shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      Counselor
                    </button>
                  </div>
                </>
              ) : (
                <span className="hidden text-sm text-muted sm:inline">{user?.email}</span>
              )}
              <ThemeToggle />
              <button
                type="button"
                onClick={signOut}
                className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
              >
                Sign out
              </button>
            </div>
          </LiquidGlassCard>
        </header>

        {/* Tablet / phone nav — the sidebar is hidden below lg, so the same
            destinations live here as a sticky, scrollable glass strip. */}
        {links.length > 0 && (
          <nav className="glass-panel sticky top-[68px] z-10 flex gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600/12 text-brand-700 dark:text-brand-300'
                      : 'text-muted hover:bg-scrim hover:text-ink'
                  }`
                }
              >
                <span className="shrink-0">{link.icon}</span>
                <span className="whitespace-nowrap">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
