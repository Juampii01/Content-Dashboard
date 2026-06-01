'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// Swallows AbortError on unmount so hooks don't log/toast on cancelled fetches.
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

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
 * Uses AbortController so only the latest in-flight refresh commits its
 * result to state — concurrent calls and unmounts abort previous fetches
 * instead of causing a flash-then-disappear or state updates on dead components.
 */
export function useInstagramData(): UseInstagramDataReturn {
  const [summary, setSummary] = useState<InstagramAccountSummary | null>(null)
  const [reels, setReels] = useState<UserReelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const [sumRes, reelsRes] = await Promise.all([
        fetch('/api/instagram/account-summary', { signal: controller.signal }),
        fetch('/api/instagram/reels', { signal: controller.signal }),
      ])

      if (controller.signal.aborted) return

      if (!sumRes.ok || !reelsRes.ok) {
        if (!controller.signal.aborted) {
          const status = !sumRes.ok ? sumRes.status : reelsRes.status
          toast.error(status === 401 ? 'Sesión expirada — vuelve a iniciar sesión' : 'Error al cargar datos de Instagram')
          setLoading(false)
        }
        return
      }

      if (sumRes.ok) {
        setSummary((await sumRes.json()) as InstagramAccountSummary)
      }
      if (reelsRes.ok) {
        const json = (await reelsRes.json()) as { reels?: UserReelRow[] }
        setReels(json.reels ?? [])
      }
      setHasLoaded(true)
    } catch (err) {
      if (isAbortError(err)) return
      setHasLoaded(true)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => {
      abortRef.current?.abort()
    }
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
