'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface TikTokVideoRow {
  id: string
  videoId: string
  title: string
  description: string
  coverUrl: string | null
  shareUrl: string
  durationSec: number
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  publishedAt: string | null
  syncedAt: string
}

export interface TikTokAccountSummary {
  connected: boolean
  tokenExpired: boolean
  account: { accountName: string; accountPic: string | null } | null
  latestSnapshot: {
    followers: number
    following: number
    posts: number
    totalViews: number
    engagementRate: number
    date: string
  } | null
  videosCount: number
}

// Swallows AbortError on unmount so hooks don't log/toast on cancelled fetches.
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useTikTokChannelSummary(): {
  data: TikTokAccountSummary | null
  loading: boolean
  refresh: () => Promise<void>
} {
  const [data, setData] = useState<TikTokAccountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch('/api/tiktok/account-summary', { signal: controller.signal })
      if (controller.signal.aborted) return
      if (res.ok) {
        setData((await res.json()) as TikTokAccountSummary)
      } else {
        setData({ connected: false, tokenExpired: false, account: null, latestSnapshot: null, videosCount: 0 })
      }
    } catch (err) {
      if (isAbortError(err)) return
      setData({ connected: false, tokenExpired: false, account: null, latestSnapshot: null, videosCount: 0 })
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

  return { data, loading, refresh }
}

interface UseVideosOptions {
  enabled?: boolean
  pageSize?: number
}

export function useTikTokVideos(options: UseVideosOptions = {}): {
  videos: TikTokVideoRow[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
} {
  const { enabled = true, pageSize = 25 } = options
  const [videos, setVideos] = useState<TikTokVideoRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(enabled)
  const [loadingMore, setLoadingMore] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (
      nextCursor: string | null,
      signal: AbortSignal,
    ): Promise<{ items: TikTokVideoRow[]; nextCursor: string | null } | null> => {
      const params = new URLSearchParams({ limit: String(pageSize) })
      if (nextCursor) params.set('cursor', nextCursor)
      const res = await fetch(`/api/tiktok/videos?${params.toString()}`, { signal })
      if (!res.ok) return null
      return (await res.json()) as { items: TikTokVideoRow[]; nextCursor: string | null }
    },
    [pageSize],
  )

  const refresh = useCallback(async () => {
    if (!enabled) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const page = await fetchPage(null, controller.signal)
      if (controller.signal.aborted) return
      if (page) {
        setVideos(page.items)
        setCursor(page.nextCursor)
        setHasMore(Boolean(page.nextCursor))
      }
    } catch (err) {
      if (isAbortError(err)) return
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [enabled, fetchPage])

  const loadMore = useCallback(async () => {
    if (!enabled || !cursor || loadingMore) return
    const controller = new AbortController()
    abortRef.current = controller
    setLoadingMore(true)
    try {
      const page = await fetchPage(cursor, controller.signal)
      if (controller.signal.aborted) return
      if (page) {
        setVideos((prev) => [...prev, ...page.items])
        setCursor(page.nextCursor)
        setHasMore(Boolean(page.nextCursor))
      }
    } catch (err) {
      if (isAbortError(err)) return
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }, [enabled, cursor, loadingMore, fetchPage])

  useEffect(() => {
    if (enabled) {
      void refresh()
    } else {
      setVideos([])
      setCursor(null)
      setHasMore(false)
      setLoading(false)
    }
    return () => {
      abortRef.current?.abort()
    }
  }, [enabled, refresh])

  return { videos, loading, loadingMore, hasMore, loadMore, refresh }
}

export async function triggerTikTokSync(): Promise<boolean> {
  try {
    const res = await fetch('/api/tiktok/sync', { method: 'POST' })
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      message?: string
      reconnect?: boolean
      synced?: { videos: number }
    }
    if (res.ok && json.ok) {
      toast.success(`TikTok sincronizado (${json.synced?.videos ?? 0} videos).`)
      return true
    }
    if (json.reconnect) {
      toast.error(json.message ?? 'Reconecta TikTok para continuar.')
      return false
    }
    toast.error(json.message ?? 'Fallo al sincronizar TikTok.')
    return false
  } catch {
    toast.error('Error de red al sincronizar TikTok.')
    return false
  }
}
