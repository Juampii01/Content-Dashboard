/**
 * GET /api/me/global-stats
 *
 * Aggregate stats for the active client across every connected platform.
 * Reads the latest `AccountSnapshot` per platform and sums followers + views
 * (`impressions`) across them; engagementRate is averaged.
 *
 * Returns `null` (NOT a 404) when there's no snapshot data — the UI shows
 * "—" placeholders instead of fake numbers. Errors return 4xx/5xx as usual.
 *
 * Replaces `lib/mock-data/global.ts` which served identical-looking but
 * invented stats to the TopBar.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export interface GlobalStatsResponse {
  followers: number
  views: number
  engagementRate: number
}

export async function GET(): Promise<NextResponse<GlobalStatsResponse | null | { error: string }>> {
  try {
    const { clientId } = await requireActiveClient()

    // Latest snapshot per platform (Instagram, YouTube, TikTok, ...)
    const snaps = await db.accountSnapshot.findMany({
      where: { clientId },
      orderBy: [{ platform: 'asc' }, { date: 'desc' }],
      distinct: ['platform'],
      select: { followers: true, impressions: true, engagementRate: true },
    })

    if (snaps.length === 0) {
      return NextResponse.json(null)
    }

    const followers = snaps.reduce((sum, s) => sum + s.followers, 0)
    const views = snaps.reduce((sum, s) => sum + s.impressions, 0)
    const engagementRate =
      snaps.reduce((sum, s) => sum + s.engagementRate, 0) / snaps.length

    return NextResponse.json({ followers, views, engagementRate })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/global-stats/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
