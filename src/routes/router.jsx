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
import { FormBuilder } from '../features/admin-review/FormBuilder.jsx'
import { BatchSyncDashboard } from '../features/admin-review/BatchSyncDashboard.jsx'
import { AuditPage } from '../features/audit/AuditPage.jsx'
import { RejectedHistory } from '../features/admin-review/RejectedHistory.jsx'
import { StudentProfile } from '../features/admin-review/StudentProfile.jsx'
import { TeamPanel } from '../features/admin-team/TeamPanel.jsx'
import { LegalDoc } from '../features/legal/LegalDoc.jsx'
import privacyMd from '../../docs/compliance/privacy-policy.md?raw'
import termsMd from '../../docs/compliance/terms-of-service.md?raw'
import breachMd from '../../docs/compliance/breach-response-policy.md?raw'

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
      // Public, unauthenticated — policies must be viewable by anyone (districts,
      // TrustEd reviewers, parents).
      { path: '/privacy', element: <LegalDoc title="Privacy Policy" source={privacyMd} /> },
      { path: '/terms', element: <LegalDoc title="Terms of Service" source={termsMd} /> },
      { path: '/breach-policy', element: <LegalDoc title="Breach Response Policy" source={breachMd} /> },
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
          { path: 'forms', element: <FormBuilder /> },
          // Back-compat: the old route was /admin/rubric — keep it pointing at the
          // unified Form Builder so existing links/bookmarks don't 404.
          { path: 'rubric', element: <FormBuilder /> },
          { path: 'batch', element: <BatchSyncDashboard /> },
          { path: 'rejected', element: <RejectedHistory /> },
          { path: 'students/:studentId', element: <StudentProfile /> },
          { path: 'team', element: <TeamPanel /> },
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
