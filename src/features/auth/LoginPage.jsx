import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, DEMO_BYPASS_ENABLED } from './AuthProvider.jsx'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import { ThemeToggle } from '../theme/ThemeToggle.jsx'

const SCHOOL_KEY = 'selected_school'

// Forsyth County Schools (GA) high schools.
const FORSYTH_HIGH_SCHOOLS = [
  'Alliance Academy for Innovation',
  'Denmark High School',
  'East Forsyth High School',
  'Forsyth Central High School',
  'Lambert High School',
  'North Forsyth High School',
  'South Forsyth High School',
  'West Forsyth High School',
]

const IconChevron = ({ className = '' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="4 6 8 10 12 6" />
  </svg>
)
const IconCheck = ({ className = '' }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
)
const IconSchool = ({ className = '' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M8 1.5 14.5 5 8 8.5 1.5 5 8 1.5Z" />
    <path d="M4 6.5v3.2c0 .9 1.8 1.8 4 1.8s4-.9 4-1.8V6.5" />
  </svg>
)

/**
 * Accessible custom listbox for school selection. Native <select> can't style its
 * option list, so this mirrors the ProfileMenu popover pattern (glass-card +
 * useFocusTrap) for a consistent, themeable look across skins. Supports keyboard:
 * Enter/Space/ArrowDown open, Arrow keys move highlight, Enter selects, Esc closes.
 */
function SchoolSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const triggerRef = useRef(null)
  const panelRef = useFocusTrap(open, { onClose: () => setOpen(false) })

  const openAt = () => {
    const i = options.indexOf(value)
    setActive(i >= 0 ? i : 0)
    setOpen(true)
  }
  const pick = (name) => {
    onChange(name)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onTriggerKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openAt()
    }
  }
  const onListKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(options[active])
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openAt())}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="glass-input flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      >
        <IconSchool className={value ? 'shrink-0 text-brand-600' : 'shrink-0 text-muted'} />
        <span className={value ? 'flex-1 truncate text-ink' : 'flex-1 truncate text-muted'}>
          {value || 'Choose a high school…'}
        </span>
        <IconChevron className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            ref={panelRef}
            role="listbox"
            aria-label="School"
            tabIndex={-1}
            onKeyDown={onListKey}
            className="glass-card animate-toast-in absolute left-0 right-0 top-full z-[61] mt-2 max-h-64 overflow-y-auto p-1.5 shadow-lg focus:outline-none"
          >
            {options.map((name, i) => {
              const selected = name === value
              return (
                <li key={name} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => pick(name)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                      i === active ? 'bg-scrim text-ink' : 'text-ink hover:bg-scrim'
                    }`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-brand-600">
                      {selected && <IconCheck />}
                    </span>
                    <span className="flex-1 truncate">{name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { user, demoMode, setRole, signInWithGoogle, authError, clearAuthError } = useAuth()

  const [school, setSchool] = useState(() => {
    try {
      return localStorage.getItem(SCHOOL_KEY) ?? ''
    } catch {
      return ''
    }
  })

  function selectSchool(next) {
    setSchool(next)
    try {
      if (next) localStorage.setItem(SCHOOL_KEY, next)
      else localStorage.removeItem(SCHOOL_KEY)
    } catch {
      /* storage unavailable (private mode) — keep in-memory state */
    }
  }

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

        <div className="mb-5">
          <span className="mb-1.5 block text-xs font-medium text-muted">Select your school</span>
          <SchoolSelect value={school} onChange={selectSchool} options={FORSYTH_HIGH_SCHOOLS} />
        </div>

        {demoMode ? (
          <>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={!school}
                onClick={() => {
                  setRole('student')
                  navigate('/')
                }}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enter as Student
              </button>
              <button
                type="button"
                disabled={!school}
                onClick={() => {
                  setRole('admin')
                  navigate('/')
                }}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-glass-hover disabled:cursor-not-allowed disabled:opacity-50"
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
              disabled={!school}
              onClick={() => {
                clearAuthError()
                signInWithGoogle()
              }}
              className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue with Google
            </button>
            {authError && <p className="text-xs text-danger-600">{authError}</p>}
            <p className="mt-1 text-center text-xs text-muted">
              Access is limited to your district Google Workspace account. New
              accounts start as students; staff are granted counselor access by an
              existing counselor.
            </p>

            {/* DEV-ONLY demo bypass — skips Google auth, enters with a synthetic
                role. Gated by DEMO_BYPASS_ENABLED so it can never render in a
                production build with a real backend. */}
            {DEMO_BYPASS_ENABLED && (
              <div className="mt-2 border-t border-hairline pt-3">
                <p className="mb-2 text-center text-xs text-muted">Demo (no sign-in)</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('student')
                      navigate('/')
                    }}
                    className="glass-input flex-1 rounded-xl px-3 py-2 text-xs font-medium text-ink transition hover:bg-glass-hover"
                  >
                    Demo Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('admin')
                      navigate('/')
                    }}
                    className="glass-input flex-1 rounded-xl px-3 py-2 text-xs font-medium text-ink transition hover:bg-glass-hover"
                  >
                    Demo Counselor
                  </button>
                </div>
              </div>
            )}
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
