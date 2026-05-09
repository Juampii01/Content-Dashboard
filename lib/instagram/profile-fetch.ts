/**
 * Instagram profile fetch — last N posts of a profile.
 *
 * Strategy (matches Smart-Scale's `getInstagramPosts` and `scrapeInstagramProfile`):
 *   1. Direct mobile-API call (`i.instagram.com/api/v1/users/web_profile_info`)
 *      with mobile-Safari headers. Often works in dev / unblocked IPs.
 *   2. Apify fallback — try several actors that accept profile URL or username.
 *
 * Used by `/api/content-research` and `/api/video-feed`.
 */

const IG_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'es,en;q=0.9',
  'X-IG-App-ID': '936619743392459',
  'X-Requested-With': 'XMLHttpRequest',
}

export interface InstagramPost {
  id: string
  shortCode: string | null
  caption: string
  timestamp: string | null
  likesCount: number
  commentsCount: number
  videoPlayCount: number | null
  videoDuration: number | null
  displayUrl: string | null
  videoUrl: string | null
  url: string
  ownerUsername: string
  isVideo: boolean
}

interface RawIGEdge {
  node: {
    id?: string
    shortcode?: string
    edge_media_to_caption?: { edges?: Array<{ node?: { text?: string } }> }
    taken_at_timestamp?: number
    edge_media_preview_like?: { count?: number }
    edge_media_to_comment?: { count?: number }
    video_view_count?: number
    video_duration?: number
    display_url?: string
    is_video?: boolean
  }
}

interface RawApifyItem {
  id?: string
  shortCode?: string
  shortcode?: string
  code?: string
  postId?: string
  caption?: string
  text?: string
  title?: string
  description?: string
  captionText?: string
  timestamp?: string | number
  takenAt?: string | number
  taken_at?: string | number
  createdAt?: string | number
  created_at?: string | number
  likesCount?: number
  likes?: number
  likeCount?: number
  commentsCount?: number
  comments?: number
  commentCount?: number
  videoPlayCount?: number
  videoViewCount?: number
  views?: number
  playCount?: number
  videoDuration?: number
  duration?: number
  video_duration?: number
  displayUrl?: string
  thumbnailUrl?: string
  imageUrl?: string
  display_url?: string
  videoUrl?: string
  video?: string
  video_url?: string
  downloadedVideo?: string
  url?: string
  ownerUsername?: string
  username?: string
  authorUsername?: string
  type?: string
  mediaType?: string
  media_type?: number
}

function mapEdges(edges: RawIGEdge[], username: string): InstagramPost[] {
  return edges.map((e) => {
    const n = e.node
    return {
      id: n.id ?? n.shortcode ?? String(Math.random()),
      shortCode: n.shortcode ?? null,
      caption: n.edge_media_to_caption?.edges?.[0]?.node?.text ?? '',
      timestamp: n.taken_at_timestamp
        ? new Date(n.taken_at_timestamp * 1000).toISOString()
        : null,
      likesCount: n.edge_media_preview_like?.count ?? 0,
      commentsCount: n.edge_media_to_comment?.count ?? 0,
      videoPlayCount: n.video_view_count ?? null,
      videoDuration: n.video_duration ?? null,
      displayUrl: n.display_url ?? null,
      videoUrl: null,
      url: `https://www.instagram.com/p/${n.shortcode ?? ''}/`,
      ownerUsername: username,
      isVideo: !!n.is_video,
    }
  })
}

