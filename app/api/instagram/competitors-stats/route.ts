/**
 * GET /api/instagram/competitors-stats
 *
 * Returns the client's saved competitors enriched with aggregated reel stats:
 * avgViews, avgLikes, engagementRate, postsPerWeek (based on scraped reels).
 *
 * Used by the Instagram › Competencia tab.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export interface CompetitorStatDTO {
  id: string
  username: string
  displayName: string | null
  profilePicUrl: string | null
  followers: number
  engagementRate: number
  avgViews: number
  avgLikes: number
  postsPerWeek: number
  reelsCount: number
  lastScrapedAt: string | null
}

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)   return NextResponse.json({ error: 'FORBIDDEN' },     { status: 403 })
    throw err
  }

  const competitors = await db.competitor.findMany({
    where:   { clientId },
    orderBy: { createdAt: 'desc' },
    include: {
      reels: {
        select: {
          viewsCount:   true,
          likesCount:   true,
          commentsCount: true,
          postedAt:     true,
        },
      },
    },
  })

  const now = Date.now()
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000

  const stats: CompetitorStatDTO[] = competitors.map((c) => {
    const reels = c.reels
    const n = reels.length

    const avgViews   = n > 0 ? Math.round(reels.reduce((s, r) => s + r.viewsCount,   0) / n) : 0
    const avgLikes   = n > 0 ? Math.round(reels.reduce((s, r) => s + r.likesCount,   0) / n) : 0
    const avgComments = n > 0 ? Math.round(reels.reduce((s, r) => s + r.commentsCount, 0) / n) : 0

    // Engagement rate: (avg likes + avg comments) / avg views × 100
    const engagementRate = avgViews > 0
      ? parseFloat(((avgLikes + avgComments) / avgViews * 100).toFixed(1))
      : 0

    // Posts per week: count reels with postedAt in last 30 days / ~4 weeks
    const recentCount = reels.filter(
      (r) => r.postedAt && now - r.postedAt.getTime() < 30 * 24 * 60 * 60 * 1000,
    ).length
    const postsPerWeek = parseFloat((recentCount / 4).toFixed(1))

    // Oldest vs newest reel span — alternative postsPerWeek if all reels have dates
    const datedReels = reels.filter((r) => r.postedAt).map((r) => r.postedAt!.getTime())
    let postsPerWeekFinal = postsPerWeek
    if (datedReels.length >= 2) {
      const span = Math.max(...datedReels) - Math.min(...datedReels)
      const weeks = Math.max(span / WEEK_MS, 1)
      postsPerWeekFinal = parseFloat((datedReels.length / weeks).toFixed(1))
    }

    return {
      id:            c.id,
      username:      `@${c.username}`,
      displayName:   c.displayName,
      profilePicUrl: c.profilePicUrl,
      followers:     c.followersCount ?? 0,
      engagementRate,
      avgViews,
      avgLikes,
      postsPerWeek:  postsPerWeekFinal,
      reelsCount:    n,
      lastScrapedAt: c.lastScrapedAt?.toISOString() ?? null,
    }
  })

  return NextResponse.json({ competitors: stats })
}
