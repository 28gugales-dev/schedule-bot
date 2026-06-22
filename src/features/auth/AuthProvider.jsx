import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js'

const AuthContext = createContext(null)
const DEMO_ROLE_KEY = 'demo_role'

/**
 * Resolve the app role for a Supabase user.
 * Source of truth (in priority order):
 *   1. app_metadata.role  — set server-side, trusted (recommended for prod).
 *   2. user_metadata.role — client-writable, convenient for dev seeding.
 *   3. default 'student'  — anyone authenticated with no explicit role.
 *
 * NOTE: Admin gating is enforced again at the data layer (RLS) — never trust the
 * client role alone for authorization of sensitive operations.
 */
function resolveRole(user) {
  if (!user) return null
  return user.app_metadata?.role || user.user_metadata?.role || 'student'
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
  const [demoRole, setDemoRole] = useState(() => {
    if (!demoMode) return null
    try {
      return localStorage.getItem(DEMO_ROLE_KEY)
    } catch {
      return null
    }
  })
  // Real auth resolves the session async; demo mode is ready immediately.
  const [loading, setLoading] = useState(!demoMode)

  useEffect(() => {
    if (demoMode) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [demoMode])

  // Demo-only: pick/clear the active role (null clears -> back to login chooser).
  const setRole = useCallback(
    (next) => {
      if (!demoMode) return
      try {
        if (next) localStorage.setItem(DEMO_ROLE_KEY, next)
        else localStorage.removeItem(DEMO_ROLE_KEY)
      } catch {
        /* storage unavailable (private mode) — fall back to in-memory state */
      }
      setDemoRole(next)
    },
    [demoMode],
  )

  const value = useMemo(() => {
    const user = demoMode ? demoUser(demoRole) : (session?.user ?? null)
    return {
      session,
      user,
      role: resolveRole(user),
      loading,
      isConfigured: isSupabaseConfigured,
      demoMode,
      setRole,
      signInWithGoogle: () =>
        supabase?.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/` },
        }),
      // `role` is written to user_metadata at signup — it's what resolveRole()
      // reads for that account from then on (see priority order above).
      signUpWithEmail: (email, password, role) =>
        supabase?.auth.signUp({ email, password, options: { data: { role } } }),
      signInWithEmail: (email, password) => supabase?.auth.signInWithPassword({ email, password }),
      signOut: demoMode ? () => setRole(null) : () => supabase?.auth.signOut(),
    }
  }, [session, loading, demoMode, demoRole, setRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
