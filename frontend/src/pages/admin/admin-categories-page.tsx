import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { VisibilityBadge } from '@/components/ui/status-badges'
import { Textarea } from '@/components/ui/textarea'
import {
  apiAdminCategories,
  apiAdminDeleteCategory,
  apiAdminReorderCategories,
  apiAdminSaveCategory,
} from '@/lib/api'

type CategoryDraft = {
  id: number
  title: string
  description: string
  sort_order: number
  is_visible: boolean
}

export function AdminCategoriesPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [draftById, setDraftById] = useState<Record<number, CategoryDraft>>({})

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: apiAdminCategories,
  })

  const categories = useMemo(
    () => [...(categoriesQuery.data?.data ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [categoriesQuery.data?.data],
  )

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: number
      title: string
      description?: string
      sort_order: number
      is_visible: boolean
    }) => apiAdminSaveCategory(payload),
    onSuccess: async (_, variables) => {
      toast.success(variables.id ? 'コースを更新しました。' : 'コースを作成しました。')
      if (!variables.id) {
        setTitle('')
        setDescription('')
      }
      setDraftById({})
      await categoriesQuery.refetch()
    },
    onError: () => {
      toast.error('保存に失敗しました。入力内容を確認してください。')
    },
  })

  const reorderMutation = useMutation({
    mutationFn: apiAdminReorderCategories,
    onSuccess: async () => {
      toast.success('表示順を更新しました。')
      setDraftById({})
      await categoriesQuery.refetch()
    },
    onError: () => {
      toast.error('表示順更新に失敗しました。')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiAdminDeleteCategory,
    onSuccess: async () => {
      toast.success('削除しました。')
      setDraftById({})
      await categoriesQuery.refetch()
    },
    onError: () => {
      toast.error('削除に失敗しました。')
    },
  })

  const moveCategory = (id: number, direction: 'up' | 'down') => {
    const index = categories.findIndex((item) => item.id === id)
    if (index < 0) {
      return
    }

    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= categories.length) {
      return
    }

    const next = [...categories]
    const tmp = next[index]
    next[index] = next[nextIndex]
    next[nextIndex] = tmp

    const items = next.map((item, idx) => ({
      id: item.id,
      sort_order: idx + 1,
    }))

    reorderMutation.mutate(items)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">コース管理</h1>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">新規作成</h2>
        <Input
          placeholder="タイトル"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
        />
        <Textarea
          placeholder="説明"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
          }}
        />
        <Button
          onClick={() => {
            saveMutation.mutate({
              title,
              description,
              sort_order: categories.length + 1,
              is_visible: true,
            })
          }}
          disabled={!title || saveMutation.isPending}
        >
          作成
        </Button>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">一覧</h2>
        <div className="mt-3 space-y-3">
          {categories.map((category, index) => {
            const draft = draftById[category.id] ?? {
              id: category.id,
              title: category.title,
              description: category.description ?? '',
              sort_order: category.sort_order,
              is_visible: category.is_visible,
            }

            return (
              <div key={category.id} className="rounded border border-slate-200 p-3">
                <div className="grid gap-2 md:grid-cols-[2fr_3fr_auto]">
                  <Input
                    value={draft.title}
                    onChange={(event) => {
                      setDraftById((prev) => ({
                        ...prev,
                        [category.id]: {
                          ...draft,
                          title: event.target.value,
                        },
                      }))
                    }}
                  />
                  <Textarea
                    value={draft.description}
                    onChange={(event) => {
                      setDraftById((prev) => ({
                        ...prev,
                        [category.id]: {
                          ...draft,
                          description: event.target.value,
                        },
                      }))
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <VisibilityBadge isVisible={draft.is_visible} />
                    <Button
                      size="sm"
                      variant="secondary"
                      className={
                        draft.is_visible
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }
                      onClick={() => {
                        setDraftById((prev) => ({
                          ...prev,
                          [category.id]: {
                            ...draft,
                            is_visible: !draft.is_visible,
                          },
                        }))
                      }}
                    >
                      切替
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      saveMutation.mutate({
                        id: draft.id,
                        title: draft.title,
                        description: draft.description,
                        sort_order: index + 1,
                        is_visible: draft.is_visible,
                      })
                    }}
                    disabled={!draft.title || saveMutation.isPending}
                  >
                    更新
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      moveCategory(category.id, 'up')
                    }}
                    disabled={index === 0 || reorderMutation.isPending}
                  >
                    上へ
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      moveCategory(category.id, 'down')
                    }}
                    disabled={index === categories.length - 1 || reorderMutation.isPending}
                  >
                    下へ
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      deleteMutation.mutate(category.id)
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    削除
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
