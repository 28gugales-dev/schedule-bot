import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'
import { ThemeToggle } from '../theme/ThemeToggle.jsx'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, demoMode, setRole, signInWithGoogle, authError, clearAuthError } = useAuth()

  // Real auth: once a session resolves, leave /login — RoleLanding sends the
  // user to the right portal based on their role.
  useEffect(() => {
    if (!demoMode && user) navigate('/')
  }, [demoMode, user, navigate])

  return (
    <div className="fade-up relative flex min-h-screen items-center justify-center px-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="glass-card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            W
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Waiver Platform</h1>
          <p className="mt-1 text-sm text-muted">
            {demoMode
              ? 'Local demo — choose a portal to explore.'
              : 'Sign in with your school Google account.'}
          </p>
        </div>

        {demoMode ? (
          <>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setRole('student')
                  navigate('/')
                }}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Enter as Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('admin')
                  navigate('/')
                }}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-glass-hover"
              >
                Continue as Counselor
              </button>
            </div>
            <p className="mt-4 text-xs text-muted">
              No account needed. You can switch portals anytime from the header.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                clearAuthError()
                signInWithGoogle()
              }}
              className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Continue with Google
            </button>
            {authError && <p className="text-xs text-danger-600">{authError}</p>}
            <p className="mt-1 text-center text-xs text-muted">
              Access is limited to your district Google Workspace account. New
              accounts start as students; staff are granted counselor access by an
              existing counselor.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4 border-t border-hairline pt-4 text-xs text-muted">
          <Link to="/privacy" className="transition hover:text-ink">
            Privacy
          </Link>
          <Link to="/terms" className="transition hover:text-ink">
            Terms
          </Link>
          <Link to="/breach-policy" className="transition hover:text-ink">
            Security
          </Link>
        </div>
      </div>
    </div>
  )
}
