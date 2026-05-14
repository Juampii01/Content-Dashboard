'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface YouTubeChannelSummary {
  connected: boolean
  channel?: {
    id: string
    name: string
    avatarUrl: string | null
    connectedAt: string
    needsReconnect: boolean
  }
  snapshot?: {
    date: string
    subscribers: number
    totalViews: number
    videoCount: number
  } | null
  videosCount?: number
}

export interface YouTubeVideoRow {
  id: string
  videoId: string
  title: string
  description: string
  thumbnailUrl: string | null
  url: string
  durationSec: number
  durationLabel: string
  viewsCount: number
  likesCount: number
  commentsCount: number
  favoriteCount: number
  watchTimeMinutes: number | null
  averageViewDuration: number | null
  averageViewPercent: number | null
  ctr: number | null
  publishedAt: string | null
  syncedAt: string
}

export interface YouTubeSnapshotPoint {
  date: string
  subscribers: number
  totalViews: number
  videoCount: number
}

// Swallows AbortError on unmount so hooks don't log/toast on cancelled fetches.
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useYouTubeChannelSummary() {
  const [data, setData] = useState<YouTubeChannelSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch('/api/youtube/channel-summary', { signal: controller.signal })
      if (controller.signal.aborted) return
      if (res.ok) {
        setData((await res.json()) as YouTubeChannelSummary)
      } else {
        setData({ connected: false })
      }
    } catch (err) {
      if (isAbortError(err)) return
      setData({ connected: false })
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

/**
 * Cursor-paginated reader of /api/youtube/videos.
 * `loadMore()` appends the next page; `refresh()` resets and reloads.
 */
export function useYouTubeVideos(options: UseVideosOptions = {}) {
  const { enabled = true, pageSize = 25 } = options
  const [videos, setVideos] = useState<YouTubeVideoRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(enabled)
  const [loadingMore, setLoadingMore] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (
      nextCursor: string | null,
      signal: AbortSignal,
    ): Promise<{ items: YouTubeVideoRow[]; nextCursor: string | null } | null> => {
      const params = new URLSearchParams({ limit: String(pageSize) })
      if (nextCursor) params.set('cursor', nextCursor)
      const res = await fetch(`/api/youtube/videos?${params.toString()}`, { signal })
      if (!res.ok) return null
      return (await res.json()) as { items: YouTubeVideoRow[]; nextCursor: string | null }
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
      // keep previous state
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
      // ignore
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

  return { videos, loading, loadingMore, hasMore, refresh, loadMore }
}

export function useYouTubeSnapshots(enabled: boolean, limit = 90) {
  const [snapshots, setSnapshots] = useState<YouTubeSnapshotPoint[]>([])
  const [loading, setLoading] = useState(enabled)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch(`/api/youtube/snapshots?limit=${limit}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (res.ok) {
        const json = (await res.json()) as { items: YouTubeSnapshotPoint[] }
        setSnapshots(json.items)
      }
    } catch (err) {
      if (isAbortError(err)) return
      // keep previous
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [enabled, limit])

  useEffect(() => {
    if (enabled) {
      void refresh()
    } else {
      setSnapshots([])
      setLoading(false)
    }
    return () => {
      abortRef.current?.abort()
    }
  }, [enabled, refresh])

  return { snapshots, loading, refresh }
}

export interface YouTubeDemographicsData {
  available: boolean
  ageGroups: Array<{ range: string; percent: number }>
  gender: Array<{ label: string; percent: number }>
  topCountries: Array<{ country: string; percent: number }>
}

export function useYouTubeDemographics(enabled: boolean) {
  const [data, setData] = useState<YouTubeDemographicsData | null>(null)
  const [loading, setLoading] = useState(enabled)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch('/api/youtube/demographics', { signal: controller.signal })
      if (controller.signal.aborted) return
      if (res.ok) {
        setData((await res.json()) as YouTubeDemographicsData)
      } else {
        setData({ available: false, ageGroups: [], gender: [], topCountries: [] })
      }
    } catch (err) {
      if (isAbortError(err)) return
      setData({ available: false, ageGroups: [], gender: [], topCountries: [] })
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      void refresh()
    } else {
      setData(null)
      setLoading(false)
    }
    return () => {
      abortRef.current?.abort()
    }
  }, [enabled, refresh])

  return { data, loading, refresh }
}

export async function triggerYouTubeSync(): Promise<boolean> {
  try {
    const res = await fetch('/api/youtube/sync', { method: 'POST' })
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      message?: string
      reconnect?: boolean
      synced?: { videos: number }
    }
    if (res.ok && json.ok) {
      toast.success(`YouTube sincronizado (${json.synced?.videos ?? 0} videos).`)
      return true
    }
    if (json.reconnect) {
      toast.error(json.message ?? 'Reconecta YouTube para continuar.')
      return false
    }
    toast.error(json.message ?? 'Fallo al sincronizar YouTube.')
    return false
  } catch {
    toast.error('Error de red al sincronizar YouTube.')
    return false
  }
}
