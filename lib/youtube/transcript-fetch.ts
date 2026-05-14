/**
 * YouTube transcript fetcher — caption-track scrape with optional Apify fallback.
 *
 * Strategy (matches Smart-Scale's `getYouTubeTranscript` flow):
 *   1. If APIFY_API_TOKEN is set, try the `automation-lab~youtube-transcript`
 *      actor which handles login walls + age-restricted videos better.
 *   2. Fall back to scraping `youtube.com/watch?v=`, extracting
 *      `ytInitialPlayerResponse`, picking a caption track (preferring English)
 *      and parsing its srv3 XML.
 *
 * No YouTube Data API key required for transcript — only for metadata
 * (see `getYouTubeMetadata`, which is optional).
 */

export interface YouTubeTranscriptResult {
  transcript: string | null
  /** 'watch_page' | null when failed. */
  provider: 'watch_page' | null
  /** Hint for the caller — e.g. 'no_captions_found', 'consent_wall'. */
  reason?: string
}

export interface YouTubeMetadata {
  title: string | null
  creator: string | null
  thumbnail: string | null
  duration: string | null
}

// ─── URL → videoId ───────────────────────────────────────────────────────────

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  /youtube\.com\/shorts\/([^&\n?#]+)/,
]

export function extractYouTubeId(url: string): string | null {
  for (const p of YT_PATTERNS) {
    const m = url.match(p)
    if (m) return m[1] ?? null
  }
  return null
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url)
}

// ─── Caption XML parsing ─────────────────────────────────────────────────────

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function stripXmlTags(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCaptionXml(xml: string): string | null {
  const textMatches = [...xml.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)]
  if (textMatches.length) {
    const text = textMatches
      .map((m) => stripXmlTags(m[1] ?? ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text || null
  }

  const paragraphMatches = [...xml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  if (paragraphMatches.length) {
    const text = paragraphMatches
      .map((m) => {
        const inner = m[1] ?? ''
        const segs = [...inner.matchAll(/<s\b[^>]*>([\s\S]*?)<\/s>/gi)]
        if (segs.length) {
          return segs
            .map((s) => stripXmlTags(s[1] ?? ''))
            .filter(Boolean)
            .join(' ')
        }
        return stripXmlTags(inner)
      })
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text || null
  }

  return null
}

interface PlayerResponse {
  playabilityStatus?: { status?: string; reason?: string }
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string }>
    }
  }
  videoDetails?: { title?: string; author?: string; lengthSeconds?: string; thumbnail?: { thumbnails?: Array<{ url: string }> } }
}

function extractPlayerResponse(html: string): PlayerResponse | null {
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;/,
    /window\[["']ytInitialPlayerResponse["']\]\s*=\s*(\{[\s\S]*?\})\s*;/,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (!m?.[1]) continue
    try {
      return JSON.parse(m[1]) as PlayerResponse
    } catch {
      continue
    }
  }
  return null
}

// ─── Transcript fetcher ───────────────────────────────────────────────────────

// Headers that mimic a real browser to avoid YouTube's bot detection on cloud IPs.
// The CONSENT cookie bypasses the GDPR consent wall that YouTube shows to server IPs.
const YT_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Cookie': 'CONSENT=YES+cb; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpeF8yMDIzMDkyOC4xXzAxJzAuNzI2',
}

async function fetchFromWatchPage(videoId: string): Promise<YouTubeTranscriptResult> {
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: YT_BROWSER_HEADERS,
      signal: AbortSignal.timeout(20_000),
    })
    if (!watchRes.ok) {
      return { transcript: null, provider: 'watch_page', reason: `watch_http_${watchRes.status}` }
    }
    const html = await watchRes.text()

    // Detect consent/verification redirect — YouTube serves these to cloud IPs
    if (html.includes('consent.youtube.com') || html.includes('before you continue')) {
      return { transcript: null, provider: 'watch_page', reason: 'consent_wall' }
    }

    const playerResponse = extractPlayerResponse(html)
    const status = playerResponse?.playabilityStatus?.status
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

    if (!tracks.length) {
      const reason =
        status === 'LOGIN_REQUIRED' ? 'login_required'
        : status === 'AGE_CHECK_REQUIRED' ? 'login_required'
        : !playerResponse ? 'player_response_missing'
        : 'no_caption_tracks'
      return { transcript: null, provider: 'watch_page', reason }
    }

    // Prefer the video's native language (non-ASR first), then any track
    const preferred =
      tracks.find((t) => !t.kind && t.languageCode === 'es') ??
      tracks.find((t) => !t.kind && t.languageCode?.startsWith('es')) ??
      tracks.find((t) => !t.kind && t.languageCode === 'en') ??
      tracks.find((t) => !t.kind) ??
      tracks.find((t) => t.languageCode === 'es') ??
      tracks[0]

    if (!preferred?.baseUrl) {
      return { transcript: null, provider: 'watch_page', reason: 'caption_track_no_base_url' }
    }

    const captionUrl = preferred.baseUrl.includes('fmt=')
      ? preferred.baseUrl
      : `${preferred.baseUrl}&fmt=srv3`

    const capRes = await fetch(captionUrl, {
      headers: YT_BROWSER_HEADERS,
      signal: AbortSignal.timeout(20_000),
    })
    if (!capRes.ok) {
      return { transcript: null, provider: 'watch_page', reason: `caption_http_${capRes.status}` }
    }
    const xml = await capRes.text()
    const transcript = parseCaptionXml(xml)
    if (!transcript) {
      return { transcript: null, provider: 'watch_page', reason: 'caption_parse_failed' }
    }
    return { transcript, provider: 'watch_page' }
  } catch (err) {
    return {
      transcript: null,
      provider: 'watch_page',
      reason: 'watch_exception:' + (err instanceof Error ? err.message : String(err)),
    }
  }
}

/**
 * Get a YouTube transcript by scraping the watch page caption tracks.
 * Returns transcript=null if no captions are available or the request is blocked.
 */
export async function getYouTubeTranscript(videoId: string): Promise<YouTubeTranscriptResult> {
  const result = await fetchFromWatchPage(videoId)
  if (!result.transcript) {
    console.warn(`[transcript] YouTube ${videoId} failed — reason: ${result.reason}`)
  }
  return result
}

/**
 * Best-effort metadata from the watch page (no YouTube Data API key required).
 * Returns nulls for fields that couldn't be parsed.
 */
export async function getYouTubeMetadataFromWatchPage(videoId: string): Promise<YouTubeMetadata> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return { title: null, creator: null, thumbnail: null, duration: null }

    const html = await res.text()
    const player = extractPlayerResponse(html)
    const details = player?.videoDetails

    let duration: string | null = null
    const seconds = details?.lengthSeconds ? Number(details.lengthSeconds) : NaN
    if (Number.isFinite(seconds) && seconds > 0) {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = String(Math.round(seconds % 60)).padStart(2, '0')
      duration = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${s}`
        : `${m}:${s}`
    }

    const thumbnails = details?.thumbnail?.thumbnails ?? []
    const thumbnail = thumbnails[thumbnails.length - 1]?.url ?? null

    return {
      title: details?.title ?? null,
      creator: details?.author ?? null,
      thumbnail,
      duration,
    }
  } catch {
    return { title: null, creator: null, thumbnail: null, duration: null }
  }
}
