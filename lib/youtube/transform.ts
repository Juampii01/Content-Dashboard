/**
 * Helpers that transform YouTube Data API v3 payloads into shapes we persist
 * and ship to the client.
 */

import type { YTVideo } from '@/lib/schemas/youtube'

/**
 * Parses ISO-8601 duration strings like "PT1H2M3S" into seconds.
 * YouTube uses this format in `contentDetails.duration`.
 */
export function parseIsoDurationToSeconds(iso: string | undefined | null): number {
  if (!iso) return 0
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  if (!match) return 0
  const hours = match[1] ? parseInt(match[1], 10) : 0
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const seconds = match[3] ? parseInt(match[3], 10) : 0
  return hours * 3600 + minutes * 60 + seconds
}

/** Formats seconds to "M:SS" or "H:MM:SS". */
export function formatDurationLabel(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return '0:00'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

/** Pick the best thumbnail from a YouTube thumbnails object. */
export function pickThumbnail(
  thumbnails: YTVideo['snippet'] extends infer S
    ? S extends { thumbnails?: infer T } ? T : undefined
    : undefined,
): string | null {
  const t = thumbnails as
    | {
        maxres?: { url?: string }
        standard?: { url?: string }
        high?: { url?: string }
        medium?: { url?: string }
        default?: { url?: string }
      }
    | undefined
  return (
    t?.maxres?.url ??
    t?.standard?.url ??
    t?.high?.url ??
    t?.medium?.url ??
    t?.default?.url ??
    null
  )
}

/** Data prepared for upsert into the YouTubeVideo Prisma model. */
export interface YouTubeVideoUpsertData {
  videoId: string
  channelId: string
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
  publishedAt: Date | null
}

export function transformVideo(item: YTVideo): YouTubeVideoUpsertData {
  const durationSec = parseIsoDurationToSeconds(item.contentDetails?.duration)
  const viewsCount = parseInt(item.statistics?.viewCount ?? '0', 10) || 0
  const likesCount = parseInt(item.statistics?.likeCount ?? '0', 10) || 0
  const commentsCount = parseInt(item.statistics?.commentCount ?? '0', 10) || 0
  const favoriteCount = parseInt(item.statistics?.favoriteCount ?? '0', 10) || 0
  const publishedAt = item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null

  return {
    videoId: item.id,
    channelId: item.snippet?.channelId ?? '',
    title: item.snippet?.title ?? '(sin título)',
    description: item.snippet?.description ?? '',
    thumbnailUrl: pickThumbnail(item.snippet?.thumbnails),
    url: `https://www.youtube.com/watch?v=${item.id}`,
    durationSec,
    durationLabel: formatDurationLabel(durationSec),
    viewsCount,
    likesCount,
    commentsCount,
    favoriteCount,
    publishedAt,
  }
}
