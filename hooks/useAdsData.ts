'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── useMonthlyInsights ───────────────────────────────────────────────────────

export function useMonthlyInsights() {
  const [data, setData] = useState<{ month: string; spend: number; impressions: number; clicks: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ads/monthly-insights')
      .then(r => r.ok ? r.json() : { months: [] })
      .then((d: { months?: { month: string; spend: number; impressions: number; clicks: number }[] }) => {
        if (!cancelled) { setData(d.months ?? []); setLoading(false) }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { data, loading }
}
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdCampaignRow {
  id: string
  campaignId: string
  name: string
  status: string
  objective: string
  spend: number
  impressions: number
  clicks: number
  reach: number
  ctr: number
  cpc: number
  roas: number
  conversions: number
  datePreset: string
  syncedAt: string
}

export interface AdsAccountSummary {
  connected: boolean
  tokenExpired: boolean
  account: { accountName: string; accountPic: string | null } | null
  stats: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    avgRoas: number
    avgCtr: number
    syncedAt: string | null
  } | null
  campaignsCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

// ─── useAdsAccountSummary ─────────────────────────────────────────────────────

export function useAdsAccountSummary(): {
  data: AdsAccountSummary | null
  loading: boolean
  refresh: () => Promise<void>
} {
  const [data, setData] = useState<AdsAccountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch('/api/ads/account-summary', { signal: controller.signal })
      if (controller.signal.aborted) return
      if (res.ok) {
        setData((await res.json()) as AdsAccountSummary)
      } else {
        setData({ connected: false, tokenExpired: false, account: null, stats: null, campaignsCount: 0 })
      }
    } catch (err) {
      if (isAbortError(err)) return
      setData({ connected: false, tokenExpired: false, account: null, stats: null, campaignsCount: 0 })
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => { abortRef.current?.abort() }
  }, [refresh])

  return { data, loading, refresh }
}

// ─── useAdCampaigns ───────────────────────────────────────────────────────────

export function useAdCampaigns(enabled = true): {
  campaigns: AdCampaignRow[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
} {
  const [campaigns, setCampaigns] = useState<AdCampaignRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(enabled)
  const [loadingMore, setLoadingMore] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(async (
    nextCursor: string | null,
    signal: AbortSignal,
  ): Promise<{ items: AdCampaignRow[]; nextCursor: string | null } | null> => {
    const params = new URLSearchParams({ platform: 'meta', limit: '50' })
    if (nextCursor) params.set('cursor', nextCursor)
    const res = await fetch(`/api/ads/campaigns?${params.toString()}`, { signal })
    if (!res.ok) return null
    return (await res.json()) as { items: AdCampaignRow[]; nextCursor: string | null }
  }, [])

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
        setCampaigns(page.items)
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
        setCampaigns((prev) => [...prev, ...page.items])
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
      setCampaigns([])
      setCursor(null)
      setHasMore(false)
      setLoading(false)
    }
    return () => { abortRef.current?.abort() }
  }, [enabled, refresh])

  return { campaigns, loading, loadingMore, hasMore, loadMore }
}

// ─── triggerAdsSync ───────────────────────────────────────────────────────────

export async function triggerAdsSync(): Promise<boolean> {
  try {
    const res = await fetch('/api/ads/sync', { method: 'POST' })
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      message?: string
      reconnect?: boolean
      synced?: { accounts: number; campaigns: number }
      warning?: string
    }
    if (res.ok && json.ok) {
      if (json.warning === 'NO_AD_ACCOUNTS') {
        toast.warning('Conectado, pero no se encontraron cuentas publicitarias en este perfil de Meta.')
      } else {
        toast.success(`Ads sincronizado — ${json.synced?.campaigns ?? 0} campañas de ${json.synced?.accounts ?? 0} cuenta(s).`)
      }
      return true
    }
    if (json.reconnect) {
      toast.error(json.message ?? 'Reconecta Meta Ads para continuar.')
      return false
    }
    toast.error(json.message ?? 'Fallo al sincronizar Ads.')
    return false
  } catch {
    toast.error('Error de red al sincronizar Ads.')
    return false
  }
}
