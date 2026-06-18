import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'

export function LoginPage() {
  const navigate = useNavigate()
  const { demoMode, setRole, signInWithGoogle, isConfigured } = useAuth()

  return (
    <div className="fade-up flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            W
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Waiver Platform</h1>
          <p className="mt-1 text-sm text-muted">
            {demoMode
              ? 'Local demo — choose a portal to explore.'
              : 'Sign in to submit or review waivers.'}
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
          <>
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={!isConfigured}
              className="glass-input flex w-full items-center justify-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-glass-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GoogleGlyph />
              Continue with Google
            </button>

            {!isConfigured && (
              <p className="mt-4 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:text-warning-300 ring-1 ring-warning-100">
                Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> to enable sign-in.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}
