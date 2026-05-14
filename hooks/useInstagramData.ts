'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface InstagramAccountSummary {
  connected: boolean
  accountName?: string
  accountPic?: string | null
  expiresAt?: string | null
  tokenExpired?: boolean
  latestSnapshot?: { date: string; followers: number; posts: number } | null
  reelCount?: number
}

export interface UserReelRow {
  id: string
  instagramId: string
  shortcode: string
  url: string
  thumbnailUrl: string | null
  videoUrl: string | null
  caption: string | null
  likesCount: number
  commentsCount: number
  viewsCount: number
  publishedAt: string | null
  syncedAt: string
}

interface UseInstagramDataReturn {
  summary: InstagramAccountSummary | null
  reels: UserReelRow[]
  loading: boolean
  hasLoaded: boolean
  syncing: boolean
  sync: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Loads the active client's Instagram connection summary + UserReel list.
 *
 * Once real data is loaded it is never cleared by a failed re-fetch — the hook
 * tracks the "last known good" state and only updates it when new valid data
 * arrives. This prevents the flash-then-disappear pattern caused by Strict Mode
 * double-effects or transient network errors.
 */
export function useInstagramData(): UseInstagramDataReturn {
  const [summary, setSummary] = useState<InstagramAccountSummary | null>(null)
  const [reels, setReels] = useState<UserReelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Track whether we already have valid data so subsequent refreshes never
  // blank out the UI even if they return an empty or error response.
  const hasGoodDataRef = useRef(false)

  const refresh = useCallback(async () => {
    // Only show the full loading spinner on the very first load.
    // After that, re-fetches run silently in the background.
    if (!hasGoodDataRef.current) setLoading(true)
    try {
      const [sumRes, reelsRes] = await Promise.all([
        fetch('/api/instagram/account-summary'),
        fetch('/api/instagram/reels'),
      ])

      const newSummary: InstagramAccountSummary | null = sumRes.ok
        ? ((await sumRes.json()) as InstagramAccountSummary)
        : null

      const newReels: UserReelRow[] = reelsRes.ok
        ? (((await reelsRes.json()) as { reels?: UserReelRow[] }).reels ?? [])
        : []

      // Only commit the new data if it represents a connected state with reels,
      // OR if we have never loaded before (first load always wins).
      const isConnected = newSummary?.connected && !newSummary?.tokenExpired
      const hasNewReels = newReels.length > 0

      if (!hasGoodDataRef.current || isConnected) {
        if (newSummary !== null) setSummary(newSummary)
      }

      if (!hasGoodDataRef.current || hasNewReels) {
        setReels(newReels)
      }

      if (isConnected && hasNewReels) {
        hasGoodDataRef.current = true
      }

      setHasLoaded(true)
    } catch {
      // Network error — keep whatever state we have
      setHasLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/instagram/sync', { method: 'POST' })
      if (res.status === 401) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (body.error === 'TOKEN_EXPIRED') {
          toast.error('Tu conexión con Instagram expiró. Reconéctala para volver a sincronizar.')
        } else {
          toast.error('Sesión expirada. Vuelve a iniciar sesión.')
        }
        return
      }
      if (res.status === 404) {
        toast.error('No hay una cuenta de Instagram conectada para este cliente.')
        return
      }
      if (res.status === 429) {
        toast.error('Instagram está limitando las peticiones. Intenta en unos minutos.')
        return
      }
      if (!res.ok) {
        toast.error('No pudimos sincronizar Instagram. Inténtalo de nuevo.')
        return
      }
      const data = (await res.json()) as { synced?: { reels: number; snapshot: boolean }; warning?: string }
      if (data.warning === 'NO_MEDIA_RETURNED') {
        toast.warning(
          'Instagram no devolvió publicaciones. Asegúrate de que tu cuenta sea de tipo Creador o Empresa (Configuración → Tipo de cuenta → Cambiar a cuenta profesional).',
          { duration: 8000 },
        )
      } else {
        toast.success(`Sincronizados ${data.synced?.reels ?? 0} reels de Instagram.`)
      }
      // After sync, force a clean reload — bypass the "good data" guard so
      // we always pick up freshly synced reels.
      hasGoodDataRef.current = false
      await refresh()
    } catch {
      toast.error('Error de red al sincronizar Instagram.')
    } finally {
      setSyncing(false)
    }
  }, [refresh])

  return { summary, reels, loading, hasLoaded, syncing, sync, refresh }
}
