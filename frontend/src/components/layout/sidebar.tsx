import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

export type NavItem = {
  to: string
  label: string
}

export function Sidebar({ items }: { items: readonly NavItem[] }) {
  const myPageItem = items.find((item) => item.to === '/mypage')
  const menuItems = items.filter((item) => item.to !== '/mypage')

  const renderLink = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        cn(
          'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-slate-900 !text-white'
            : 'text-slate-700 hover:bg-slate-100',
        )
      }
    >
      {item.label}
    </NavLink>
  )

  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-24 md:flex md:h-[calc(100vh-7.5rem)] md:w-64 md:flex-col">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        メニュー
      </p>
      <div className="md:flex-1 md:overflow-y-auto">
        <nav className="space-y-1">
          {menuItems.map((item) => renderLink(item))}
        </nav>
      </div>
      {myPageItem ? (
        <nav className="mt-4 border-t border-slate-200 pt-4">
          {renderLink(myPageItem)}
        </nav>
      ) : null}
    </aside>
  )
}
