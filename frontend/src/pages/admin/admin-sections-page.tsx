import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EnabledBadge, VisibilityBadge } from '@/components/ui/status-badges'
import { Textarea } from '@/components/ui/textarea'
import {
  apiAdminCategories,
  apiAdminDeleteSection,
  apiAdminReorderSections,
  apiAdminSaveSection,
  apiAdminSection,
  apiAdminSections,
} from '@/lib/api'
import type { Category, SectionPdf } from '@/types'

const defaultJudgeConfig = JSON.stringify(
  {
    allowed_languages: ['php', 'javascript', 'python'],
    time_limit_sec: 5,
    memory_limit_mb: 256,
    cases: [{ stdin: '1 2\\n', expected_stdout: '3\\n' }],
  },
  null,
  2,
)

export function AdminSectionsPage() {
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'autojudge' | 'webapp'>('autojudge')
  const [sortOrder, setSortOrder] = useState(1)
  const [isVisible, setIsVisible] = useState(true)
  const [extraTextEnabled, setExtraTextEnabled] = useState(false)
  const [extraTextLabel, setExtraTextLabel] = useState('追加テキスト')
  const [extraTextRequired, setExtraTextRequired] = useState(false)
  const [judgeConfig, setJudgeConfig] = useState(defaultJudgeConfig)
  const [hints, setHints] = useState(['', '', ''])
  const [existingPdfs, setExistingPdfs] = useState<SectionPdf[]>([])
  const [removePdfIds, setRemovePdfIds] = useState<number[]>([])
  const [newPdfs, setNewPdfs] = useState<File[]>([])

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories-for-sections'],
    queryFn: apiAdminCategories,
  })

  const sectionsQuery = useQuery({
    queryKey: ['admin-sections'],
    queryFn: apiAdminSections,
  })

  const categories = categoriesQuery.data?.data ?? []
  const sections = useMemo(
    () => [...(sectionsQuery.data?.data ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [sectionsQuery.data?.data],
  )
  const effectiveCategoryId = categoryId ?? categories[0]?.id ?? null
  const visibleSections = useMemo(
    () =>
      effectiveCategoryId
        ? sections.filter((section) => section.category_id === effectiveCategoryId)
        : sections,
    [effectiveCategoryId, sections],
  )
  const getNextSortOrder = (targetCategoryId: number | null) => {
    if (!targetCategoryId) {
      return 1
    }

    const maxSortOrder = sections
      .filter((section) => section.category_id === targetCategoryId)
      .reduce((max, section) => Math.max(max, section.sort_order), 0)

    return maxSortOrder + 1
  }

  const effectiveSortOrder =
    editingSectionId || categoryId !== null
      ? sortOrder
      : getNextSortOrder(effectiveCategoryId)

  const resetForm = () => {
    const defaultCategoryId = categories[0]?.id ?? null

    setEditingSectionId(null)
    setCategoryId(defaultCategoryId)
    setTitle('')
    setDescription('')
    setType('autojudge')
    setSortOrder(getNextSortOrder(defaultCategoryId))
    setIsVisible(true)
    setExtraTextEnabled(false)
    setExtraTextLabel('追加テキスト')
    setExtraTextRequired(false)
    setJudgeConfig(defaultJudgeConfig)
    setHints(['', '', ''])
    setExistingPdfs([])
    setRemovePdfIds([])
    setNewPdfs([])
  }

  const loadSectionMutation = useMutation({
    mutationFn: apiAdminSection,
    onSuccess: (section) => {
      setEditingSectionId(section.id)
      setCategoryId(section.category_id)
      setTitle(section.title)
      setDescription(section.description ?? '')
      setType(section.type)
      setSortOrder(section.sort_order)
      setIsVisible(section.is_visible)
      setExtraTextEnabled(section.extra_text_enabled)
      setExtraTextLabel(section.extra_text_label ?? '追加テキスト')
      setExtraTextRequired(section.extra_text_required)
      setJudgeConfig(
        section.judge_config
          ? JSON.stringify(section.judge_config, null, 2)
          : defaultJudgeConfig,
      )

      const nextHints = ['', '', '']
      for (const hint of section.hints ?? []) {
        const index = hint.hint_order - 1
        if (index >= 0 && index < 3) {
          nextHints[index] = hint.content
        }
      }
      setHints(nextHints)
      setExistingPdfs(section.pdfs ?? [])
      setRemovePdfIds([])
      setNewPdfs([])
    },
    onError: () => {
      toast.error('レッスン詳細の取得に失敗しました。')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveCategoryId) {
        throw new Error('category required')
      }

      const formData = new FormData()
      formData.append('category_id', String(effectiveCategoryId))
      formData.append('title', title)
      formData.append('description', description)
      formData.append('type', type)
      formData.append('sort_order', String(effectiveSortOrder))
      formData.append('is_visible', isVisible ? '1' : '0')
      formData.append('extra_text_enabled', extraTextEnabled ? '1' : '0')
      formData.append('extra_text_label', extraTextLabel)
      formData.append('extra_text_required', extraTextRequired ? '1' : '0')

      hints.forEach((hint, index) => {
        if (hint.trim().length) {
          formData.append(`hints[${index}]`, hint)
        }
      })

      if (type === 'autojudge') {
        formData.append('judge_config', judgeConfig)
      }

      removePdfIds.forEach((id) => {
        formData.append('remove_pdf_ids[]', String(id))
      })

      newPdfs.forEach((file) => {
        formData.append('pdfs[]', file)
      })

      return apiAdminSaveSection(formData, editingSectionId ?? undefined)
    },
    onSuccess: async () => {
      toast.success(editingSectionId ? 'レッスンを更新しました。' : 'レッスンを作成しました。')
      resetForm()
      await sectionsQuery.refetch()
    },
    onError: () => {
      toast.error('保存に失敗しました。必須項目と判定設定JSONを確認してください。')
    },
  })

  const reorderMutation = useMutation({
    mutationFn: apiAdminReorderSections,
    onSuccess: async () => {
      toast.success('表示順を更新しました。')
      await sectionsQuery.refetch()
    },
    onError: () => {
      toast.error('表示順更新に失敗しました。')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiAdminDeleteSection,
    onSuccess: async () => {
      toast.success('削除しました。')
      await sectionsQuery.refetch()
      if (editingSectionId) {
        resetForm()
      }
    },
    onError: () => {
      toast.error('削除に失敗しました。')
    },
  })

  const moveSection = (id: number, direction: 'up' | 'down') => {
    const index = visibleSections.findIndex((item) => item.id === id)
    if (index < 0) {
      return
    }

    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= visibleSections.length) {
      return
    }

    const next = [...visibleSections]
    const tmp = next[index]
    next[index] = next[nextIndex]
    next[nextIndex] = tmp

    reorderMutation.mutate(
      next.map((item, idx) => ({
        id: item.id,
        sort_order: idx + 1,
      })),
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">レッスン管理</h1>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingSectionId ? 'レッスン編集' : '新規作成'}
          </h2>
          {editingSectionId ? (
            <Button size="sm" variant="secondary" onClick={resetForm}>
              新規作成に戻す
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            value={effectiveCategoryId?.toString() ?? ''}
            onChange={(event) => {
              const nextCategoryId = event.target.value ? Number(event.target.value) : null
              setCategoryId(nextCategoryId)
              if (!editingSectionId) {
                setSortOrder(getNextSortOrder(nextCategoryId))
              }
            }}
          >
            <option value="">コースを選択</option>
            {categories.map((category: Category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </Select>

          <Input
            type="number"
            min={1}
            value={effectiveSortOrder}
            onChange={(event) => {
              setSortOrder(Number(event.target.value))
            }}
            placeholder="表示順"
          />
        </div>

        <Input
          placeholder="レッスン名"
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

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            value={type}
            onChange={(event) => {
              setType(event.target.value as 'autojudge' | 'webapp')
            }}
          >
            <option value="autojudge">自動判定課題</option>
            <option value="webapp">Webアプリ講座</option>
          </Select>

          <div className="flex items-center gap-2">
            <VisibilityBadge isVisible={isVisible} />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={
                isVisible
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }
              onClick={() => {
                setIsVisible((prev) => !prev)
              }}
            >
              切替
            </Button>
          </div>
        </div>

        {type === 'webapp' ? (
          <div className="space-y-2 rounded border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">追加テキスト設定（Webアプリのみ）</p>
            <div className="flex flex-wrap items-center gap-2">
              <EnabledBadge isEnabled={extraTextEnabled} />
              <Button
                size="sm"
                variant="secondary"
                className={
                  extraTextEnabled
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
                onClick={() => {
                  setExtraTextEnabled((prev) => !prev)
                }}
              >
                切替
              </Button>
              <Button
                size="sm"
                variant={extraTextRequired ? 'primary' : 'secondary'}
                onClick={() => {
                  setExtraTextRequired((prev) => !prev)
                }}
                disabled={!extraTextEnabled}
              >
                {extraTextRequired ? '必須' : '任意'}
              </Button>
            </div>
            <Input
              placeholder="ラベル名（例: 使用ライブラリ）"
              value={extraTextLabel}
              onChange={(event) => {
                setExtraTextLabel(event.target.value)
              }}
              disabled={!extraTextEnabled}
            />
          </div>
        ) : null}

        {type === 'autojudge' ? (
          <Textarea
            className="min-h-44 font-mono"
            value={judgeConfig}
            onChange={(event) => {
              setJudgeConfig(event.target.value)
            }}
            placeholder="判定設定JSON"
          />
        ) : null}

        <div className="grid gap-2 md:grid-cols-3">
          {hints.map((hint, index) => (
            <Input
              key={index}
              placeholder={`ヒント${index + 1}`}
              value={hint}
              onChange={(event) => {
                setHints((previous) => {
                  const next = [...previous]
                  next[index] = event.target.value
                  return next
                })
              }}
            />
          ))}
        </div>

        <div className="space-y-2 rounded border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-800">PDF（最大5件 / 1ファイル20MB）</p>
          {existingPdfs.length > 0 ? (
            <div className="space-y-1">
              {existingPdfs.map((pdf) => (
                <label key={pdf.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={removePdfIds.includes(pdf.id)}
                    onChange={(event) => {
                      setRemovePdfIds((prev) => {
                        if (event.target.checked) {
                          return [...prev, pdf.id]
                        }
                        return prev.filter((id) => id !== pdf.id)
                      })
                    }}
                  />
                  削除: {pdf.file_name}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">既存PDFはありません。</p>
          )}

          <Input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              setNewPdfs(files)
            }}
          />

          {newPdfs.length > 0 ? (
            <ul className="space-y-1 text-xs text-slate-600">
              {newPdfs.map((file) => (
                <li key={file.name}>
                  追加予定: {file.name} ({Math.round(file.size / 1024)}KB)
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Button
          onClick={() => {
            saveMutation.mutate()
          }}
          disabled={saveMutation.isPending || !effectiveCategoryId || !title}
        >
          {editingSectionId ? '更新' : '作成'}
        </Button>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">一覧</h2>
        {effectiveCategoryId && visibleSections.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">選択中のコースにレッスンはありません。</p>
        ) : null}
        <div className="mt-3 space-y-2">
          {visibleSections.map((section, index) => (
            <div
              key={section.id}
              className="flex flex-col gap-3 rounded border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge>{section.type}</Badge>
                  <VisibilityBadge isVisible={section.is_visible} />
                  <Badge className="bg-sky-100 text-sky-700">順序: {section.sort_order}</Badge>
                  {section.type === 'webapp' ? (
                    <EnabledBadge
                      isEnabled={section.extra_text_enabled}
                      enabledLabel="追加テキスト: 有効"
                      disabledLabel="追加テキスト: 無効"
                    />
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    loadSectionMutation.mutate(section.id)
                  }}
                  disabled={loadSectionMutation.isPending}
                >
                  編集
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    moveSection(section.id, 'up')
                  }}
                  disabled={index === 0 || reorderMutation.isPending}
                >
                  上へ
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    moveSection(section.id, 'down')
                  }}
                  disabled={index === visibleSections.length - 1 || reorderMutation.isPending}
                >
                  下へ
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    deleteMutation.mutate(section.id)
                  }}
                  disabled={deleteMutation.isPending}
                >
                  削除
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
