import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { apiMySubmissions } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const schema = z
  .object({
    name: z.string().min(1, '名前を入力してください。'),
    password: z.string().optional(),
    password_confirmation: z.string().optional(),
  })
  .refine(
    (value) => {
      if (!value.password && !value.password_confirmation) {
        return true
      }

      return value.password === value.password_confirmation
    },
    {
      message: '確認用パスワードが一致しません。',
      path: ['password_confirmation'],
    },
  )

type FormValues = z.infer<typeof schema>

export function MyPage() {
  const { user, updateProfile } = useAuth()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      password: '',
      password_confirmation: '',
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        password: '',
        password_confirmation: '',
      })
    }
  }, [form, user])

  const submissionsQuery = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => apiMySubmissions(1),
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">マイページ</h1>
        <p className="mt-1 text-sm text-slate-600">表示名とパスワードを更新できます。</p>
      </header>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">プロフィール更新</h2>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await updateProfile(values)
              toast.success('プロフィールを更新しました。')
            } catch {
              toast.error('更新に失敗しました。')
            }
          })}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">表示名</label>
            <Input {...form.register('name')} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">新しいパスワード</label>
            <Input type="password" {...form.register('password')} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">新しいパスワード（確認）</label>
            <Input type="password" {...form.register('password_confirmation')} />
            <p className="mt-1 text-xs text-rose-600">
              {form.formState.errors.password_confirmation?.message}
            </p>
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            更新する
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">提出履歴</h2>
        <div className="mt-3 space-y-2">
          {submissionsQuery.data?.data.map((submission) => (
            <div key={submission.id} className="rounded border border-slate-200 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-800">{submission.section?.title}</p>
              <p className="text-xs">status: {submission.status}</p>
              <p className="text-xs">understanding: {submission.understanding}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
