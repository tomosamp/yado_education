import { LogOut } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Sidebar, type NavItem } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

export function AppShell({
  children,
  items,
  sidebar,
}: PropsWithChildren<{ items?: readonly NavItem[]; sidebar?: ReactNode }>) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f4ff_0%,_#f8fafc_40%,_#f8fafc_100%)]">
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link to="/dashboard" className="text-lg font-bold text-slate-900">
            社内教育システム
          </Link>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-700">{user?.name}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void logout()
              }}
            >
              <LogOut className="mr-1 h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:px-6">
        {sidebar ?? <Sidebar items={items ?? []} />}
        <section className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {children}
        </section>
      </main>
    </div>
  )
}
