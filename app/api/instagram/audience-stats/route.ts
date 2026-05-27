/**
 * GET /api/instagram/audience-stats
 *
 * Returns aggregated audience analytics computed from stored
 * AccountSnapshot + UserReel rows — no live Graph API call.
 *
 * Returns:
 *   200 { snapshots, reelStats, topReels }
 *   401 UNAUTHORIZED / 403 FORBIDDEN
 *   404 NOT_CONNECTED
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })

  const [snapshots, reels] = await Promise.all([
    db.accountSnapshot.findMany({
      where: { clientId, platform: 'instagram' },
      orderBy: { date: 'asc' },
      take: 90,
    }),
    db.userReel.findMany({
      where: { clientId },
      select: {
        id: true,
        caption: true,
        likesCount: true,
        commentsCount: true,
        viewsCount: true,
        publishedAt: true,
        url: true,
        thumbnailUrl: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    }),
  ])

  // ── Weekday analysis ─────────────────────────────────────────────────────────
  const weekdayBuckets = Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    label: WEEKDAY_LABELS[i],
    totalLikes: 0,
    totalComments: 0,
    count: 0,
  }))

  reels.forEach((r) => {
    if (r.publishedAt) {
      const d = r.publishedAt.getDay()
      weekdayBuckets[d].totalLikes += r.likesCount
      weekdayBuckets[d].totalComments += r.commentsCount
      weekdayBuckets[d].count++
    }
  })

  const byWeekday = weekdayBuckets.map((b) => ({
    label: b.label,
    avgEngagement:
      b.count > 0
        ? Math.round((b.totalLikes + b.totalComments) / b.count)
        : 0,
    count: b.count,
  }))

  // ── Aggregate reel stats ──────────────────────────────────────────────────────
  const totalLikes = reels.reduce((s, r) => s + r.likesCount, 0)
  const totalComments = reels.reduce((s, r) => s + r.commentsCount, 0)
  const totalViews = reels.reduce((s, r) => s + r.viewsCount, 0)

  // ── Top 5 reels by engagement ─────────────────────────────────────────────────
  const topReels = [...reels]
    .sort((a, b) => b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      caption: r.caption?.slice(0, 100) ?? '',
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
      viewsCount: r.viewsCount,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      url: r.url,
      thumbnailUrl: r.thumbnailUrl,
    }))

  return NextResponse.json({
    snapshots: snapshots.map((s) => ({
      date: s.date.toISOString(),
      followers: s.followers,
      engagementRate: s.engagementRate ?? 0,
      impressions: s.totalViews ?? 0,
    })),
    reelStats: {
      totalLikes,
      totalComments,
      totalViews,
      reelCount: reels.length,
      avgLikes: reels.length > 0 ? Math.round(totalLikes / reels.length) : 0,
      avgComments: reels.length > 0 ? Math.round(totalComments / reels.length) : 0,
      byWeekday,
    },
    topReels,
  })
}
