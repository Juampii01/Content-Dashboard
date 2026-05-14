'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export interface InstagramAccountSummary {
  connected: boolean
  accountName?: string
  accountPic?: string | null
  expiresAt?: string | null
  tokenExpired?: boolean
  latestSnapshot?: {
    date: string
    followers: number
    posts: number
    impressions: number
    reach: number
    profileVisits: number
    newFollowers: number
    engagementRate: number
  } | null
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
  durationSec: number | null
  viewsOrganic: number
  viewsPaid: number
  savesCount: number
  sharesCount: number
  reachCount: number
  impressions: number
  organicPercent: number
  multiplier: number
  isAd: boolean
  isTrialReel: boolean
  publishedAt: string | null
  syncedAt: string
}

export interface StoryRow {
  id: string
  thumbnailUrl: string | null
  reach: number
  impressions: number
  replies: number
  stickerTaps: number
  exits: number
  completionRate: number
  publishedAt: string | null
  syncedAt: string
}

interface UseInstagramDataReturn {
  summary: InstagramAccountSummary | null
  reels: UserReelRow[]
  stories: StoryRow[]
  loading: boolean
  syncing: boolean
  sync: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Loads the active client's Instagram connection summary + UserReel list,
 * and exposes a `sync()` trigger that hits `/api/instagram/sync` then refreshes.
 */
export function useInstagramData(): UseInstagramDataReturn {
  const [summary, setSummary] = useState<InstagramAccountSummary | null>(null)
  const [reels, setReels] = useState<UserReelRow[]>([])
  const [stories, setStories] = useState<StoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, reelsRes, storiesRes] = await Promise.all([
        fetch('/api/instagram/account-summary'),
        fetch('/api/instagram/reels'),
        fetch('/api/instagram/stories'),
      ])
      if (sumRes.ok) {
        setSummary((await sumRes.json()) as InstagramAccountSummary)
      }
      if (reelsRes.ok) {
        const json = (await reelsRes.json()) as { reels?: UserReelRow[] }
        setReels(json.reels ?? [])
      } else {
        setReels([])
      }
      if (storiesRes.ok) {
        const json = (await storiesRes.json()) as { stories?: StoryRow[] }
        setStories(json.stories ?? [])
      } else {
        setStories([])
      }
    } catch {
      // keep previous state
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
      const data = (await res.json()) as { synced?: { reels: number; snapshot: boolean } }
      toast.success(`Sincronizados ${data.synced?.reels ?? 0} reels de Instagram.`)
      await refresh()
    } catch {
      toast.error('Error de red al sincronizar Instagram.')
    } finally {
      setSyncing(false)
    }
  }, [refresh])

  return { summary, reels, stories, loading, syncing, sync, refresh }
}