function mapApifyItem(it: RawApifyItem, username: string): InstagramPost {
  const shortCode =
    it.shortCode ?? it.shortcode ?? it.code ?? it.id ?? it.postId ?? null
  const rawTs =
    it.timestamp ?? it.takenAt ?? it.taken_at ?? it.createdAt ?? it.created_at ?? null
  const isoTs =
    typeof rawTs === 'number'
      ? new Date(rawTs > 1e12 ? rawTs : rawTs * 1000).toISOString()
      : typeof rawTs === 'string'
        ? rawTs
        : null

  const isVideo =
    it.type === 'Video' ||
    it.mediaType === 'Video' ||
    it.media_type === 2 ||
    !!(it.videoUrl ?? it.video ?? it.video_url ?? it.downloadedVideo)

  return {
    id: it.id ?? shortCode ?? String(Math.random()),
    shortCode,
    caption: it.caption ?? it.text ?? it.title ?? it.description ?? it.captionText ?? '',
    timestamp: isoTs,
    likesCount: it.likesCount ?? it.likes ?? it.likeCount ?? 0,
    commentsCount: it.commentsCount ?? it.comments ?? it.commentCount ?? 0,
    videoPlayCount:
      it.videoPlayCount ?? it.videoViewCount ?? it.views ?? it.playCount ?? null,
    videoDuration: it.videoDuration ?? it.duration ?? it.video_duration ?? null,
    displayUrl: it.displayUrl ?? it.thumbnailUrl ?? it.imageUrl ?? it.display_url ?? null,
    videoUrl: it.videoUrl ?? it.video ?? it.video_url ?? it.downloadedVideo ?? null,
    url:
      it.url ??
      (shortCode ? `https://www.instagram.com/p/${shortCode}/` : `https://www.instagram.com/${username}/`),
    ownerUsername: it.ownerUsername ?? it.username ?? it.authorUsername ?? username,
    isVideo,
  }
}

async function fetchDirectMobile(username: string): Promise<InstagramPost[]> {
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      { headers: IG_HEADERS, signal: AbortSignal.timeout(12_000) },
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      data?: { user?: { edge_owner_to_timeline_media?: { edges?: RawIGEdge[] } } }
    }
    const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? []
    return mapEdges(edges, username)
  } catch {
    return []
  }
}

async function fetchViaApify(username: string): Promise<InstagramPost[]> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) return []
  const profileUrl = `https://www.instagram.com/${username}/`
  const attempts: Array<{ actor: string; input: Record<string, unknown> }> = [
    { actor: 'apify~instagram-api-scraper', input: { directUrls: [profileUrl], resultsType: 'posts', resultsLimit: 50 } },
    { actor: 'apify~instagram-profile-scraper', input: { usernames: [username], resultsLimit: 50 } },
    { actor: 'scrapepilotapi~instagram-profile-post-scraper', input: { startUrls: [profileUrl], maxPosts: 50, pinnedMode: 'include' } },
  ]
  for (const at of attempts) {
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/${at.actor}/run-sync-get-dataset-items?token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(at.input),
          signal: AbortSignal.timeout(60_000),
        },
      )
      if (!res.ok) continue
      const text = await res.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        continue
      }
      const items: RawApifyItem[] = Array.isArray(parsed)
        ? (parsed as RawApifyItem[])
        : ((parsed as { items?: RawApifyItem[]; results?: RawApifyItem[] }).items ??
           (parsed as { results?: RawApifyItem[] }).results ??
           [])
      if (Array.isArray(items) && items.length > 0) {
        return items.map((it) => mapApifyItem(it, username))
      }
    } catch {
      // try next actor
    }
  }
  return []
}

export function extractInstagramUsername(url: string): string | null {
  const m = url.match(/instagram\.com\/([^/?&]+)/)
  const u = m?.[1]
  if (!u || ['p', 'reel', 'reels', 'tv', 'stories'].includes(u)) return null
  return u
}

export async function fetchInstagramProfilePosts(
  url: string,
): Promise<{ username: string; posts: InstagramPost[] }> {
  const username = extractInstagramUsername(url)
  if (!username) throw new Error('URL de Instagram inválida — debe apuntar a un perfil.')

  const direct = await fetchDirectMobile(username)
  if (direct.length > 0) return { username, posts: direct }

  const viaApify = await fetchViaApify(username)
  if (viaApify.length > 0) return { username, posts: viaApify }

  throw new Error('No se pudo obtener posts de este perfil de Instagram.')
}
