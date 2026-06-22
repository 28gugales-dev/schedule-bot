import { createBrowserRouter, Outlet } from 'react-router-dom'
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx'
import { RouteError } from './RouteError.jsx'
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
import { RejectedHistory } from '../features/admin-review/RejectedHistory.jsx'

// Route map. Portal subtrees are wrapped in <ProtectedRoute> for role gating;
// feature child routes (uploads, rubric builder, batch sync, etc.) get added
// under the matching `children` array as they are built.
// A pathless root route renders an <Outlet> for the real routes below and
// carries the errorElement. In a data router, route render errors bubble to the
// nearest errorElement (NOT to a React boundary outside <RouterProvider>), so
// this is the seam that surfaces the themed crash screen for any page.
export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
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
          { path: 'rejected', element: <RejectedHistory /> },
          { path: 'audit', element: <AuditPage view="activity" /> },
          { path: 'audit/decisions', element: <AuditPage view="decisions" /> },
          { path: 'audit/submissions', element: <AuditPage view="submissions" /> },
          { path: 'audit/ai', element: <AuditPage view="ai" /> },
          { path: 'audit/overview', element: <AuditPage view="overview" /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
