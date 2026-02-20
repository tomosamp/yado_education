import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { LoadingScreen } from '@/components/common/loading-screen'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/types'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
