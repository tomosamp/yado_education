import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { apiPendingReviews } from '@/lib/api'
import type { Submission } from '@/types'

export function ReviewerPendingUserSectionsPage() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const parsedUserId = Number(userId)
  const isValidUserId = Number.isInteger(parsedUserId) && parsedUserId > 0

  const sectionsQuery = useQuery({
    queryKey: ['review-pending-user-sections', parsedUserId],
    queryFn: () => apiPendingReviews(1, { user_id: parsedUserId, per_page: 100 }),
    enabled: isValidUserId,
  })

  const submissions = sectionsQuery.data?.data ?? []
  const learnerName = submissions[0]?.user?.name ?? '該当ユーザー'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">{learnerName} のレビュー待ちレッスン</h1>
        <Button
          variant="secondary"
          onClick={() => {
            navigate('/reviewer/pending')
          }}
        >
          ユーザー一覧に戻る
        </Button>
      </div>

      {!isValidUserId ? <p className="text-sm text-rose-600">ユーザーIDが不正です。</p> : null}
      {sectionsQuery.isLoading ? <p className="text-sm text-slate-600">読み込み中...</p> : null}
      {sectionsQuery.isError ? (
        <p className="text-sm text-rose-600">レビュー待ちレッスンの取得に失敗しました。</p>
      ) : null}
      {!sectionsQuery.isLoading && submissions.length === 0 ? (
        <p className="text-sm text-slate-600">このユーザーにレビュー待ちはありません。</p>
      ) : null}

      <div className="space-y-3">
        {submissions.map((submission: Submission) => (
          <Card key={submission.id} className="space-y-3">
            <div>
              <p className="text-base font-semibold text-slate-900">{submission.section?.title}</p>
              <p className="text-xs text-slate-600">コース: {submission.section?.category?.title ?? '-'}</p>
              <p className="text-xs text-slate-600">理解度: {submission.understanding}</p>
              <p className="text-xs text-slate-600">
                提出日時: {new Date(submission.submitted_at).toLocaleString('ja-JP')}
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                navigate(`/reviewer/pending/submissions/${submission.id}`)
              }}
            >
              レビューする
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
