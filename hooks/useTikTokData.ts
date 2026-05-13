'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export interface TikTokAccountSummary {
  connected: boolean
  reason?: 'NO_SESSION' | 'NO_ACTIVE_CLIENT' | 'NOT_CONNECTED'
  accountName?: string
  accountPic?: string | null
  videoCount?: number
}

export interface TikTokVideoRow {
  id: string
  tiktokId: string
  shortcode: string | null
  url: string
  thumbnailUrl: string | null
  videoUrl: string | null
  caption: string | null
  durationSec: number | null
  viewsCount: number
  likesCount: number
  commentsCount: number
  sharesCount: number
  publishedAt: string | null
  syncedAt: string
}

interface UseTikTokDataReturn {
  summary: TikTokAccountSummary | null
  videos: TikTokVideoRow[]
  loading: boolean
  syncing: boolean
  hasMore: boolean
  loadingMore: boolean
  sync: () => Promise<void>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

export function useTikTokData(): UseTikTokDataReturn {
  const [summary, setSummary] = useState<TikTokAccountSummary | null>(null)
  const [videos, setVideos] = useState<TikTokVideoRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, vidRes] = await Promise.all([
        fetch('/api/tiktok/account-summary'),
        fetch('/api/tiktok/videos'),
      ])

      if (sumRes.ok) {
        setSummary((await sumRes.json()) as TikTokAccountSummary)
      } else if (sumRes.status !== 401) {
        toast.error('No pudimos cargar el estado de TikTok.')
      }

      if (vidRes.ok) {
        const json = (await vidRes.json()) as { videos?: TikTokVideoRow[]; nextCursor?: string | null }
        setVideos(json.videos ?? [])
        setNextCursor(json.nextCursor ?? null)
      } else if (vidRes.status === 403) {
        setVideos([])
        setNextCursor(null)
      } else if (vidRes.status !== 401) {
        toast.error('No pudimos cargar tus videos de TikTok.')
        setVideos([])
        setNextCursor(null)
      }
    } catch {
      toast.error('Error de red cargando TikTok.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/tiktok/videos?cursor=${encodeURIComponent(nextCursor)}`)
      if (!res.ok) {
        if (res.status !== 401) toast.error('No pudimos traer más videos.')
        return
      }
      const json = (await res.json()) as { videos?: TikTokVideoRow[]; nextCursor?: string | null }
      setVideos((prev) => [...prev, ...(json.videos ?? [])])
      setNextCursor(json.nextCursor ?? null)
    } catch {
      toast.error('Error de red cargando más videos.')
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/tiktok/sync', { method: 'POST' })
      if (res.status === 404) {
        toast.error('Conectá una cuenta de TikTok primero.')
        return
      }
      if (res.status === 429) {
        toast.error('Esperá un minuto antes de re-sincronizar.')
        return
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
        toast.error(data?.detail ? `TikTok: ${data.detail}` : 'No pudimos sincronizar TikTok.')
        return
      }
      const data = (await res.json()) as { synced?: { videos: number } }
      toast.success(`Sincronizados ${data.synced?.videos ?? 0} videos de TikTok.`)
      await refresh()
    } catch {
      toast.error('Error de red al sincronizar TikTok.')
    } finally {
      setSyncing(false)
    }
  }, [refresh])

  return {
    summary,
    videos,
    loading,
    syncing,
    hasMore: nextCursor !== null,
    loadingMore,
    sync,
    refresh,
    loadMore,
  }
}
