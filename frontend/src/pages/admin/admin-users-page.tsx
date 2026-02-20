import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ActiveStateBadge, RoleBadge } from '@/components/ui/status-badges'
import {
  apiAdminInvite,
  apiAdminSyncUserLabels,
  apiAdminUpdateUser,
  apiAdminUsers,
  apiLabels,
} from '@/lib/api'
import type { Label, User } from '@/types'

type UserDraft = {
  name: string
  role: 'user' | 'reviewer' | 'admin'
  is_active: boolean
  label_id: number | null
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

function formatLabelPeriod(label: Label): string | null {
  if (label.is_permanent) {
    return null
  }

  const start = formatDateJa(label.start_date)
  const end = formatDateJa(label.end_date)

  if (!start || !end) {
    return null
  }

  return `${start}〜${end}`
}

function buildUserDraft(user: User): UserDraft {
  return {
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    label_id: user.user_labels?.[0]?.label_id ?? null,
  }
}

export function AdminUsersPage() {
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'reviewer' | 'admin'>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [draftByUserId, setDraftByUserId] = useState<Record<number, UserDraft>>({})
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'user' | 'reviewer' | 'admin'>('user')
  const [inviteLabelId, setInviteLabelId] = useState<number | null>(null)

  const labelsQuery = useQuery({
    queryKey: ['labels-for-users'],
    queryFn: apiLabels,
  })

  const usersQuery = useQuery({
    queryKey: ['admin-users', roleFilter, activeFilter, keyword],
    queryFn: () =>
      apiAdminUsers({
        role: roleFilter === 'all' ? undefined : roleFilter,
        is_active:
          activeFilter === 'all'
            ? undefined
            : activeFilter === 'active',
        keyword: keyword || undefined,
      }),
  })

  const labels = labelsQuery.data?.data ?? []
  const users = usersQuery.data?.data ?? []

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      userId: number
      name: string
      role: 'user' | 'reviewer' | 'admin'
      is_active: boolean
    }) => apiAdminUpdateUser(payload.userId, payload),
    onSuccess: async () => {
      toast.success('ユーザーを更新しました。')
      setDraftByUserId({})
      await usersQuery.refetch()
    },
    onError: () => {
      toast.error('ユーザー更新に失敗しました。')
    },
  })

  const syncLabelsMutation = useMutation({
    mutationFn: async (payload: { userId: number; labelId: number | null }) => {
      const selectedLabels = payload.labelId
        ? [
            {
              label_id: payload.labelId,
              start_date: null,
              end_date: null,
            },
          ]
        : []

      return apiAdminSyncUserLabels(payload.userId, selectedLabels)
    },
    onSuccess: async () => {
      toast.success('ラベルを更新しました。')
      setDraftByUserId({})
      await usersQuery.refetch()
    },
    onError: () => {
      toast.error('ラベル更新に失敗しました。')
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async () =>
      apiAdminInvite({
        email: inviteEmail,
        role: inviteRole,
        label_id: inviteRole === 'user' ? (inviteLabelId ?? undefined) : undefined,
      }),
    onSuccess: () => {
      toast.success('招待メールを送信しました。')
      setInviteEmail('')
      setInviteRole('user')
      setInviteLabelId(null)
      setIsInviteModalOpen(false)
    },
    onError: () => {
      toast.error('招待送信に失敗しました。')
    },
  })

  const hasAnyFilter = useMemo(
    () => roleFilter !== 'all' || activeFilter !== 'all' || keyword.trim().length > 0,
    [roleFilter, activeFilter, keyword],
  )
  const canSubmitInvite = inviteEmail.trim().length > 0 && (inviteRole !== 'user' || inviteLabelId !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">ユーザー管理</h1>
        <Button
          onClick={() => {
            setIsInviteModalOpen(true)
          }}
        >
          ユーザー招待
        </Button>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">絞り込み</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <Input
            placeholder="名前 / メールアドレス"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
            }}
          />
          <Select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as 'all' | 'user' | 'reviewer' | 'admin')
            }}
          >
            <option value="all">全ロール</option>
            <option value="user">受講者</option>
            <option value="reviewer">レビュアー</option>
            <option value="admin">管理者</option>
          </Select>
          <Select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value as 'all' | 'active' | 'inactive')
            }}
          >
            <option value="all">有効/無効すべて</option>
            <option value="active">有効のみ</option>
            <option value="inactive">無効のみ</option>
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              setKeyword('')
              setRoleFilter('all')
              setActiveFilter('all')
            }}
            disabled={!hasAnyFilter}
          >
            クリア
          </Button>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          {users.map((user: User) => {
            const draft = draftByUserId[user.id] ?? buildUserDraft(user)
            const selectedLabel = labels.find((label) => label.id === draft.label_id) ?? null
            const selectedLabelPeriod = selectedLabel ? formatLabelPeriod(selectedLabel) : null

            return (
              <div key={user.id} className="rounded border border-slate-200 p-3">
                <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_1fr_auto_auto_auto] md:items-center">
                  <Input
                    value={draft.name}
                    onChange={(event) => {
                      setDraftByUserId((prev) => ({
                        ...prev,
                        [user.id]: {
                          ...draft,
                          name: event.target.value,
                        },
                      }))
                    }}
                  />

                  <Select
                    value={draft.role}
                    onChange={(event) => {
                      setDraftByUserId((prev) => ({
                        ...prev,
                        [user.id]: {
                          ...draft,
                          role: event.target.value as 'user' | 'reviewer' | 'admin',
                        },
                      }))
                    }}
                  >
                    <option value="user">受講者</option>
                    <option value="reviewer">レビュアー</option>
                    <option value="admin">管理者</option>
                  </Select>

                  <div className="flex items-center gap-2">
                    <ActiveStateBadge isActive={draft.is_active} />
                    <Button
                      size="sm"
                      variant="secondary"
                      className={
                        draft.is_active
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }
                      onClick={() => {
                        setDraftByUserId((prev) => ({
                          ...prev,
                          [user.id]: {
                            ...draft,
                            is_active: !draft.is_active,
                          },
                        }))
                      }}
                    >
                      切替
                    </Button>
                  </div>

                  <RoleBadge role={draft.role} />

                  <Button
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({
                        userId: user.id,
                        name: draft.name,
                        role: draft.role,
                        is_active: draft.is_active,
                      })
                    }}
                    disabled={!draft.name || updateMutation.isPending}
                  >
                    保存
                  </Button>
                </div>

                <p className="mt-2 text-sm text-slate-600">{user.email}</p>

                {draft.role === 'user' ? (
                  <div className="mt-3 rounded border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-600">ラベル付与</p>
                    <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto] md:items-center">
                      <Select
                        value={draft.label_id ? String(draft.label_id) : ''}
                        onChange={(event) => {
                          setDraftByUserId((prev) => ({
                            ...prev,
                            [user.id]: {
                              ...draft,
                              label_id: event.target.value ? Number(event.target.value) : null,
                            },
                          }))
                        }}
                      >
                        <option value="">未選択</option>
                        {labels.map((label) => (
                          <option key={label.id} value={label.id}>
                            {label.name}
                          </option>
                        ))}
                      </Select>

                      <p className="text-sm text-slate-600">{selectedLabelPeriod ?? ''}</p>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          syncLabelsMutation.mutate({
                            userId: user.id,
                            labelId: draft.label_id,
                          })
                        }}
                        disabled={syncLabelsMutation.isPending}
                      >
                        更新
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </Card>

      {isInviteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">ユーザー招待</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsInviteModalOpen(false)
                }}
              >
                閉じる
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => {
                    setInviteEmail(event.target.value)
                  }}
                  placeholder="invite@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ロール</label>
                <Select
                  value={inviteRole}
                  onChange={(event) => {
                    const nextRole = event.target.value as 'user' | 'reviewer' | 'admin'
                    setInviteRole(nextRole)
                    if (nextRole !== 'user') {
                      setInviteLabelId(null)
                    }
                  }}
                >
                  <option value="user">受講者</option>
                  <option value="reviewer">レビュアー</option>
                  <option value="admin">管理者</option>
                </Select>
              </div>

              {inviteRole === 'user' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">ラベル（必須）</label>
                  <Select
                    value={inviteLabelId ? String(inviteLabelId) : ''}
                    onChange={(event) => {
                      setInviteLabelId(event.target.value ? Number(event.target.value) : null)
                    }}
                  >
                    <option value="">ラベルを選択</option>
                    {labels.map((label) => (
                      <option key={label.id} value={label.id}>
                        {label.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsInviteModalOpen(false)
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={() => {
                  inviteMutation.mutate()
                }}
                disabled={!canSubmitInvite || inviteMutation.isPending}
              >
                招待メール送信
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
