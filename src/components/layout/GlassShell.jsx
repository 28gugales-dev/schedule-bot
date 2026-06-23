import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { ThemeToggle } from '../../features/theme/ThemeToggle.jsx'
import { ProfileMenu } from './ProfileMenu.jsx'
import { CommandTrigger } from './CommandPalette.jsx'
import { NAV, TITLE, useCollapsibleSidebar } from './navConfig.jsx'

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


/** The original floating liquid-glass shell — Brenda v1 island sidebar. */
export function GlassShell({ portal }) {
  const { user, signOut, demoMode } = useAuth()
  const links = NAV[portal] ?? []

  // Effective collapse + persisted toggle + the setter a nested route can force.
  const { collapsed, toggle, outletContext } = useCollapsibleSidebar()

  // Progressive-blur top bar (ported from the civic landing WaitlistNav): the bar
  // is invisible at the very top and, once the page scrolls, a backdrop-blur layer
  // fades in — masked to dissolve at its lower edge so content slides under it with
  // no hard cutoff line. (The document is the scroll context here — see AppShell
  // scroll gotcha — so window.scrollY is the right signal.)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const blurMask = 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)'

  // Easing shared with the design system — width + padding glide as one motion.
  const ease = 'transition-[width,padding] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none'

  return (
    <div className="relative min-h-screen text-ink">
      {/* ── Floating sidebar island (lg+) — flat frosted glass, CSS-width collapse.
          (Was a LiquidGlassCard; its inset-white "edge" layers read as a 3D bevel,
          so we use the same flat glass-card as the main content for consistency.) ── */}
      <aside
        className={`fixed left-3 top-3 bottom-3 z-30 hidden lg:flex ${ease} ${
          collapsed ? 'w-16' : 'w-52'
        }`}
      >
        <div className="glass-card h-full w-full overflow-hidden" style={{ borderRadius: '22px' }}>
          <div className={`flex h-full flex-col ${collapsed ? 'px-2' : 'px-3'}`}>
            {/* Brand + collapse toggle */}
            <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-1.5'}`}>
              {!collapsed && (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate font-display text-[23px] font-semibold leading-none tracking-tight text-ink">
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
                    `group flex items-center rounded-xl text-[14px] font-medium transition-colors ${
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

            {/* Footer — profile + settings menu */}
            <div className="mt-auto py-3">
              <ProfileMenu variant="glass" collapsed={collapsed} />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main column — left padding tracks sidebar width ── */}
      <div className={`relative z-10 flex min-h-screen flex-col ${ease} ${collapsed ? 'lg:pl-[80px]' : 'lg:pl-[240px]'}`}>
        {/* ── Top controls with progressive-blur "liquid glass" backdrop ── */}
        <div className="sticky top-0 z-20 pb-2">
          {/* Blur layer — fades in on scroll, masked to dissolve at its lower edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
            style={{
              opacity: scrolled ? 1 : 0,
              backdropFilter: 'blur(14px) saturate(140%)',
              WebkitBackdropFilter: 'blur(14px) saturate(140%)',
              maskImage: blurMask,
              WebkitMaskImage: blurMask,
            }}
          />
          <div className="relative flex items-center gap-3 px-4 pt-3 sm:px-6 lg:px-8">
          {/* Mobile brand (sidebar hidden < lg) */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
              W
            </div>
            <span className="font-display text-[17px] font-semibold tracking-tight text-ink">Waiver</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {demoMode ? (
              <span className="hidden rounded-full bg-warning-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning-700 dark:text-warning-300 ring-1 ring-warning-100 sm:inline">
                Demo
              </span>
            ) : (
              <span className="hidden text-sm text-muted sm:inline">{user?.email}</span>
            )}
            <CommandTrigger />
            <ThemeToggle />
            {/* Sign out lives in the sidebar footer on desktop; kept here for mobile (sidebar hidden < lg) */}
            <button
              type="button"
              onClick={signOut}
              className="glass-input rounded-xl px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover lg:hidden"
            >
              Sign out
            </button>
          </div>
          </div>
        </div>

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

        <main className="flex-1 overflow-auto px-4 pt-3 pb-5 sm:px-6 lg:px-5">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet context={outletContext} />
          </div>
        </main>
      </div>
    </div>
  )
}
