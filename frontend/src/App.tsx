import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AppShell } from '@/components/layout/app-shell'
import { LearnerSidebar } from '@/components/layout/learner-sidebar'
import { StaffSidebar } from '@/components/layout/staff-sidebar'
import { RequireAuth, RequireRole } from '@/components/layout/route-guards'
import { useAuth } from '@/lib/auth'
import { AdminCategoriesPage } from '@/pages/admin/admin-categories-page'
import { AdminLabelsPage } from '@/pages/admin/admin-labels-page'
import { AdminSectionsPage } from '@/pages/admin/admin-sections-page'
import { AdminUsersPage } from '@/pages/admin/admin-users-page'
import { AcceptInvitationPage } from '@/pages/accept-invitation-page'
import { CurriculumPage } from '@/pages/curriculum-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { LoginPage } from '@/pages/login-page'
import { MyPage } from '@/pages/my-page'
import { ReviewerPendingPage } from '@/pages/reviewer/reviewer-pending-page'
import { ReviewerPendingUserSectionsPage } from '@/pages/reviewer/reviewer-pending-user-sections-page'
import { ReviewerSubmissionReviewPage } from '@/pages/reviewer/reviewer-submission-review-page'
import { SectionPage } from '@/pages/section-page'

function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/dashboard" replace />
}

function RoleLayout() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  if (user.role === 'user') {
    return (
      <AppShell sidebar={<LearnerSidebar />}>
        <Outlet />
      </AppShell>
    )
  }

  return (
    <AppShell sidebar={<StaffSidebar role={user.role} />}>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RoleLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/curriculum" element={<CurriculumPage />} />
            <Route path="/sections/:sectionId" element={<SectionPage />} />
            <Route path="/mypage" element={<MyPage />} />

            <Route element={<RequireRole roles={['reviewer', 'admin']} />}>
              <Route path="/reviewer/pending" element={<ReviewerPendingPage />} />
              <Route path="/reviewer/pending/users/:userId" element={<ReviewerPendingUserSectionsPage />} />
              <Route path="/reviewer/pending/submissions/:submissionId" element={<ReviewerSubmissionReviewPage />} />
            </Route>

            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/sections" element={<AdminSectionsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/labels" element={<AdminLabelsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-right" richColors />
    </>
  )
}
