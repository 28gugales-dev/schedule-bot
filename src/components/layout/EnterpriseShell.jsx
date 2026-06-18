import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { ThemeToggle } from '../../features/theme/ThemeToggle.jsx'
import { SkinToggle } from '../../features/skin/SkinToggle.jsx'
import { NAV, TITLE, useCollapsibleSidebar } from './navConfig.jsx'

// Inline SVG: panel-left-close / open (collapse chevrons)
const IconCollapse = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <line x1="6" y1="2" x2="6" y2="14" />
    <polyline points="9 6 7 8 9 10" />
  </svg>
)
const IconExpand = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <line x1="6" y1="2" x2="6" y2="14" />
    <polyline points="8 6 10 8 8 10" />
  </svg>
)
const IconSignOut = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
    <polyline points="10 11 13 8 10 5" />
    <line x1="13" y1="8" x2="6" y2="8" />
  </svg>
)

/**
 * Flat enterprise console shell — Brenda-Arjun lineage. A flush, bordered slate
 * sidebar (sectioned nav) + a dense white topbar carrying only the PORTAL-LEVEL
 * title (pages keep their own H1s underneath — the shell never derives section
 * titles, so there's no duplicate-heading collision and live page data like a
 * "12 pending" count stays where it's computed).
 */
export function EnterpriseShell({ portal }) {
  const navigate = useNavigate()
  const { user, role, signOut, demoMode, setRole } = useAuth()
  const links = NAV[portal] ?? []
  const sections = Array.from(new Set(links.map((l) => l.section)))

  const { collapsed, toggle, outletContext } = useCollapsibleSidebar()

  // Reverse channel: a routed page can publish chrome (title/subtitle/search)
  // into the topbar via createPortal, and request a full-bleed content area.
  // `slotEl` is the topbar portal target; `pageChrome` hides the fallback title
  // when a page fills the slot; `fullBleed` drops the content padding/max-width.
  const [slotEl, setSlotEl] = useState(null)
  const [pageChrome, setPageChrome] = useState(false)
  const [fullBleed, setFullBleed] = useState(false)

  const ease = 'transition-[width] duration-200 ease-out motion-reduce:transition-none'

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* ── Flush, bordered slate sidebar (lg+) ── */}
      <aside
        className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-border bg-canvas lg:flex ${ease} ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Brand row — fixed 56px to align with the topbar's height */}
        <div className={`flex h-14 shrink-0 items-center border-b border-border ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-[13px] font-semibold text-white">
            W
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-[14px] font-semibold leading-none tracking-tight text-ink">Waiver</p>
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted">{TITLE[portal]}</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-scrim hover:text-ink ${
              collapsed ? '' : 'ml-auto'
            }`}
          >
            {collapsed ? <IconExpand /> : <IconCollapse />}
          </button>
        </div>

        {/* Sectioned nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {sections.map((section) => (
            <div key={section} className={`mb-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-2.5'}`}>
              {!collapsed ? (
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted/80">
                  {section}
                </div>
              ) : (
                <div className="mx-2 mb-1 border-t border-border" />
              )}
              {links
                .filter((l) => l.section === section)
                .map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    title={collapsed ? link.label : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center rounded-md text-[13px] transition-colors ${
                        collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-1.5'
                      } ${
                        isActive
                          ? 'bg-scrim-strong font-medium text-ink'
                          : 'text-ink/80 hover:bg-scrim hover:text-ink'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Left accent bar marks the active route — the enterprise tell. */}
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600" aria-hidden="true" />
                        )}
                        <span className={`shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-300' : 'text-muted'}`}>
                          {link.icon}
                        </span>
                        {!collapsed && <span className="truncate">{link.label}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>

        {/* Footer — role identity + sign out */}
        <div className="shrink-0 border-t border-border p-2.5">
          <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-2.5'}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-scrim text-[11px] font-semibold text-ink">
              {role === 'admin' ? 'C' : 'S'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-[12px] font-medium capitalize text-ink">{role}</p>
                <p className="truncate text-[10px] text-muted">{demoMode ? 'Demo session' : user?.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-scrim hover:text-ink"
            >
              <IconSignOut />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Dense topbar — portal title (left), session controls (right) */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-5">
          {/* Mobile brand (sidebar hidden < lg) */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-[13px] font-semibold text-white">
              W
            </div>
          </div>
          {/* Page-chrome slot: routed pages portal their title + search here.
              Falls back to the portal title for pages that don't (forms, etc.). */}
          <div ref={setSlotEl} className="flex min-w-0 flex-1 items-center gap-3">
            {!pageChrome && (
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold leading-tight text-ink">{TITLE[portal]}</p>
                <p className="hidden truncate text-[11px] leading-tight text-muted sm:block">Waiver Platform</p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {demoMode ? (
              <>
                <span className="hidden rounded-md bg-warning-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning-700 ring-1 ring-warning-100 dark:text-warning-300 sm:inline">
                  Demo
                </span>
                <div className="flex gap-0.5 rounded-lg bg-scrim p-0.5">
                  <button
                    type="button"
                    onClick={() => { setRole('student'); navigate('/student') }}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      role === 'student' ? 'bg-elevated text-ink shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRole('admin'); navigate('/admin') }}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      role === 'admin' ? 'bg-elevated text-ink shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Counselor
                  </button>
                </div>
              </>
            ) : (
              <span className="hidden text-sm text-muted sm:inline">{user?.email}</span>
            )}
            <SkinToggle />
            <ThemeToggle />
            {/* Desktop sign-out lives in the sidebar footer; this covers < lg */}
            <button
              type="button"
              onClick={signOut}
              className="glass-input rounded-md px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-glass-hover lg:hidden"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Mobile nav strip — sidebar is hidden below lg */}
        {links.length > 0 && (
          <nav className="sticky top-14 z-10 flex gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 lg:hidden">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive ? 'bg-scrim-strong text-ink' : 'text-muted hover:bg-scrim hover:text-ink'
                  }`
                }
              >
                <span className="shrink-0">{link.icon}</span>
                <span className="whitespace-nowrap">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <main className="flex-1 overflow-auto">
          {/* Same wrapper element always renders — only its className flips — so
              toggling fullBleed never remounts the routed subtree. */}
          <div className={fullBleed ? '' : 'mx-auto w-full max-w-[1680px] px-4 pt-3 pb-5 sm:px-6 lg:px-5'}>
            <Outlet context={{ ...outletContext, topbarSlotEl: slotEl, setPageChrome, setFullBleed }} />
          </div>
        </main>
      </div>
    </div>
  )
}
