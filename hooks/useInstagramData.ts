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
 * Loads Instagram connection summary + UserReel list for the active client.
 *
 * Uses a request counter so only the latest in-flight refresh commits its
 * result to state — concurrent calls from React Strict Mode double-effects
 * are silently discarded instead of causing a flash-then-disappear.
 */
export function useInstagramData(): UseInstagramDataReturn {
  const [summary, setSummary] = useState<InstagramAccountSummary | null>(null)
  const [reels, setReels] = useState<UserReelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Incremented on every refresh() call. If the counter has moved on by the
  // time a fetch resolves, that response is stale and gets discarded.
  const reqRef = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++reqRef.current
    setLoading(true)
    try {
      const [sumRes, reelsRes] = await Promise.all([
        fetch('/api/instagram/account-summary'),
        fetch('/api/instagram/reels'),
      ])

      // Discard if a newer refresh was started while we were fetching
      if (seq !== reqRef.current) return

      if (sumRes.ok) {
        setSummary((await sumRes.json()) as InstagramAccountSummary)
      }
      if (reelsRes.ok) {
        const json = (await reelsRes.json()) as { reels?: UserReelRow[] }
        setReels(json.reels ?? [])
      }
      setHasLoaded(true)
    } catch {
      if (seq === reqRef.current) setHasLoaded(true)
    } finally {
      if (seq === reqRef.current) setLoading(false)
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
        toast.error(
          body.error === 'TOKEN_EXPIRED'
            ? 'Tu conexión con Instagram expiró. Reconéctala para volver a sincronizar.'
            : 'Sesión expirada. Vuelve a iniciar sesión.',
        )
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
      if (res.status === 422) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (body.error === 'PERSONAL_ACCOUNT') {
          toast.error(
            'Tu cuenta de Instagram es personal. Para sincronizar contenido necesitás convertirla a cuenta de Creador o Empresa: Configuración → Tipo de cuenta → Cambiar a cuenta profesional.',
            { duration: 10000 },
          )
        } else {
          toast.error('No pudimos sincronizar Instagram. Inténtalo de nuevo.')
        }
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
      await refresh()
    } catch {
      toast.error('Error de red al sincronizar Instagram.')
    } finally {
      setSyncing(false)
    }
  }, [refresh])

  return { summary, reels, loading, hasLoaded, syncing, sync, refresh }
}
