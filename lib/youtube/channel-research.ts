/**
 * YouTube channel research helper.
 *
 * Resolves a channel URL → channelId + metadata, then fetches the top videos
 * by views in a timeframe via the YouTube Data v3 API.
 *
 * Requires `YOUTUBE_API_KEY`. If the env var is missing, the helpers throw a
 * descriptive error so the caller can return a 503 to the UI.
 *
 * Adapted from Smart-Scale's `app/api/content-research/route.ts`.
 */

const YT_BASE = 'https://www.googleapis.com/youtube/v3'

export interface YouTubeChannelInfo {
  channelId: string
  channelName: string
  channelAvatar: string | null
  channelUrl: string
}

export interface YouTubeVideoSummary {
  videoId: string
  title: string
  description: string
  thumbnail: string | null
  videoUrl: string
  views: number
  likes: number
  comments: number
  duration: string
  publishedAt: string | null
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY no configurado')
  return key
}

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return '—'
  const h = m[1] ? `${m[1]}:` : ''
  const min = (m[2] ?? '0').padStart(h ? 2 : 1, '0')
  const sec = (m[3] ?? '0').padStart(2, '0')
  return `${h}${min}:${sec}`
}

function extractChannelIdFromHtml(html: string): string {
  const patterns = [
    /https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{20,})/i,
    /"channelId":"(UC[\w-]{20,})"/i,
    /itemprop="identifier" content="(UC[\w-]{20,})"/i,
    /browseId":"(UC[\w-]{20,})"/i,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) return m[1]
  }
  return ''
}

async function resolveFromPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'es,en;q=0.9' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return ''
    return extractChannelIdFromHtml(await res.text())
  } catch {
    return ''
  }
}

export async function resolveYouTubeChannel(url: string): Promise<YouTubeChannelInfo> {
  const key = getApiKey()
  const channelMatch = url.match(/channel\/([^/?&]+)/)
  const handleMatch = url.match(/@([^/?&]+)/)
  const userMatch = url.match(/user\/([^/?&]+)/)
  const customMatch = url.match(/youtube\.com\/c\/([^/?&]+)/)

  let channelId = channelMatch?.[1] ?? ''
  if (!channelId && (handleMatch || userMatch || customMatch)) {
    channelId = await resolveFromPage(url)
  }
  if (!channelId) {
    const query =
      handleMatch ? `@${handleMatch[1]}` :
      userMatch ? userMatch[1] :
      customMatch ? customMatch[1] :
      url
    const res = await fetch(
      `${YT_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=5&key=${key}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) throw new Error(`YouTube search failed (${res.status})`)
    const data = (await res.json()) as { items?: Array<{ snippet?: { channelId?: string; customUrl?: string }; id?: { channelId?: string } }> }
    const items = data.items ?? []
    const matched = items.find((it) => {
      const handle = it.snippet?.customUrl?.replace(/^@/, '').toLowerCase()
      return handleMatch ? handle === handleMatch[1].toLowerCase() : true
    })
    channelId = matched?.snippet?.channelId ?? items[0]?.snippet?.channelId ?? items[0]?.id?.channelId ?? ''
  }
  if (!channelId) throw new Error('No se pudo resolver el canal de YouTube. Verificá la URL.')

  const chRes = await fetch(
    `${YT_BASE}/channels?part=snippet&id=${channelId}&key=${key}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!chRes.ok) throw new Error(`YouTube channel lookup failed (${chRes.status})`)
  const chData = (await chRes.json()) as { items?: Array<{ snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } }> }
  const ch = chData.items?.[0]
  return {
    channelId,
    channelName: ch?.snippet?.title ?? 'Canal',
    channelAvatar: ch?.snippet?.thumbnails?.default?.url ?? null,
    channelUrl: `https://www.youtube.com/channel/${channelId}`,
  }
}

export async function getTopYouTubeVideos(
  channelId: string,
  timeframeDays: number,
): Promise<YouTubeVideoSummary[]> {
  const key = getApiKey()
  const publishedAfter = new Date(Date.now() - timeframeDays * 86_400_000).toISOString()

  async function searchIds(opts: { publishedAfter?: string; maxResults: number }): Promise<string[]> {
    const url =
      `${YT_BASE}/search?part=snippet&channelId=${channelId}&type=video` +
      `&order=date&maxResults=${opts.maxResults}` +
      (opts.publishedAfter ? `&publishedAfter=${encodeURIComponent(opts.publishedAfter)}` : '') +
      `&key=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`YouTube search failed (${res.status})`)
    const data = (await res.json()) as { items?: Array<{ id?: { videoId?: string } }> }
    return (data.items ?? []).map((v) => v.id?.videoId ?? '').filter(Boolean)
  }

  let videoIds = await searchIds({ publishedAfter, maxResults: 50 })
  let usedFallback = false
  if (!videoIds.length) {
    videoIds = await searchIds({ maxResults: 15 })
    usedFallback = true
  }
  if (!videoIds.length) return []

  const statsRes = await fetch(
    `${YT_BASE}/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(',')}&key=${key}`,
    { signal: AbortSignal.timeout(15_000) },
  )
  if (!statsRes.ok) throw new Error(`YouTube stats failed (${statsRes.status})`)
  const statsData = (await statsRes.json()) as {
    items?: Array<{
      id?: string
      snippet?: {
        title?: string
        description?: string
        publishedAt?: string
        thumbnails?: {
          default?: { url?: string }
          medium?: { url?: string }
          high?: { url?: string }
        }
      }
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
      contentDetails?: { duration?: string }
    }>
  }

  const cutoff = new Date(Date.now() - timeframeDays * 86_400_000)
  let items: YouTubeVideoSummary[] = (statsData.items ?? []).map((v) => ({
    videoId: v.id ?? '',
    title: v.snippet?.title ?? '',
    description: v.snippet?.description ?? '',
    thumbnail:
      v.snippet?.thumbnails?.high?.url ??
      v.snippet?.thumbnails?.medium?.url ??
      v.snippet?.thumbnails?.default?.url ??
      null,
    videoUrl: `https://www.youtube.com/watch?v=${v.id ?? ''}`,
    views: Number(v.statistics?.viewCount ?? 0),
    likes: Number(v.statistics?.likeCount ?? 0),
    comments: Number(v.statistics?.commentCount ?? 0),
    duration: parseDuration(v.contentDetails?.duration ?? ''),
    publishedAt: v.snippet?.publishedAt ?? null,
  }))
  if (!usedFallback) {
    items = items.filter((it) => (it.publishedAt ? new Date(it.publishedAt) >= cutoff : true))
  }
  return items.sort((a, b) => b.views - a.views).slice(0, 5)
}

export function isYouTubeChannelUrl(url: string): boolean {
  return /youtube\.com\/(channel\/|@|user\/|c\/)/i.test(url) || /youtu\.be\//i.test(url)
}
