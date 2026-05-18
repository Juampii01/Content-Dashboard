'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { logClientError } from '@/lib/client-errors'

export type UserRole = 'admin' | 'team' | 'setter' | 'client'

export interface AuthProfile {
  userId: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
  clientId: string | null
  clientName: string | null
}

interface AuthContextValue {
  profile: AuthProfile | null
  loading: boolean
  sessionError: boolean
  refetch: () => Promise<void>
  setProfileFields: (next: Partial<Pick<AuthProfile, 'displayName' | 'avatarUrl'>>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Single source of truth for the active session + profile.
 * Fetches /api/me on mount and exposes the result via context.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState(false)

  // Tracks retry attempts — reset whenever `load` is called externally (refetch)
  const retryCount = useRef(0)

  const load = useCallback(async (isRetry = false) => {
    if (!isRetry) retryCount.current = 0
    try {
      const meRes = await fetch('/api/me')
      if (!meRes.ok) {
        // 401 right after login is a cookie-propagation race condition.
        // Retry up to 2 times with a short back-off before declaring a real error.
        if (meRes.status === 401 && retryCount.current < 2) {
          retryCount.current += 1
          const delay = retryCount.current * 700
          setTimeout(() => void load(true), delay)
          return // stay in loading state during retry
        }
        setSessionError(true)
        setProfile(null)
        setLoading(false)
        return
      }
      const meData = (await meRes.json()) as AuthProfile
      setProfile(meData)
      setSessionError(false)
      setLoading(false)
    } catch (err) {
      if (retryCount.current < 2) {
        retryCount.current += 1
        setTimeout(() => void load(true), retryCount.current * 700)
        return
      }
      logClientError(err, 'AuthProvider:load', { silent: true })
      setSessionError(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setProfileFields = useCallback(
    (next: Partial<Pick<AuthProfile, 'displayName' | 'avatarUrl'>>) => {
      setProfile((prev) => (prev ? { ...prev, ...next } : prev))
    },
    [],
  )

  const value: AuthContextValue = {
    profile,
    loading,
    sessionError,
    refetch: load,
    setProfileFields,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
