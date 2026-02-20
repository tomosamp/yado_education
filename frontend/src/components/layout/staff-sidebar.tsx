import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'

import { apiDashboardAdmin, apiDashboardReviewer } from '@/lib/api'
import { cn } from '@/lib/utils'

type StaffRole = 'reviewer' | 'admin'

type SidebarItem = {
  to: string
  label: string
}

type SidebarGroup = {
  title: string
  items: SidebarItem[]
}

const REVIEW_PENDING_PATH = '/reviewer/pending'

const groupsByRole: Record<StaffRole, SidebarGroup[]> = {
  reviewer: [
    {
      title: 'メニュー',
      items: [
        { to: '/dashboard', label: 'ダッシュボード' },
        { to: '/curriculum', label: 'コース' },
      ],
    },
    {
      title: 'レビュー',
      items: [{ to: '/reviewer/pending', label: 'レビュー待ち' }],
    },
  ],
  admin: [
    {
      title: 'メニュー',
      items: [
        { to: '/dashboard', label: 'ダッシュボード' },
        { to: '/curriculum', label: 'コース' },
      ],
    },
    {
      title: 'レビュー',
      items: [{ to: '/reviewer/pending', label: 'レビュー待ち' }],
    },
    {
      title: '管理',
      items: [
        { to: '/admin/categories', label: 'コース管理' },
        { to: '/admin/sections', label: 'レッスン管理' },
        { to: '/admin/users', label: 'ユーザー管理' },
        { to: '/admin/labels', label: 'ラベル管理' },
      ],
    },
  ],
}

function SidebarLink({
  to,
  label,
  notificationCount,
}: SidebarItem & { notificationCount?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-slate-900 !text-white' : 'text-slate-700 hover:bg-slate-100',
        )
      }
    >
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {notificationCount && notificationCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        ) : null}
      </span>
    </NavLink>
  )
}

export function StaffSidebar({ role }: { role: StaffRole }) {
  const groups = groupsByRole[role]
  const pendingReviewsQuery = useQuery({
    queryKey: ['sidebar-pending-reviews', role],
    queryFn: async () => {
      if (role === 'admin') {
        const response = await apiDashboardAdmin()
        return response.metrics.pending_reviews ?? 0
      }

      const response = await apiDashboardReviewer()
      return response.metrics.pending_reviews ?? 0
    },
    refetchInterval: 30000,
  })
  const pendingReviewsCount = pendingReviewsQuery.data ?? 0

  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-24 md:flex md:h-[calc(100vh-7.5rem)] md:w-64 md:flex-col">
      <div className="space-y-4 md:flex-1 md:overflow-y-auto">
        {groups.map((group) => (
          <section key={group.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              {group.title}
            </p>
            <nav className="space-y-1">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  notificationCount={item.to === REVIEW_PENDING_PATH ? pendingReviewsCount : 0}
                />
              ))}
            </nav>
          </section>
        ))}
      </div>

      <nav className="mt-4 border-t border-slate-200 pt-4">
        <SidebarLink to="/mypage" label="マイページ" />
      </nav>
    </aside>
  )
}
