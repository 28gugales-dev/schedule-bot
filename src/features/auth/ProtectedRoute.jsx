import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'
import { FullScreenLoader } from '../../components/layout/FullScreenLoader.jsx'

/**
 * Route boundary guard.
 * @param {string[]} allow  Roles permitted to view the subtree (e.g. ['admin']).
 *                          Omit to permit any authenticated user.
 *
 * - Unresolved session  -> full-screen loader (avoids login flash on refresh).
 * - Unauthenticated      -> redirect to /login (remembering intended location).
 * - Wrong role           -> redirect to the user's own portal landing.
 */
export function ProtectedRoute({ allow, children }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (allow && !allow.includes(role)) {
    return <Navigate to={role === 'admin' ? '/admin' : '/student'} replace />
  }
  return children
}
