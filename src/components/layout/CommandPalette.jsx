import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { useTheme } from '../../features/theme/ThemeProvider.jsx'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import { searchStudents } from '../../services/api.js'
import { NAV } from './navConfig.jsx'

// ── Icons (16px, matches navConfig stroke style) ─────────────────────────────
const IconSearch = ({ className = '' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" />
    <line x1="10.5" y1="10.5" x2="14" y2="14" />
  </svg>
)
const IconTheme = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.5 9.2A5.5 5.5 0 1 1 6.8 2.5 4.3 4.3 0 0 0 13.5 9.2Z" />
  </svg>
)
const IconSignOut = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
    <polyline points="10 11 13 8 10 5" />
    <line x1="13" y1="8" x2="6" y2="8" />
  </svg>
)
const IconSwitch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 3 1.5 5.5 4 8" />
    <path d="M1.5 5.5H11a3.5 3.5 0 0 1 0 7H9" />
    <polyline points="12 13 14.5 10.5 12 8" />
  </svg>
)
const IconStudent = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="5.5" r="2.5" />
    <path d="M3 13.5a5 5 0 0 1 10 0" />
  </svg>
)

// macOS shows ⌘, everything else Ctrl. Display only — the listener accepts both.
const IS_MAC =
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || '')
const KBD = IS_MAC ? '⌘K' : 'Ctrl K'

const Ctx = createContext({ open: () => {} })
export const useCommandPalette = () => useContext(Ctx)

/**
 * Global ⌘K / Ctrl+K command palette. Mounted once in AppShell so the shortcut,
 * portal, and modal survive skin switches and live above both shells.
 *
 * v1 indexes navigation destinations (from navConfig) + a few zero-data actions
 * (theme, sign out, demo role switch). Searching a specific request/student is a
 * follow-up — that data is fetched per-page today, not in a shared store.
 */
export function CommandPaletteProvider({ portal, children }) {
  const [open, setOpen] = useState(false)
  const value = useMemo(() => ({ open: () => setOpen(true) }), [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault() // some browsers bind ⌘K to the address bar
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && <Palette portal={portal} onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  )
}

/** Topbar affordance — looks like a search field, opens the palette. */
export function CommandTrigger({ className = '' }) {
  const { open } = useCommandPalette()
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open command palette"
      title={`Search and commands (${KBD})`}
      className={`glass-input flex h-9 items-center gap-2 rounded-xl px-2.5 text-muted transition hover:text-ink hover:bg-glass-hover ${className}`}
    >
      <IconSearch className="shrink-0" />
      <span className="hidden text-[13px] sm:inline">Search</span>
      <kbd className="hidden rounded bg-scrim px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline">{KBD}</kbd>
    </button>
  )
}

function buildCommands({ portal, role, demoMode, navigate, signOut, setRole, theme, onClose }) {
  const go = (to) => () => { onClose(); navigate(to) }

  const nav = (NAV[portal] ?? []).map((l) => ({
    id: `nav:${l.to}`,
    label: l.label,
    group: l.section,
    icon: l.icon,
    run: go(l.to),
  }))

  const actions = [
    {
      id: 'act:theme',
      label: theme.resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      group: 'Actions',
      icon: <IconTheme />,
      run: () => { theme.toggle(); onClose() },
    },
    {
      id: 'act:signout',
      label: 'Sign out',
      group: 'Actions',
      icon: <IconSignOut />,
      run: () => { onClose(); signOut() },
    },
  ]

  // Demo-only: the role switch that used to live in the topbar toggle.
  if (demoMode) {
    const toAdmin = role !== 'admin'
    actions.push({
      id: 'act:role',
      label: toAdmin ? 'Switch to Counselor view' : 'Switch to Student view',
      group: 'Actions',
      icon: <IconSwitch />,
      run: () => { onClose(); setRole(toAdmin ? 'admin' : 'student'); navigate(toAdmin ? '/admin' : '/student') },
    })
  }

  return [...nav, ...actions]
}

function Palette({ portal, onClose }) {
  const navigate = useNavigate()
  const { role, demoMode, signOut, setRole } = useAuth()
  const theme = useTheme()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [students, setStudents] = useState([])
  const [searching, setSearching] = useState(false)
  const popRef = useFocusTrap(true, { onClose })
  const activeRef = useRef(null)

  const commands = useMemo(
    () => buildCommands({ portal, role, demoMode, navigate, signOut, setRole, theme, onClose }),
    [portal, role, demoMode, navigate, signOut, setRole, theme, onClose],
  )

  // Inline match: case-insensitive substring over label + group. Over <15 items
  // this is complete — no ranking/fuzzy needed.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => `${c.label} ${c.group}`.toLowerCase().includes(q))
  }, [commands, query])

  // Admin-only async student quick-find (debounced). Names only here; opening a
  // result navigates to the record, where the FERPA disclosure is logged.
  useEffect(() => {
    if (portal !== 'admin') { setStudents([]); return undefined }
    const q = query.trim()
    if (!q) { setStudents([]); setSearching(false); return undefined }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await searchStudents(q)
        if (!cancelled) setStudents(res)
      } catch {
        if (!cancelled) setStudents([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, portal])

  // Static commands + live student hits, in one flat list so arrow-key nav and
  // the active index span both groups.
  const items = useMemo(() => {
    const studentItems = students.map((s) => ({
      id: `student:${s.id}`,
      label: s.name,
      trailing: s.grade != null ? `Grade ${s.grade}` : 'Student',
      group: 'Students',
      icon: <IconStudent />,
      run: () => { onClose(); navigate(`/admin/students/${s.id}`) },
    }))
    return [...results, ...studentItems]
  }, [results, students, navigate, onClose])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest' }) }, [active])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[active]?.run()
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="glass-card animate-toast-in fixed left-1/2 top-[12vh] z-[71] flex max-h-[70vh] w-[min(92vw,34rem)] -translate-x-1/2 flex-col overflow-hidden p-0"
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <IconSearch className="shrink-0 text-muted" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={portal === 'admin' ? 'Search students, pages, commands…' : 'Search pages and commands…'}
            aria-label="Search students, pages and commands"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="shrink-0 rounded bg-scrim px-1.5 py-0.5 text-[10px] font-medium text-muted">esc</kbd>
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {items.length === 0 && !searching ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted">No matches for “{query}”.</p>
          ) : (
            <>
              {items.map((c, i) => {
                const showGroup = i === 0 || c.group !== items[i - 1].group
                return (
                  <div key={c.id}>
                    {showGroup && (
                      <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                        {c.group}
                      </p>
                    )}
                    <button
                      ref={i === active ? activeRef : null}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onClick={() => c.run()}
                      onMouseMove={() => setActive(i)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                        i === active ? 'bg-scrim text-ink' : 'text-muted hover:text-ink'
                      }`}
                    >
                      <span className={`shrink-0 ${i === active ? 'text-ink' : 'text-muted'}`}>{c.icon}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.label}</span>
                      {c.trailing && <span className="shrink-0 text-[11px] text-muted">{c.trailing}</span>}
                    </button>
                  </div>
                )
              })}
              {searching && (
                <p className="px-3 py-2 text-center text-[12px] text-muted">Searching students…</p>
              )}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-3 border-t border-border px-3.5 py-2 text-[10px] text-muted">
          <span><kbd className="font-medium">↑↓</kbd> navigate</span>
          <span><kbd className="font-medium">↵</kbd> select</span>
          <span><kbd className="font-medium">esc</kbd> close</span>
        </div>
      </div>
    </>,
    document.body,
  )
}
