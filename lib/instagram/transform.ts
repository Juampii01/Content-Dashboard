/**
 * Transformers: Instagram Graph API → Prisma models.
 *
 * Graph API on the `instagram_basic` scope gives us almost no insight metrics
 * (no reach, no impressions, no saves, no shares). We fill what's available
 * and leave the rest at their schema defaults (0). Once Meta App Review
 * unlocks `instagram_manage_insights` we can extend these with `/media/insights`.
 */

import type { InstagramMedia, InstagramAccount } from '@/lib/schemas/instagram'

export interface UserReelUpsert {
  instagramId: string
  shortcode: string
  url: string
  thumbnailUrl: string | null
  videoUrl: string | null
  caption: string | null
  likesCount: number
  commentsCount: number
  viewsCount: number
  publishedAt: Date | null
}

/**
 * Extract a shortcode from a permalink URL like
 * https://www.instagram.com/reel/ABC123/ or https://www.instagram.com/p/ABC123/
 */
function extractShortcode(permalink: string | undefined, fallback: string): string {
  if (!permalink) return fallback
  const m = permalink.match(/\/(?:p|reel|tv)\/([^/?#]+)/)
  return m?.[1] ?? fallback
}

export function mediaToUserReel(m: InstagramMedia): UserReelUpsert {
  const url = m.permalink ?? `https://www.instagram.com/p/${m.id}/`
  return {
    instagramId: m.id,
    shortcode: m.shortcode ?? extractShortcode(m.permalink, m.id),
    url,
    thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
    videoUrl: m.media_type === 'VIDEO' || m.media_type === 'REELS' ? m.media_url ?? null : null,
    caption: m.caption ?? null,
    likesCount: m.like_count ?? 0,
    commentsCount: m.comments_count ?? 0,
    // `views` is the v23.0+ field. `video_views` is the deprecated fallback (pre-July 2024).
    viewsCount: m.views ?? m.video_views ?? 0,
    publishedAt: m.timestamp ? new Date(m.timestamp) : null,
  }
}

export interface AccountSnapshotUpsert {
  followers: number
  posts: number
}

export function accountToSnapshot(a: InstagramAccount): AccountSnapshotUpsert {
  return {
    followers: a.followers_count ?? 0,
    posts: a.media_count ?? 0,
  }
}
