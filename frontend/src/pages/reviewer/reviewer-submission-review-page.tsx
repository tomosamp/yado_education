import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { apiReviewSubmission, apiSubmission } from '@/lib/api'

export function ReviewerSubmissionReviewPage() {
  const navigate = useNavigate()
  const { submissionId } = useParams()
  const parsedSubmissionId = Number(submissionId)
  const isValidSubmissionId = Number.isInteger(parsedSubmissionId) && parsedSubmissionId > 0
  const [comment, setComment] = useState('')

  const submissionQuery = useQuery({
    queryKey: ['review-submission', parsedSubmissionId],
    queryFn: () => apiSubmission(parsedSubmissionId),
    enabled: isValidSubmissionId,
  })

  const reviewMutation = useMutation({
    mutationFn: async (decision: 'approved' | 'rejected') =>
      apiReviewSubmission(parsedSubmissionId, {
        decision,
        comment,
      }),
    onSuccess: () => {
      toast.success('レビューを保存しました。')
      const userId = submissionQuery.data?.user_id
      if (userId) {
        navigate(`/reviewer/pending/users/${userId}`)
        return
      }
      navigate('/reviewer/pending')
    },
    onError: () => {
      toast.error('レビュー保存に失敗しました。')
    },
  })

  const submission = submissionQuery.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">提出レビュー</h1>
        <Button
          variant="secondary"
          onClick={() => {
            if (submission?.user_id) {
              navigate(`/reviewer/pending/users/${submission.user_id}`)
              return
            }
            navigate('/reviewer/pending')
          }}
        >
          レッスン一覧に戻る
        </Button>
      </div>

      {!isValidSubmissionId ? <p className="text-sm text-rose-600">提出IDが不正です。</p> : null}
      {submissionQuery.isLoading ? <p className="text-sm text-slate-600">読み込み中...</p> : null}
      {submissionQuery.isError ? (
        <p className="text-sm text-rose-600">提出詳細の取得に失敗しました。</p>
      ) : null}

      {submission ? (
        <>
          <Card className="space-y-2">
            <p className="text-base font-semibold text-slate-900">{submission.section?.title}</p>
            <p className="text-xs text-slate-600">コース: {submission.section?.category?.title ?? '-'}</p>
            <p className="text-xs text-slate-600">提出者: {submission.user?.name}</p>
            <p className="text-xs text-slate-600">理解度: {submission.understanding}</p>
            <p className="text-xs text-slate-600">
              提出日時: {new Date(submission.submitted_at).toLocaleString('ja-JP')}
            </p>
            <p className="text-sm text-slate-700">提出コメント: {submission.comment || '（未入力）'}</p>
          </Card>

          {submission.autojudge_code ? (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">提出コード</h2>
              <p className="text-xs text-slate-600">言語: {submission.autojudge_code.language}</p>
              <pre className="max-h-[50vh] overflow-auto rounded bg-slate-950 p-4 text-xs text-slate-100">
                {submission.autojudge_code.code}
              </pre>
            </Card>
          ) : null}

          {submission.webapp_link ? (
            <Card className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Webアプリ提出情報</h2>
              <p className="text-sm text-slate-700">
                GitHub URL:{' '}
                <a
                  href={submission.webapp_link.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 underline"
                >
                  {submission.webapp_link.github_url}
                </a>
              </p>
              <p className="text-sm text-slate-700">
                追加テキスト: {submission.webapp_link.extra_text || '（未入力）'}
              </p>
            </Card>
          ) : null}

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">レビュー実施</h2>
            <Textarea
              placeholder="レビューコメント（必須）"
              value={comment}
              onChange={(event) => {
                setComment(event.target.value)
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  reviewMutation.mutate('approved')
                }}
                disabled={!comment || reviewMutation.isPending}
              >
                合格
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  reviewMutation.mutate('rejected')
                }}
                disabled={!comment || reviewMutation.isPending}
              >
                差戻し
              </Button>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
