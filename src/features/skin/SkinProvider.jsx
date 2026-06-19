import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

/* The localStorage key. MUST stay identical to the inline boot script in
 * index.html — if they drift, the boot paints one skin and React corrects it on
 * mount (the exact flash the boot exists to prevent). One string, two readers. */
export const SKIN_KEY = 'ccc:skin'

/* ── DEFAULT POLICY ──
 * No stored choice → 'enterprise'. This app now leads with the flat
 * Brenda-Arjun console chrome; the liquid-glass look is the opt-in alternate.
 * Flip the fallback to 'glass' to restore the original first impression. */
const DEFAULT_SKIN = 'enterprise'

const SkinContext = createContext(null)

function getStoredSkin() {
  try {
    const v = localStorage.getItem(SKIN_KEY)
    if (v === 'glass' || v === 'enterprise') return v
  } catch {
    /* storage unavailable (private mode) — fall through to default */
  }
  return DEFAULT_SKIN
}

function applySkin(skin) {
  document.documentElement.dataset.skin = skin
}

/**
 * Skin = the visual *chrome* axis, orthogonal to light/dark theme.
 *   'enterprise' → flat slate/white console (flush sidebar, dense topbar)
 *   'glass'      → floating liquid-glass islands (the original look)
 * It rides a separate `data-skin` attribute on <html>; the bulk of the visual
 * change flows through CSS-variable overrides in index.css, so pages never
 * branch on skin — only the shell chrome (and ag-grid, which builds its theme
 * in JS) read it directly.
 */
export function SkinProvider({ children }) {
  const [skin, setSkinState] = useState(getStoredSkin)

  const setSkin = useCallback((next) => {
    setSkinState(next)
    try {
      localStorage.setItem(SKIN_KEY, next)
    } catch {
      /* ignore */
    }
    // Brief coordinated cross-fade so surfaces glide between skins instead of
    // snapping. The class is yanked after so it never slows ordinary hovers.
    const root = document.documentElement
    root.classList.add('skin-transition')
    applySkin(next)
    window.setTimeout(() => root.classList.remove('skin-transition'), 360)
  }, [])

  const toggleSkin = useCallback(() => {
    setSkin(skin === 'enterprise' ? 'glass' : 'enterprise')
  }, [skin, setSkin])

  // Reconcile the DOM once on mount in case the boot script and React disagree.
  useEffect(() => {
    applySkin(skin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(
    () => ({ skin, setSkin, toggleSkin }),
    [skin, setSkin, toggleSkin],
  )

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}

export function useSkin() {
  const ctx = useContext(SkinContext)
  if (!ctx) throw new Error('useSkin must be used within <SkinProvider>')
  return ctx
}
