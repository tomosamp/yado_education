import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AuthProvider } from '@/lib/auth'
import { LoginPage } from '@/pages/login-page'

describe('LoginPage', () => {
  it('ログイン画面の見出しを表示する', () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('社内教育システム')).toBeInTheDocument()
  })
})
