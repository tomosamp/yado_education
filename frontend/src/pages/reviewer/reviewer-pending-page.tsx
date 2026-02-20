import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { apiPendingReviewUsers } from '@/lib/api'
import type { PendingReviewUser } from '@/types'

export function ReviewerPendingPage() {
  const navigate = useNavigate()

  const usersQuery = useQuery({
    queryKey: ['review-pending-users'],
    queryFn: apiPendingReviewUsers,
  })

  const users = usersQuery.data?.users ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">レビュー待ちユーザー一覧</h1>

      {usersQuery.isLoading ? <p className="text-sm text-slate-600">読み込み中...</p> : null}
      {usersQuery.isError ? (
        <p className="text-sm text-rose-600">レビュー待ちユーザーの取得に失敗しました。</p>
      ) : null}
      {!usersQuery.isLoading && users.length === 0 ? (
        <p className="text-sm text-slate-600">レビュー待ちはありません。</p>
      ) : null}

      <div className="space-y-3">
        {users.map((user: PendingReviewUser) => (
          <Card key={user.id} className="space-y-3">
            <div>
              <p className="text-base font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-600">{user.email}</p>
              <p className="mt-1 text-sm text-slate-700">レビュー待ち: {user.pending_count}件</p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                navigate(`/reviewer/pending/users/${user.id}`)
              }}
            >
              レッスン一覧を見る
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
