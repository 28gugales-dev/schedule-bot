import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx'
import { AppShell } from '../components/layout/AppShell.jsx'
import { LoginPage } from '../features/auth/LoginPage.jsx'
import { RoleLanding } from './RoleLanding.jsx'
import { NotFound } from './NotFound.jsx'
import { WaiverIntake } from '../features/student-portal/WaiverIntake.jsx'
import { MyRequests } from '../features/student-portal/MyRequests.jsx'
import { ReviewQueue } from '../features/admin-review/ReviewQueue.jsx'
import { RubricBuilder } from '../features/admin-review/RubricBuilder.jsx'
import { BatchSyncDashboard } from '../features/admin-review/BatchSyncDashboard.jsx'
import { AuditPage } from '../features/audit/AuditPage.jsx'

// Route map. Portal subtrees are wrapped in <ProtectedRoute> for role gating;
// feature child routes (uploads, rubric builder, batch sync, etc.) get added
// under the matching `children` array as they are built.
export const router = createBrowserRouter([
  { path: '/', element: <RoleLanding /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/student',
    element: (
      <ProtectedRoute allow={['student', 'admin']}>
        <AppShell portal="student" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <WaiverIntake /> },
      { path: 'requests', element: <MyRequests /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allow={['admin']}>
        <AppShell portal="admin" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ReviewQueue /> },
      { path: 'rubric', element: <RubricBuilder /> },
      { path: 'batch', element: <BatchSyncDashboard /> },
      { path: 'audit', element: <AuditPage view="activity" /> },
      { path: 'audit/decisions', element: <AuditPage view="decisions" /> },
      { path: 'audit/submissions', element: <AuditPage view="submissions" /> },
      { path: 'audit/ai', element: <AuditPage view="ai" /> },
      { path: 'audit/overview', element: <AuditPage view="overview" /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
