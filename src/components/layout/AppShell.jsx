import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'

// Nav definitions per portal. As feature routes land, add child routes in
// routes/router.jsx and a matching entry here.
const NAV = {
  student: [
    { to: '/student', label: 'New Request', end: true },
    { to: '/student/requests', label: 'My Requests' },
  ],
  admin: [
    { to: '/admin', label: 'Review Queue', end: true },
    { to: '/admin/rubric', label: 'Rubric Builder' },
    { to: '/admin/batch', label: 'Batch Sync' },
  ],
}

const TITLE = {
  student: 'Student Portal',
  admin: 'Counselor Command Center',
}

export function AppShell({ portal }) {
  const navigate = useNavigate()
  const { user, role, signOut, demoMode, setRole } = useAuth()
  const links = NAV[portal] ?? []

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 sm:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            W
          </div>
          <span className="text-sm font-semibold text-ink">{TITLE[portal]}</span>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <span className="text-sm font-medium text-muted capitalize">{role} workspace</span>
          <div className="flex items-center gap-3">
            {demoMode ? (
              <>
                <div className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  DEMO
                </div>
                <div className="rounded-lg bg-slate-100 p-0.5 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('student')
                      navigate('/student')
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      role === 'student'
                        ? 'bg-white text-ink shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('admin')
                      navigate('/admin')
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      role === 'admin'
                        ? 'bg-white text-ink shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Counselor
                  </button>
                </div>
              </>
            ) : (
              <span className="hidden text-sm text-muted sm:inline">{user?.email}</span>
            )}
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
