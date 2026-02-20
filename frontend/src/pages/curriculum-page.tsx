import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { apiCategories, apiSections } from '@/lib/api'
import type { Section } from '@/types'

const statusLabelMap: Record<string, string> = {
  not_submitted: '未提出',
  review_pending: 'レビュー待ち',
  revision_required: 'やり直し',
  passed: '合格',
}

export function CurriculumPage() {
  const [expandedByCategoryId, setExpandedByCategoryId] = useState<Record<number, boolean>>({})

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: apiCategories,
  })

  const categories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [categoriesQuery.data],
  )

  const categoryIds = useMemo(() => categories.map((category) => category.id), [categories])

  const categorySectionsQuery = useQuery({
    queryKey: ['sections-by-category', categoryIds],
    queryFn: async () => {
      const rows = await Promise.all(
        categories.map(async (category) => {
          const response = await apiSections(category.id)
          const sections = [...response.sections].sort((a, b) => a.sort_order - b.sort_order)
          return {
            category,
            sections,
          }
        }),
      )

      return rows
    },
    enabled: categoryIds.length > 0,
  })

  const curriculumGroups = categorySectionsQuery.data ?? []
  const firstCategoryId = curriculumGroups[0]?.category.id ?? null
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">コース</h1>
        <p className="mt-1 text-sm text-slate-600">コースごとにレッスンを任意順で進められます。</p>
      </header>

      {categoriesQuery.isLoading ? <p className="text-sm text-slate-600">コースを読み込み中...</p> : null}
      {categoriesQuery.isError ? (
        <p className="text-sm text-rose-600">コース一覧の取得に失敗しました。</p>
      ) : null}

      {!categoriesQuery.isLoading && categories.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">表示可能なコースはありません。</p>
        </Card>
      ) : null}

      {categorySectionsQuery.isLoading ? (
        <p className="text-sm text-slate-600">レッスンを読み込み中...</p>
      ) : null}
      {categorySectionsQuery.isError ? (
        <p className="text-sm text-rose-600">レッスン一覧の取得に失敗しました。</p>
      ) : null}

      <div className="space-y-4">
        {curriculumGroups.map(({ category, sections }) => (
          <Card key={category.id} className="space-y-4">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 text-left"
              onClick={() => {
                toggleCategory(category.id)
              }}
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{category.title}</h2>
                {category.description ? (
                  <p className="mt-1 text-sm text-slate-600">{category.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">レッスン数: {sections.length}</p>
              </div>
              {isExpanded(category.id) ? (
                <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-600" />
              ) : (
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-600" />
              )}
            </button>

            {isExpanded(category.id) ? (
              sections.length === 0 ? (
                <p className="text-sm text-slate-600">このコースにレッスンはありません。</p>
              ) : (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  {sections.map((section) => (
                    <SectionCard key={section.id} section={section} />
                  ))}
                </div>
              )
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}

function SectionCard({ section }: { section: Section }) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{section.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge>{section.type === 'autojudge' ? '自動判定課題' : 'Webアプリ講座'}</Badge>
          <Badge className="bg-sky-100 text-sky-800">{statusLabelMap[section.status ?? 'not_submitted']}</Badge>
        </div>
      </div>

      <Link
        to={`/sections/${section.id}`}
        className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
      >
        詳細を見る
      </Link>
    </div>
  )
}
