import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/lib/auth'

const schema = z.object({
  email: z.string().email('メールアドレスの形式が不正です。'),
  password: z.string().min(1, 'パスワードを入力してください。'),
  remember: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const devQuickAccounts = [
  {
    key: 'user',
    label: '受講者でログイン',
    role: 'user',
    email: 'user@example.com',
    password: 'password',
  },
  {
    key: 'reviewer',
    label: 'レビュアーでログイン',
    role: 'reviewer',
    email: 'reviewer@example.com',
    password: 'password',
  },
  {
    key: 'admin',
    label: '管理者でログイン',
    role: 'admin',
    email: 'admin@test.com',
    password: 'password',
  },
] as const

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, devLogin } = useAuth()
  const [quickLoginKey, setQuickLoginKey] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      remember: true,
    },
  })

  const runLogin = async (values: FormValues) => {
    try {
      await login(values)
      const destination =
        ((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
          '/dashboard')
      navigate(destination, { replace: true })
    } catch (error) {
      const apiMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined

      form.setError('root', {
        message: apiMessage ?? 'ログインに失敗しました。入力内容を確認してください。',
      })
    }
  }

  const onSubmit = form.handleSubmit(runLogin)

  const onQuickLogin = async (account: (typeof devQuickAccounts)[number]) => {
    setQuickLoginKey(account.key)
    form.clearErrors('root')
    form.setValue('email', account.email)
    form.setValue('password', account.password)

    try {
      await devLogin(account.role)
      const destination =
        ((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
          '/dashboard')
      navigate(destination, { replace: true })
    } catch (error) {
      const apiMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined

      form.setError('root', {
        message: apiMessage ?? 'ログインに失敗しました。入力内容を確認してください。',
      })
    } finally {
      setQuickLoginKey(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#c7e7ff_0%,_#f8fafc_45%)] p-6">
      <Card className="w-full max-w-md space-y-6 border-slate-200 p-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-slate-900">社内教育システム</h1>
          <p className="text-sm text-slate-600">メールアドレスとパスワードでログインしてください。</p>
        </header>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</label>
            <Input type="email" {...form.register('email')} />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.email?.message}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">パスワード</label>
            <PasswordInput {...form.register('password')} />
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.password?.message}</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...form.register('remember')} />
            ログイン状態を保持する
          </label>

          <p className="text-xs text-rose-600">{form.formState.errors.root?.message}</p>

          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            ログイン
          </Button>
        </form>

        {import.meta.env.DEV ? (
          <section className="space-y-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">開発環境用クイックログイン</p>
            <div className="grid gap-2">
              {devQuickAccounts.map((account) => (
                <Button
                  key={account.key}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  disabled={form.formState.isSubmitting || quickLoginKey !== null}
                  onClick={() => void onQuickLogin(account)}
                >
                  {quickLoginKey === account.key ? 'ログイン中...' : account.label}
                </Button>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-center text-xs text-slate-600">
          招待リンクを受け取った場合は
          <Link className="ml-1 text-sky-700 underline" to="/accept-invitation">
            初回設定
          </Link>
          を実行してください。
        </p>
      </Card>
    </div>
  )
}
