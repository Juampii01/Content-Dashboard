/**
 * Instagram Content Publishing API client (Graph v23.0, graph.instagram.com).
 *
 * IMPORTANT: every container/publish call targets `/me/...` — NOT `/{ig-user-id}/...`.
 * The graph.instagram.com host resolves `me` from the access token; using the
 * numeric id here returns "Tried accessing nonexisting field" / permission errors.
 *
 * All functions return a discriminated IGResult so callers can map error codes
 * (190 = token, 4/17/32 = rate limit, 9007 = media not ready, 24 = bad media, …).
 */

const IG_GRAPH = 'https://graph.instagram.com/v23.0'

export type IGResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: number; subcode: number | null; message: string }

interface IGError {
  error: { message: string; type: string; code: number; error_subcode?: number }
}

async function igPost<T>(path: string, params: URLSearchParams): Promise<IGResult<T>> {
  try {
    const res = await fetch(`${IG_GRAPH}${path}`, { method: 'POST', body: params, signal: AbortSignal.timeout(15_000) })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const e = (json as IGError | null)?.error
      const message = e?.message ?? `HTTP ${res.status}`
      console.error(`[ig/client] POST ${path} → ${res.status}`, message)
      return { ok: false, status: res.status, code: e?.code ?? 0, subcode: e?.error_subcode ?? null, message }
    }
    return { ok: true, data: json as T }
  } catch (e) {
    console.error(`[ig/client] POST ${path} threw`, e)
    return { ok: false, status: 0, code: 0, subcode: null, message: String(e) }
  }
}

async function igGet<T>(path: string): Promise<IGResult<T>> {
  try {
    const res = await fetch(`${IG_GRAPH}${path}`, { signal: AbortSignal.timeout(10_000) })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const e = (json as IGError | null)?.error
      return { ok: false, status: res.status, code: e?.code ?? 0, subcode: e?.error_subcode ?? null, message: e?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, data: json as T }
  } catch (e) {
    return { ok: false, status: 0, code: 0, subcode: null, message: String(e) }
  }
}

// ─── Insights por media ─────────────────────────────────────────────────────

export interface MediaInsights {
  views?: number
  reach?: number
  total_interactions?: number
  saved?: number
  shares?: number
}

/**
 * Insights por media (v22+): `views` reemplaza a impressions/plays/video_views.
 * El campo `views` de /me/media vuelve null, así que las views reales salen de acá.
 * Si el set combinado falla, reintenta métrica por métrica y loguea el error crudo.
 */
export async function getMediaInsights(mediaId: string, mediaType: string, token: string): Promise<MediaInsights> {
  const isVideo = mediaType === 'REEL' || mediaType === 'REELS' || mediaType === 'VIDEO'
  const metrics = isVideo ? ['views', 'reach', 'total_interactions', 'saved', 'shares'] : ['views', 'reach']

  async function fetchMetrics(ms: string[]): Promise<Record<string, number> | null> {
    const res = await igGet<{ data?: Array<{ name: string; values?: Array<{ value: number }>; total_value?: { value: number } }> }>(
      `/${mediaId}/insights?metric=${ms.join(',')}&access_token=${encodeURIComponent(token)}`,
    )
    if (!res.ok) {
      console.error(`[ig/client] getMediaInsights ${mediaId} [${ms.join(',')}] → ${res.status} (code ${res.code}): ${res.message}`)
      return null
    }
    const out: Record<string, number> = {}
    for (const item of res.data?.data ?? []) {
      out[item.name] = item.total_value?.value ?? item.values?.[0]?.value ?? 0
    }
    return out
  }

  const result: MediaInsights = {}
  const apply = (v: Record<string, number>) => {
    if ('views' in v) result.views = v.views
    if ('reach' in v) result.reach = v.reach
    if ('total_interactions' in v) result.total_interactions = v.total_interactions
    if ('saved' in v) result.saved = v.saved
    if ('shares' in v) result.shares = v.shares
  }

  const combined = await fetchMetrics(metrics)
  if (combined) {
    apply(combined)
    return result
  }
  // El set combinado falló → fallback métrica por métrica.
  for (const m of metrics) {
    const single = await fetchMetrics([m])
    if (single) apply(single)
  }
  return result
}

// ─── Containers ────────────────────────────────────────────────────────────

export function createImageContainer(token: string, imageUrl: string, caption: string) {
  return igPost<{ id: string }>('/me/media', new URLSearchParams({ image_url: imageUrl, caption, access_token: token }))
}

export function createReelContainer(token: string, videoUrl: string, caption: string) {
  return igPost<{ id: string }>('/me/media', new URLSearchParams({
    media_type: 'REELS', video_url: videoUrl, share_to_feed: 'true', caption, access_token: token,
  }))
}

/** Carousel child — image. Note `is_carousel_item`, NO caption on items. */
export function createCarouselImageItem(token: string, imageUrl: string) {
  return igPost<{ id: string }>('/me/media', new URLSearchParams({ image_url: imageUrl, is_carousel_item: 'true', access_token: token }))
}

/** Carousel child — video. media_type=VIDEO (NOT REELS) for carousel items. */
export function createCarouselVideoItem(token: string, videoUrl: string) {
  return igPost<{ id: string }>('/me/media', new URLSearchParams({
    media_type: 'VIDEO', video_url: videoUrl, is_carousel_item: 'true', access_token: token,
  }))
}

export function createCarouselContainer(token: string, childrenIds: string[], caption: string) {
  return igPost<{ id: string }>('/me/media', new URLSearchParams({
    media_type: 'CAROUSEL', children: childrenIds.join(','), caption, access_token: token,
  }))
}

export function getContainerStatus(token: string, containerId: string) {
  return igGet<{ status_code: string }>(`/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`)
}

export function publishContainer(token: string, creationId: string) {
  return igPost<{ id: string }>('/me/media_publish', new URLSearchParams({ creation_id: creationId, access_token: token }))
}

export async function getPermalink(token: string, mediaId: string): Promise<string | null> {
  const r = await igGet<{ permalink?: string }>(`/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`)
  return r.ok ? (r.data.permalink ?? null) : null
}

// ─── Rate limit (real, from Meta) ────────────────────────────────────────────

/** GET /me/content_publishing_limit → { quota_usage, quota_total } (hard cap ~100/24h). */
export async function getContentPublishingLimit(token: string): Promise<{ quota_usage: number; quota_total: number } | null> {
  const r = await igGet<{ data?: Array<{ quota_usage?: number; config?: { quota_total?: number } }> }>(
    `/me/content_publishing_limit?fields=config,quota_usage&access_token=${encodeURIComponent(token)}`,
  )
  if (!r.ok) return null
  const row = r.data.data?.[0]
  if (!row) return null
  return { quota_usage: row.quota_usage ?? 0, quota_total: row.config?.quota_total ?? 100 }
}
