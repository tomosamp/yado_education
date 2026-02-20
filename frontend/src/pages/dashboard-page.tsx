import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import {
  apiAdminUser,
  apiAdminUsers,
  apiDashboardAdmin,
  apiDashboardMe,
  apiDashboardReviewer,
} from '@/lib/api'
import type { Submission } from '@/types'

type ProgressStats = {
  total_sections: number
  passed: number
  review_pending: number
  revision_required: number
  not_submitted: number
  completion_rate: number
}

export function DashboardPage() {
  const { user } = useAuth()
  const [selectedLearnerId, setSelectedLearnerId] = useState<number | null>(null)

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', user?.role],
    queryFn: async () => {
      if (user?.role === 'admin') {
        return apiDashboardAdmin()
      }

      if (user?.role === 'reviewer') {
        return apiDashboardReviewer()
      }

      return apiDashboardMe()
    },
    enabled: Boolean(user),
  })

  const learnerOptionsQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'learners'],
    queryFn: () => apiAdminUsers({ role: 'user', is_active: true }),
    enabled: user?.role === 'admin',
  })

  const learners = learnerOptionsQuery.data?.data ?? []

  useEffect(() => {
    if (user?.role !== 'admin') {
      return
    }

    if (learners.length === 0) {
      if (selectedLearnerId !== null) {
        setSelectedLearnerId(null)
      }
      return
    }

    const selectedExists =
      selectedLearnerId !== null && learners.some((learner) => learner.id === selectedLearnerId)

    if (!selectedExists) {
      setSelectedLearnerId(learners[0].id)
    }
  }, [learners, selectedLearnerId, user?.role])

  const selectedLearnerProgressQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'learner-progress', selectedLearnerId],
    queryFn: async () => apiAdminUser(selectedLearnerId as number),
    enabled: user?.role === 'admin' && selectedLearnerId !== null,
  })

  const metrics = dashboardQuery.data?.metrics
  const myProgress = useMemo<ProgressStats | null>(() => {
    if (user?.role !== 'user') {
      return null
    }

    const totalSections = metrics?.total_sections ?? 0
    const passed = metrics?.passed_sections ?? 0
    const reviewPending = metrics?.review_pending ?? 0
    const revisionRequired = metrics?.revision_required ?? 0
    const submitted = passed + reviewPending + revisionRequired

    return {
      total_sections: totalSections,
      passed,
      review_pending: reviewPending,
      revision_required: revisionRequired,
      not_submitted: Math.max(0, totalSections - submitted),
      completion_rate: metrics?.completion_rate ?? 0,
    }
  }, [metrics, user?.role])

  const pendingSubmissions = (dashboardQuery.data?.pending_submissions ?? []) as Submission[]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-600">現在の進捗・レビュー状況を確認できます。</p>
      </header>

      {dashboardQuery.isLoading ? <p className="text-sm text-slate-600">読み込み中...</p> : null}
      {dashboardQuery.isError ? (
        <p className="text-sm text-rose-600">ダッシュボード情報の取得に失敗しました。</p>
      ) : null}

      {user?.role === 'admin' ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="総ユーザー" value={`${metrics?.total_users ?? 0}`} />
            <MetricCard label="有効ユーザー" value={`${metrics?.active_users ?? 0}`} />
            <MetricCard label="レビュー待ち" value={`${metrics?.pending_reviews ?? 0}`} />
            <MetricCard label="全体完了率" value={`${metrics?.overall_completion_rate ?? 0}%`} />
          </div>

          <Card className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">受講者進捗</h2>
                <p className="text-sm text-slate-600">
                  受講者を選択すると進捗が動的に切り替わります。
                </p>
              </div>
              <div className="w-full md:w-80">
                <label className="mb-1 block text-sm font-medium text-slate-700">受講者</label>
                <Select
                  value={selectedLearnerId ? String(selectedLearnerId) : ''}
                  disabled={learners.length === 0}
                  onChange={(event) => {
                    setSelectedLearnerId(event.target.value ? Number(event.target.value) : null)
                  }}
                >
                  {learners.length === 0 ? (
                    <option value="">受講者が見つかりません</option>
                  ) : null}
                  {learners.map((learner) => (
                    <option key={learner.id} value={learner.id}>
                      {learner.name} ({learner.email})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {learnerOptionsQuery.isLoading ? (
              <p className="text-sm text-slate-600">受講者一覧を読み込み中...</p>
            ) : null}
            {learnerOptionsQuery.isError ? (
              <p className="text-sm text-rose-600">受講者一覧の取得に失敗しました。</p>
            ) : null}
            {selectedLearnerProgressQuery.isLoading ? (
              <p className="text-sm text-slate-600">受講者進捗を読み込み中...</p>
            ) : null}
            {selectedLearnerProgressQuery.isError ? (
              <p className="text-sm text-rose-600">受講者進捗の取得に失敗しました。</p>
            ) : null}

            {selectedLearnerProgressQuery.data ? (
              <ProgressCard
                title={`${selectedLearnerProgressQuery.data.user.name} さんの進捗`}
                progress={selectedLearnerProgressQuery.data.progress}
              />
            ) : null}
          </Card>
        </>
      ) : null}

      {user?.role === 'user' ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="完了率" value={`${metrics?.completion_rate ?? 0}%`} />
            <MetricCard label="合格数" value={`${metrics?.passed_sections ?? 0}`} />
            <MetricCard label="レビュー待ち" value={`${metrics?.review_pending ?? 0}`} />
            <MetricCard label="やり直し" value={`${metrics?.revision_required ?? 0}`} />
          </div>

          {myProgress ? <ProgressCard title="あなたの進捗" progress={myProgress} /> : null}
        </>
      ) : null}

      {user?.role === 'reviewer' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard label="レビュー待ち件数" value={`${metrics?.pending_reviews ?? 0}`} />
            <MetricCard label="表示中の件数" value={`${pendingSubmissions.length}`} />
          </div>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">レビュー待ち一覧（最新20件）</h2>
            {pendingSubmissions.length === 0 ? (
              <p className="text-sm text-slate-600">レビュー待ちはありません。</p>
            ) : (
              <div className="space-y-2">
                {pendingSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-lg border border-slate-200 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-slate-900">{submission.user?.name ?? '不明ユーザー'}</p>
                    <p className="text-slate-700">
                      {submission.section?.category?.title ?? '未分類'} /{' '}
                      {submission.section?.title ?? '不明レッスン'}
                    </p>
                    <p className="text-xs text-slate-500">提出日時: {submission.submitted_at}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  )
}

function ProgressCard({ title, progress }: { title: string; progress: ProgressStats }) {
  const slices: ProgressSlice[] = [
    { label: '合格', value: progress.passed, color: '#16a34a' },
    { label: 'レビュー待ち', value: progress.review_pending, color: '#ea580c' },
    { label: 'やり直し', value: progress.revision_required, color: '#dc2626' },
    { label: '未提出', value: progress.not_submitted, color: '#94a3b8' },
  ]

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">
        合格 {progress.passed} / 全{progress.total_sections}レッスン
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
        <DonutProgressChart completionRate={progress.completion_rate} slices={slices} />

        <div className="grid gap-2 sm:grid-cols-2">
          {slices.map((slice) => (
            <div
              key={slice.label}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                <p className="text-sm font-medium text-slate-700">{slice.label}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">{slice.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

type ProgressSlice = {
  label: string
  value: number
  color: string
}

function DonutProgressChart({
  completionRate,
  slices,
}: {
  completionRate: number
  slices: ProgressSlice[]
}) {
  const gradient = useMemo(() => {
    const normalized = slices.map((slice) => ({
      ...slice,
      value: Math.max(0, slice.value),
    }))
    const total = normalized.reduce((sum, slice) => sum + slice.value, 0)

    if (total <= 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)'
    }

    let currentDeg = 0
    const parts: string[] = []

    normalized.forEach((slice) => {
      if (slice.value <= 0) {
        return
      }

      const start = currentDeg
      currentDeg += (slice.value / total) * 360
      parts.push(`${slice.color} ${start.toFixed(2)}deg ${currentDeg.toFixed(2)}deg`)
    })

    return `conic-gradient(${parts.join(', ')})`
  }, [slices])

  const normalizedCompletionRate = Number.isFinite(completionRate)
    ? Math.min(100, Math.max(0, completionRate))
    : 0

  return (
    <div className="mx-auto">
      <div className="relative h-44 w-44 rounded-full" style={{ background: gradient }}>
        <div className="absolute inset-7 flex items-center justify-center rounded-full bg-white">
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">達成率</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {normalizedCompletionRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
