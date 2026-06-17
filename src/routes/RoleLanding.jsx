import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { FullScreenLoader } from '../components/layout/FullScreenLoader.jsx'

// Root route ("/") — routes the authenticated user to their portal by role,
// or to /login when signed out.
export function RoleLanding() {
  const { user, role, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={role === 'admin' ? '/admin' : '/student'} replace />
}
