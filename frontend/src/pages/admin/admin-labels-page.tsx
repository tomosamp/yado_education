import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { apiAdminDeleteLabel, apiAdminSaveLabel, apiLabels } from '@/lib/api'
import type { Label } from '@/types'

type LabelDraft = {
  id: number
  name: string
  is_permanent: boolean
  start_date: string
  end_date: string
}

function normalizeDateInput(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) {
    return ''
  }

  return `${match[1]}-${match[2]}-${match[3]}`
}

function formatDateJa(value: string | null | undefined): string {
  const normalized = normalizeDateInput(value)
  if (!normalized) {
    return ''
  }

  const [year, month, day] = normalized.split('-')
  return `${year}年${month}月${day}日`
}

function formatPeriodJa(startDate: string | null | undefined, endDate: string | null | undefined): string | null {
  const start = formatDateJa(startDate)
  const end = formatDateJa(endDate)

  if (!start || !end) {
    return null
  }

  return `${start}〜${end}`
}

export function AdminLabelsPage() {
  const [name, setName] = useState('')
  const [isPermanent, setIsPermanent] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [draftById, setDraftById] = useState<Record<number, LabelDraft>>({})

  const labelsQuery = useQuery({
    queryKey: ['labels'],
    queryFn: apiLabels,
  })

  const saveMutation = useMutation({
    mutationFn: apiAdminSaveLabel,
    onSuccess: async (_, variables) => {
      toast.success(variables.id ? 'ラベルを更新しました。' : 'ラベルを作成しました。')
      if (!variables.id) {
        setName('')
        setIsPermanent(true)
        setStartDate('')
        setEndDate('')
      }
      setDraftById({})
      await labelsQuery.refetch()
    },
    onError: () => {
      toast.error('保存に失敗しました。入力内容を確認してください。')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiAdminDeleteLabel,
    onSuccess: async () => {
      toast.success('ラベルを削除しました。')
      setDraftById({})
      await labelsQuery.refetch()
    },
    onError: () => {
      toast.error('削除に失敗しました。')
    },
  })

  const newLabelPeriodText = formatPeriodJa(startDate, endDate)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">ラベル管理</h1>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">新規作成</h2>
        <Input
          placeholder="ラベル名"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
        <Select
          value={isPermanent ? '1' : '0'}
          onChange={(event) => {
            setIsPermanent(event.target.value === '1')
          }}
        >
          <option value="1">永久</option>
          <option value="0">期間指定</option>
        </Select>
        {!isPermanent ? (
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
              }}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value)
              }}
            />
          </div>
        ) : null}
        {!isPermanent ? (
          <p className="text-xs text-slate-600">
            {newLabelPeriodText ? `適用期間: ${newLabelPeriodText}` : '適用期間: 未設定'}
          </p>
        ) : (
          <p className="text-xs text-slate-600">適用期間: 永久</p>
        )}
        <Button
          onClick={() => {
            saveMutation.mutate({
              name,
              is_permanent: isPermanent,
              start_date: isPermanent ? null : (startDate || null),
              end_date: isPermanent ? null : (endDate || null),
            })
          }}
          disabled={!name || saveMutation.isPending}
        >
          作成
        </Button>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">一覧</h2>
        <div className="mt-3 space-y-2">
          {(labelsQuery.data?.data ?? []).map((label: Label) => {
            const draft = draftById[label.id] ?? {
              id: label.id,
              name: label.name,
              is_permanent: label.is_permanent,
              start_date: normalizeDateInput(label.start_date),
              end_date: normalizeDateInput(label.end_date),
            }

            const periodText = formatPeriodJa(draft.start_date, draft.end_date)

            return (
              <div
                key={label.id}
                className="rounded border border-slate-200 p-3"
              >
                <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
                  <Input
                    value={draft.name}
                    onChange={(event) => {
                      setDraftById((prev) => ({
                        ...prev,
                        [label.id]: {
                          ...draft,
                          name: event.target.value,
                        },
                      }))
                    }}
                  />
                  <Select
                    value={draft.is_permanent ? '1' : '0'}
                    onChange={(event) => {
                      const nextIsPermanent = event.target.value === '1'
                      setDraftById((prev) => ({
                        ...prev,
                        [label.id]: {
                          ...draft,
                          is_permanent: nextIsPermanent,
                          start_date: nextIsPermanent ? '' : draft.start_date,
                          end_date: nextIsPermanent ? '' : draft.end_date,
                        },
                      }))
                    }}
                  >
                    <option value="1">永久</option>
                    <option value="0">期間指定</option>
                  </Select>
                  <Input
                    type="date"
                    value={draft.start_date}
                    disabled={draft.is_permanent}
                    onChange={(event) => {
                      setDraftById((prev) => ({
                        ...prev,
                        [label.id]: {
                          ...draft,
                          start_date: event.target.value,
                        },
                      }))
                    }}
                  />
                  <Input
                    type="date"
                    value={draft.end_date}
                    disabled={draft.is_permanent}
                    onChange={(event) => {
                      setDraftById((prev) => ({
                        ...prev,
                        [label.id]: {
                          ...draft,
                          end_date: event.target.value,
                        },
                      }))
                    }}
                  />
                </div>

                {!draft.is_permanent ? (
                  <p className="mt-2 text-xs text-slate-600">
                    {periodText ? `適用期間: ${periodText}` : '適用期間: 未設定'}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-600">適用期間: 永久</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      saveMutation.mutate({
                        id: draft.id,
                        name: draft.name,
                        is_permanent: draft.is_permanent,
                        start_date: draft.is_permanent ? null : (draft.start_date || null),
                        end_date: draft.is_permanent ? null : (draft.end_date || null),
                      })
                    }}
                    disabled={!draft.name || saveMutation.isPending}
                  >
                    更新
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      deleteMutation.mutate(label.id)
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
