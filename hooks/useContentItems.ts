import { useCallback, useEffect, useState } from 'react'
import type { ContentPiece } from '@/lib/types'
import { logClientError } from '@/lib/client-errors'

/**
 * Shared `/api/content` fetch with short-lived cache and in-flight dedup.
 *
 * Previous pattern: HomeContent, StatsRow, WeekAgenda (and pipeline / calendar
 * variants) each fetched `/api/content` on mount, causing 3× the round-trip on
 * every home-page visit. Now all consumers share a module-level cache and
 * participate in a single in-flight Promise when multiple mount simultaneously.
 *
 * Cache TTL is 30s: balances freshness (user can re-enter the page and see
 * recent changes) with request de-duplication (typical navigation within
 * the dashboard stays under 30s).
 */

const CACHE_TTL_MS = 30_000

interface CacheEntry {
  items: ContentPiece[]
  ts: number
  inflight: Promise<ContentPiece[]> | null
}

const cache: CacheEntry = {
  items: [],
  ts: 0,
  inflight: null,
}

async function fetchContentItems(): Promise<ContentPiece[]> {
  const now = Date.now()
  if (cache.ts && now - cache.ts < CACHE_TTL_MS) {
    return cache.items
  }
  if (cache.inflight) {
    return cache.inflight
  }
  cache.inflight = fetch('/api/content')
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Error ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`)
      }
      const data = (await res.json()) as { items?: ContentPiece[] }
      return data.items ?? []
    })
    .then((items) => {
      cache.items = items
      cache.ts = Date.now()
      return items
    })
    .finally(() => {
      cache.inflight = null
    })
  return cache.inflight
}

/**
 * Force the next `useContentItems()` call to refetch from the network.
 * Useful after mutations (create / update / delete) to invalidate shared cache.
 */
export function invalidateContentItems(): void {
  cache.items = []
  cache.ts = 0
  cache.inflight = null
}

export interface UseContentItemsResult {
  items: ContentPiece[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useContentItems(): UseContentItemsResult {
  const [items, setItems] = useState<ContentPiece[]>(() => cache.items)
  const [loading, setLoading] = useState<boolean>(
    () => !cache.ts || Date.now() - cache.ts >= CACHE_TTL_MS,
  )
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    invalidateContentItems()
    setLoading(true)
    setError(null)
    try {
      const result = await fetchContentItems()
      setItems(result)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      logClientError(e, 'useContentItems:refetch', { silent: true })
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchContentItems()
      .then((result) => {
        if (cancelled) return
        setItems(result)
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        const e = err instanceof Error ? err : new Error(String(err))
        logClientError(e, 'useContentItems:fetch', { silent: true })
        setError(e)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { items, loading, error, refetch }
}
