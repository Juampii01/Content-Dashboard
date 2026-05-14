'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
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

  const load = useCallback(async () => {
    try {
      const meRes = await fetch('/api/me')
      if (!meRes.ok) {
        setSessionError(true)
        setProfile(null)
        return
      }
      const meData = (await meRes.json()) as AuthProfile
      setProfile(meData)
      setSessionError(false)
    } catch (err) {
      logClientError(err, 'AuthProvider:load', { silent: true })
      setSessionError(true)
    } finally {
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
