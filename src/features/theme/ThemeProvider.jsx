import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'

/* The localStorage key. MUST stay identical to the inline boot script in
 * index.html — if they drift, the boot script paints one theme and React
 * corrects it on mount, which is exactly the flash the boot script exists to
 * prevent. One string, two readers. */
export const THEME_KEY = 'ccc:theme'

/* The browser chrome color shown behind the status bar / address bar, kept in
 * sync with the active surface so mobile doesn't flash a mismatched bar. */
const META_COLOR = { light: '#f5f6f9', dark: '#0c0c0f' }

const ThemeContext = createContext(null)

const systemQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/* ── DEFAULT POLICY (the one real product decision here) ──
 * No stored choice → follow the OS ('system'). The alternative is to force
 * 'light' for a consistent first impression. Following the OS respects a user
 * who runs their whole machine dark; forcing light guarantees the brand's
 * intended first look. We follow the OS. Change the fallback below to flip it. */
// Demo deployments build with VITE_FORCE_LIGHT=true so the public demo always
// opens light (a consistent first impression even for dark-OS visitors). A user
// can still toggle; their stored choice wins. Mirrored in index.html's boot
// script — keep the two in sync.
const DEFAULT_PREFERENCE = import.meta.env.VITE_FORCE_LIGHT === 'true' ? 'light' : 'system'

function getStoredPreference() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* storage unavailable (private mode) — fall through to default */
  }
  return DEFAULT_PREFERENCE
}

function resolvePreference(preference) {
  if (preference === 'system') return systemQuery().matches ? 'dark' : 'light'
  return preference
}

function applyResolved(resolved) {
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', META_COLOR[resolved])
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(getStoredPreference)
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    resolvePreference(getStoredPreference()),
  )

  // Commit a preference: persist intent, recompute the resolved theme, and run a
  // brief coordinated cross-fade (the class is yanked after, so it never slows
  // ordinary hover transitions).
  const setPreference = useCallback((next) => {
    setPreferenceState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore */
    }
    const resolved = resolvePreference(next)
    setResolvedTheme(resolved)
    const root = document.documentElement
    root.classList.add('theme-transition')
    applyResolved(resolved)
    window.setTimeout(() => root.classList.remove('theme-transition'), 320)
  }, [])

  // Binary flip from whatever is on screen. This drops 'system' on an explicit
  // click — the user is making a choice, so we record it as one.
  const toggle = useCallback(() => {
    setPreference(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setPreference])

  // While following the OS, track live changes (user flips macOS/Windows theme).
  useEffect(() => {
    if (preference !== 'system') return
    const mq = systemQuery()
    const onChange = () => {
      const resolved = mq.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyResolved(resolved)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  // Reconcile the DOM once on mount in case the boot script and React disagree.
  useEffect(() => {
    applyResolved(resolvedTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, toggle }),
    [preference, resolvedTheme, setPreference, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
