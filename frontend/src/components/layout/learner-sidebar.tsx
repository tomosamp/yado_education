import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { apiCategories, apiSections } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Category, Section } from '@/types'

type CurriculumTreeItem = {
  category: Category
  sections: Section[]
}

const sectionStatusLabel: Record<string, string> = {
  not_submitted: '未提出',
  review_pending: 'レビュー待ち',
  revision_required: 'やり直し',
  passed: '合格',
}

function SidebarLink({ to, label }: { to: string; label: string }) {
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
      {label}
    </NavLink>
  )
}

export function LearnerSidebar() {
  const [expandedByCategoryId, setExpandedByCategoryId] = useState<Record<number, boolean>>({})

  const curriculumTreeQuery = useQuery({
    queryKey: ['sidebar-curriculum-tree'],
    queryFn: async (): Promise<CurriculumTreeItem[]> => {
      const categories = [...(await apiCategories())].sort((a, b) => a.sort_order - b.sort_order)

      return Promise.all(
        categories.map(async (category) => {
          const sectionsResponse = await apiSections(category.id)
          const sections = [...sectionsResponse.sections].sort((a, b) => a.sort_order - b.sort_order)

          return {
            category,
            sections,
          }
        }),
      )
    },
  })

  const curriculumTree = curriculumTreeQuery.data ?? []
  const firstCategoryId = curriculumTree[0]?.category.id ?? null

  const isExpanded = (categoryId: number) =>
    expandedByCategoryId[categoryId] ?? categoryId === firstCategoryId

  const toggleCategory = (categoryId: number) => {
    setExpandedByCategoryId((previous) => {
      const current = previous[categoryId] ?? categoryId === firstCategoryId
      return {
        ...previous,
        [categoryId]: !current,
      }
    })
  }

  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-24 md:flex md:h-[calc(100vh-7.5rem)] md:w-72 md:flex-col">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">メニュー</p>

      <nav className="space-y-1">
        <SidebarLink to="/dashboard" label="ダッシュボード" />
        <SidebarLink to="/curriculum" label="コース一覧" />
      </nav>

      <div className="mt-4 border-t border-slate-200 pt-4 md:flex-1 md:overflow-y-auto">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">コース</p>

        {curriculumTreeQuery.isLoading ? (
          <p className="px-2 py-1 text-xs text-slate-500">読み込み中...</p>
        ) : null}

        {curriculumTreeQuery.isError ? (
          <p className="px-2 py-1 text-xs text-rose-600">コースの取得に失敗しました。</p>
        ) : null}

        <div className="space-y-2">
          {curriculumTree.map(({ category, sections }) => {
            const expanded = isExpanded(category.id)

            return (
              <div key={category.id} className="rounded-md border border-slate-200">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    toggleCategory(category.id)
                  }}
                >
                  <span className="truncate">{category.title}</span>
                  {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                </button>

                {expanded ? (
                  <div className="space-y-1 border-t border-slate-200 p-2">
                    {sections.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500">レッスンはありません。</p>
                    ) : (
                      sections.map((section) => (
                        <NavLink
                          key={section.id}
                          to={`/sections/${section.id}`}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-md px-2 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-slate-900 !text-white'
                                : 'text-slate-700 hover:bg-slate-100',
                            )
                          }
                        >
                          <p className="truncate">
                            {section.sort_order}. {section.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-current/80">
                            {sectionStatusLabel[section.status ?? 'not_submitted'] ?? '未提出'}
                          </p>
                        </NavLink>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <nav className="mt-4 border-t border-slate-200 pt-4">
        <SidebarLink to="/mypage" label="マイページ" />
      </nav>
    </aside>
  )
}
