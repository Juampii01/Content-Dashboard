/**
 * Adapter: UserReel row (Prisma/DB) → the `Reel` UI type used by mock-data
 * components. Fields unavailable under the `instagram_basic` scope default
 * to 0 so the UI can render without undefined errors.
 */

import type { Reel } from '@/lib/types'
import type { UserReelRow } from '@/hooks/useInstagramData'

function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function userReelToView(r: UserReelRow): Reel {
  const publishedAt = r.publishedAt ?? r.syncedAt
  const caption = r.caption ?? ''
  const title = caption.split('\n')[0]?.slice(0, 80) || 'Reel'
  return {
    id: r.id,
    thumbnail: r.thumbnailUrl ?? '',
    title,
    caption,
    duration: formatDuration(r.durationSec),
    publishedAt: publishedAt.slice(0, 10),
    views: r.viewsCount ?? 0,
    viewsOrganic: r.viewsOrganic ?? r.viewsCount ?? 0,
    viewsPaid: r.viewsPaid ?? 0,
    likes: r.likesCount,
    saves: r.savesCount ?? 0,
    comments: r.commentsCount,
    shares: r.sharesCount ?? 0,
    organicPercent: r.organicPercent ?? 100,
    multiplier: r.multiplier ?? 0,
    isAd: r.isAd ?? false,
    isTrialReel: r.isTrialReel ?? false,
  }
}
