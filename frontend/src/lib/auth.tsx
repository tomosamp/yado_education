/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { apiDevLogin, apiLogin, apiLogout, apiMe, apiUpdateProfile } from '@/lib/api'
import { ensureCsrfCookie } from '@/lib/http'
import type { Role, User } from '@/types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (payload: { email: string; password: string; remember: boolean }) => Promise<void>
  devLogin: (role: Role) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  updateProfile: (payload: {
    name: string
    password?: string
    password_confirmation?: string
  }) => Promise<void>
  hasAnyRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const me = await apiMe()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    async function boot() {
      await refreshMe()
      setLoading(false)
    }

    void boot()
  }, [refreshMe])

  const login = useCallback(
    async (payload: { email: string; password: string; remember: boolean }) => {
      await ensureCsrfCookie()
      await apiLogin(payload)
      const me = await apiMe()
      setUser(me)
    },
    [],
  )

  const devLogin = useCallback(async (role: Role) => {
    await ensureCsrfCookie()
    await apiDevLogin({ role })
    const me = await apiMe()
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    await ensureCsrfCookie()
    await apiLogout()
    setUser(null)
  }, [])

  const updateProfile = useCallback(
    async (payload: { name: string; password?: string; password_confirmation?: string }) => {
      await ensureCsrfCookie()
      const response = await apiUpdateProfile(payload)
      setUser(response.user)
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      devLogin,
      logout,
      refreshMe,
      updateProfile,
      hasAnyRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    }),
    [loading, login, devLogin, logout, refreshMe, updateProfile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
