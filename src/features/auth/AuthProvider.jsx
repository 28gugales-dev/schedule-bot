import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js'

const AuthContext = createContext(null)
const DEMO_ROLE_KEY = 'demo_role'

// The manual demo-role bypass (entering a portal without real auth, even when
// Supabase IS configured) is a DEV-ONLY affordance. In a production build with a
// real backend it must be impossible — otherwise anyone could one-click into the
// counselor/admin portal. Enabled in `vite dev`, or explicitly via
// VITE_ENABLE_DEMO=true for a deliberately-deployed demo. Stub mode (no Supabase
// env at all) is unaffected — that path is demoMode and always shows the chooser.
export const DEMO_BYPASS_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true'

// District email domains permitted to sign in (comma-separated env var). Empty =
// allow all, for local/preview testing.
//
// IMPORTANT: this client-side check is UX ONLY. The OAuth callback creates the
// auth.users row before the app can react, so signing a rejected user out only
// hides the session — it does not prevent the account. The AUTHORITATIVE district
// restriction in production is the Google Cloud OAuth consent screen set to
// "Internal" (Workspace-only). See migration 0004 section A for an optional
// server-side trigger guard (defense in depth).
const ALLOWED_DOMAINS = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

function emailAllowed(email) {
  if (!ALLOWED_DOMAINS.length) return true
  const domain = String(email ?? '').split('@')[1]?.toLowerCase()
  return Boolean(domain && ALLOWED_DOMAINS.includes(domain))
}

/**
 * DEMO MODE: when Supabase is not configured the app runs fully locally with no
 * auth provider. We synthesize a user from a role kept in localStorage so the
 * portals are reachable and the role is switchable from the UI. This swaps out
 * cleanly for real sessions the moment VITE_SUPABASE_* env vars are present.
 */
function demoUser(role) {
  if (!role) return null
  return {
    id: `demo-${role}`,
    email: role === 'admin' ? 'demo.counselor@school.edu' : 'demo.student@school.edu',
    app_metadata: {},
    user_metadata: { role, name: role === 'admin' ? 'Demo Counselor' : 'Demo Student' },
  }
}

export function AuthProvider({ children }) {
  const demoMode = !isSupabaseConfigured

  const [session, setSession] = useState(null)
  // profiles.role is the single source of truth for the app role — for BOTH the
  // UI (this value) and the database (RLS via private.is_counselor()). The JWT is
  // never trusted for role. Null until the post-session fetch resolves.
  const [profileRole, setProfileRole] = useState(null)
  const [authError, setAuthError] = useState(null)
  // Read the demo role so a manual "demo override" works even when Supabase IS
  // configured — but ONLY when the bypass is enabled (dev/explicit). In prod the
  // stored value is ignored so a stale/injected demo_role can't escalate.
  const [demoRole, setDemoRole] = useState(() => {
    if (!DEMO_BYPASS_ENABLED) return null
    try {
      return localStorage.getItem(DEMO_ROLE_KEY)
    } catch {
      return null
    }
  })
  // True when running without Supabase, OR when the dev-gated demo override is set.
  const effectiveDemo = demoMode || (DEMO_BYPASS_ENABLED && Boolean(demoRole))
  // Real auth resolves the session + role async; demo mode is ready immediately.
  const [loading, setLoading] = useState(!demoMode)

  useEffect(() => {
    if (demoMode) return
    let active = true

    // Resolve a session into (a) a district-domain check and (b) the app role
    // read from profiles. loading stays true until BOTH finish, so RoleLanding
    // never routes a counselor on the default 'student' before the role lands.
    async function resolve(nextSession) {
      const user = nextSession?.user ?? null

      if (user && !emailAllowed(user.email)) {
        setAuthError(`Access is restricted to ${ALLOWED_DOMAINS.join(', ')} accounts.`)
        await supabase.auth.signOut()
        if (!active) return
        setSession(null)
        setProfileRole(null)
        setLoading(false)
        return
      }

      if (!active) return
      setSession(nextSession)

      // A real authenticated session always beats a leftover demo override —
      // otherwise a user who once clicked a demo button would be stuck seeing
      // that portal forever. Clear it so real role/RLS govern.
      if (user && demoRole) {
        setDemoRole(null)
        try { localStorage.removeItem(DEMO_ROLE_KEY) } catch { /* ignore */ }
      }

      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        if (!active) return
        setProfileRole(data?.role ?? 'student')
      } else {
        setProfileRole(null)
      }
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      resolve(next)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [demoMode])

  // Pick/clear the active demo role (null clears -> back to login chooser).
  // Works even when Supabase is configured, so a manual demo button can bypass
  // real auth for local testing.
  const setRole = useCallback(
    (next) => {
      try {
        if (next) localStorage.setItem(DEMO_ROLE_KEY, next)
        else localStorage.removeItem(DEMO_ROLE_KEY)
      } catch {
        /* storage unavailable (private mode) — fall back to in-memory state */
      }
      setDemoRole(next)
    },
    [],
  )

  const value = useMemo(() => {
    const user = effectiveDemo ? demoUser(demoRole) : (session?.user ?? null)
    const role = effectiveDemo ? demoRole : user ? (profileRole ?? 'student') : null
    return {
      session,
      user,
      role,
      loading,
      isConfigured: isSupabaseConfigured,
      demoMode,
      setRole,
      authError,
      clearAuthError: () => setAuthError(null),
      // Google Workspace SSO is the only sign-in method. `hd` hints Google to the
      // district domain (enforcement is the Workspace OAuth config, not this hint).
      signInWithGoogle: () =>
        supabase?.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
            queryParams: ALLOWED_DOMAINS.length
              ? { hd: ALLOWED_DOMAINS[0], prompt: 'select_account' }
              : { prompt: 'select_account' },
          },
        }),
      signOut: () => {
        if (demoRole) setRole(null)
        if (!demoMode) supabase?.auth.signOut()
      },
    }
  }, [session, profileRole, loading, demoMode, effectiveDemo, demoRole, setRole, authError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
