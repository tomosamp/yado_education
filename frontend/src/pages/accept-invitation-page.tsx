import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { apiAcceptInvitation } from '@/lib/api'

const schema = z
  .object({
    token: z.string().min(1, 'token がありません。'),
    email: z.string().email('メールアドレスの形式が不正です。'),
    name: z.string().min(1, '表示名を入力してください。'),
    password: z.string().min(8, '8文字以上で入力してください。'),
    password_confirmation: z.string().min(8, '確認用パスワードを入力してください。'),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: '確認用パスワードが一致しません。',
    path: ['password_confirmation'],
  })

type FormValues = z.infer<typeof schema>

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: searchParams.get('token') ?? '',
      email: searchParams.get('email') ?? '',
      name: '',
      password: '',
      password_confirmation: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await apiAcceptInvitation(values)
      toast.success('初回設定が完了しました。ログインしてください。')
      navigate('/login', { replace: true })
    } catch {
      toast.error('初回設定に失敗しました。招待リンクを確認してください。')
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#dff6ff_0%,_#f8fafc_45%)] p-6">
      <Card className="w-full max-w-lg space-y-6 border-slate-200 p-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">初回設定</h1>
          <p className="text-sm text-slate-600">招待情報を確認し、表示名とパスワードを設定してください。</p>
        </header>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">招待トークン</label>
            <Input {...form.register('token')} readOnly={Boolean(searchParams.get('token'))} />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.token?.message}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</label>
            <Input type="email" {...form.register('email')} readOnly={Boolean(searchParams.get('email'))} />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.email?.message}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">表示名</label>
            <Input {...form.register('name')} />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.name?.message}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">パスワード</label>
            <PasswordInput {...form.register('password')} />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.password?.message}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">パスワード（確認）</label>
            <PasswordInput {...form.register('password_confirmation')} />
            <p className="mt-1 text-xs text-rose-600">
              {form.formState.errors.password_confirmation?.message}
            </p>
          </div>

          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            初回設定を完了
          </Button>
        </form>

        <p className="text-center text-xs text-slate-600">
          既に設定済みの方は
          <Link className="ml-1 text-sky-700 underline" to="/login">
            ログインへ
          </Link>
        </p>
      </Card>
    </div>
  )
}
