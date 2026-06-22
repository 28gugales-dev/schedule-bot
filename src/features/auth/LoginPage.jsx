import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'
import { ThemeToggle } from '../theme/ThemeToggle.jsx'

const PORTALS = [
  { id: 'student', label: 'Student' },
  { id: 'admin', label: 'Counselor' },
]

function EmailAuthForm({ portal }) {
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const reset = () => {
    setError(null)
    setInfo(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    reset()

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const { error: authError } =
        mode === 'signin'
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, portal)

      if (authError) {
        setError(authError.message)
      } else if (mode === 'signup') {
        setInfo('Account created. Check your email to confirm, then sign in.')
        setMode('signin')
      }
    } catch (err) {
      setError(err?.message ?? 'Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
      />
      {mode === 'signup' && (
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      )}

      {error && <p className="text-xs text-danger-600">{error}</p>}
      {info && <p className="text-xs text-success-700">{info}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Please wait…' : mode === 'signin' ? `Sign in as ${portal === 'admin' ? 'Counselor' : 'Student'}` : `Create ${portal === 'admin' ? 'counselor' : 'student'} account`}
      </button>

      <button
        type="button"
        onClick={() => { setMode((m) => (m === 'signin' ? 'signup' : 'signin')); reset() }}
        className="text-center text-xs font-medium text-muted transition hover:text-ink"
      >
        {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </form>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { user, demoMode, setRole, isConfigured } = useAuth()
  const [portal, setPortal] = useState('student')

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
        ) : !isConfigured ? (
          <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:text-warning-300 ring-1 ring-warning-100">
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> to enable sign-in.
          </p>
        ) : (
          <>
            <div role="tablist" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-black/[0.04] p-1">
              {PORTALS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={portal === p.id}
                  onClick={() => setPortal(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    portal === p.id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <EmailAuthForm key={portal} portal={portal} />
          </>
        )}
      </div>
    </div>
  )
}
