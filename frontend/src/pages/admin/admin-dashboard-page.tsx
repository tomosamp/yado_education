import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { apiAdminInvite, apiAdminInvitations, apiDashboardAdmin, apiLabels } from '@/lib/api'
import type { Invitation, Label } from '@/types'

export function AdminDashboardPage() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'reviewer' | 'admin'>('user')
  const [labelId, setLabelId] = useState<number | null>(null)

  const metricsQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: apiDashboardAdmin,
  })

  const invitationsQuery = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: apiAdminInvitations,
  })

  const labelsQuery = useQuery({
    queryKey: ['labels-for-invite'],
    queryFn: apiLabels,
  })

  const labels = labelsQuery.data?.data ?? []
  const canInvite = email.trim().length > 0 && (role !== 'user' || labelId !== null)

  const inviteMutation = useMutation({
    mutationFn: async () =>
      apiAdminInvite({
        email,
        role,
        label_id: role === 'user' ? (labelId ?? undefined) : undefined,
      }),
    onSuccess: async () => {
      toast.success('招待メールを送信しました。')
      setEmail('')
      setLabelId(null)
      await invitationsQuery.refetch()
    },
    onError: () => {
      toast.error('招待送信に失敗しました。')
    },
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">管理ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-600">招待発行と全体状況を確認します。</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="総ユーザー" value={`${metricsQuery.data?.metrics.total_users ?? 0}`} />
        <MetricCard label="有効ユーザー" value={`${metricsQuery.data?.metrics.active_users ?? 0}`} />
        <MetricCard label="レビュー待ち" value={`${metricsQuery.data?.metrics.pending_reviews ?? 0}`} />
        <MetricCard
          label="全体完了率"
          value={`${metricsQuery.data?.metrics.overall_completion_rate ?? 0}%`}
        />
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">ユーザー招待</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <Input
            placeholder="招待メールアドレス"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
            }}
          />
          <Select
            value={role}
            onChange={(event) => {
              const nextRole = event.target.value as 'user' | 'reviewer' | 'admin'
              setRole(nextRole)
              if (nextRole !== 'user') {
                setLabelId(null)
              }
            }}
          >
            <option value="user">受講者</option>
            <option value="reviewer">レビュアー</option>
            <option value="admin">管理者</option>
          </Select>
          <Select
            value={labelId ? String(labelId) : ''}
            disabled={role !== 'user'}
            onChange={(event) => {
              setLabelId(event.target.value ? Number(event.target.value) : null)
            }}
          >
            <option value="">ラベルを選択</option>
            {labels.map((label: Label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => {
              inviteMutation.mutate()
            }}
            disabled={!canInvite || inviteMutation.isPending}
          >
            招待送信
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">招待履歴</h2>
        <div className="mt-3 space-y-2">
          {(invitationsQuery.data?.data ?? []).map((invitation: Invitation) => (
            <div
              key={invitation.id}
              className="rounded border border-slate-200 p-3 text-sm text-slate-700"
            >
              <p>
                {invitation.email} ({invitation.role})
              </p>
              <p className="text-xs">expires: {invitation.expires_at}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  )
}
