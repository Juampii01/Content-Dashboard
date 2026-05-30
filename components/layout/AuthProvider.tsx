'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
 *
 * Strategy:
 * 1. Fetch /api/me on mount (covers page-load with existing session).
 * 2. Subscribe to Supabase onAuthStateChange:
 *    - SIGNED_IN  → clear any stale error and reload profile.
 *                   This fires after signInWithPassword() on the login page,
 *                   guaranteeing the session cookie is ready before we hit
 *                   /api/me — eliminating the race condition that showed
 *                   "Sesión expirada" right after login.
 *    - SIGNED_OUT → clear profile immediately.
 * 3. Keep a short retry for transient network errors (not for 401s,
 *    those are now handled reactively via onAuthStateChange).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState(false)
  const retryCount = useRef(0)
  const router = useRouter()

  const loadRef = useRef<((isRetry?: boolean) => Promise<void>) | null>(null)

  const load = useCallback(async (isRetry = false) => {
    if (!isRetry) retryCount.current = 0
    try {
      const meRes = await fetch('/api/me')
      if (!meRes.ok) {
        // For 401s we rely on onAuthStateChange to recover — don't show the
        // error banner right away, just keep loading until SIGNED_IN fires.
        // Only escalate to an error after 2 retries (covers network flakiness).
        if (meRes.status === 401 && retryCount.current < 2) {
          retryCount.current += 1
          setTimeout(() => void loadRef.current?.(true), retryCount.current * 600)
          return // stay in loading state
        }
        setSessionError(true)
        setProfile(null)
        setLoading(false)
        // All retries exhausted — session is definitively expired, redirect to login
        router.push('/login')
        return
      }
      const meData = (await meRes.json()) as AuthProfile
      setProfile(meData)
      setSessionError(false)
      setLoading(false)
    } catch (err) {
      if (retryCount.current < 2) {
        retryCount.current += 1
        setTimeout(() => void loadRef.current?.(true), retryCount.current * 600)
        return
      }
      logClientError(err, 'AuthProvider:load', { silent: true })
      setSessionError(true)
      setLoading(false)
    }
  }, [router])

  // Keep the ref in sync with the latest `load` function without triggering
  // a re-render. useLayoutEffect runs synchronously after DOM mutations, so
  // the ref is always up-to-date before any async callbacks fire.
  // (Updating refs during render is disallowed by react-hooks/refs.)
  useEffect(() => {
    loadRef.current = load
  })

  // Initial load — covers page refresh / direct navigation with existing session.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() is async; setState is only called after await, never synchronously
    void load()
  }, [load])

  // Reactive auth listener — Supabase fires SIGNED_IN once the session is
  // confirmed (after signInWithPassword OR after restoring from storage).
  // This is the authoritative signal that /api/me will succeed, so we reset
  // any stale error and reload.
  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Session is confirmed — wipe any error that appeared before it was ready
        setSessionError(false)
        retryCount.current = 0
        void load(false)
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setSessionError(false)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
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
