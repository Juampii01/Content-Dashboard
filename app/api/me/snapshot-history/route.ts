/**
 * GET /api/me/snapshot-history?days=30
 *
 * Returns aggregated daily AccountSnapshot data as chart-ready time series.
 * Sums impressions, reach, and followers across all platforms per day.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export const runtime = 'nodejs'

export interface SnapshotHistoryResponse {
  chartData: { date: string; impressions: number; reach: number }[]
  latestFollowers: number
  latestEngagementRate: number
  latestProfileVisits: number
  latestNewFollowers: number
  latestAvgDailyReach: number
  hasData: boolean
}

const EMPTY: SnapshotHistoryResponse = {
  chartData: [],
  latestFollowers: 0,
  latestEngagementRate: 0,
  latestProfileVisits: 0,
  latestNewFollowers: 0,
  latestAvgDailyReach: 0,
  hasData: false,
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<SnapshotHistoryResponse | { error: string }>> {
  try {
    const { clientId } = await requireActiveClient()

    const daysParam = req.nextUrl.searchParams.get('days')
    const days = Math.min(Math.max(parseInt(daysParam ?? '30', 10) || 30, 1), 365)

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    // Only show data for platforms that currently have an active SocialConnection.
    // If the user disconnected a platform, its historical AccountSnapshot rows
    // should not pollute the dashboard with stale metrics.
    const activeConnections = await db.socialConnection.findMany({
      where: { clientId },
      select: { platform: true },
    })

    if (activeConnections.length === 0) {
      return NextResponse.json(EMPTY)
    }

    const activePlatforms = activeConnections.map((c) => c.platform)

    const snapshots = await db.accountSnapshot.findMany({
      where: {
        clientId,
        date: { gte: since },
        platform: { in: activePlatforms },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        platform: true,
        totalViews: true,
        reach: true,
        followers: true,
        engagementRate: true,
        profileVisits: true,
        newFollowers: true,
      },
    })

    if (snapshots.length === 0) {
      return NextResponse.json(EMPTY)
    }

    // Aggregate by date string (YYYY-MM-DD) summing across platforms
    const byDate = new Map<
      string,
      { totalViews: number; reach: number; followers: number; engagementRateSum: number; platformCount: number; profileVisits: number; newFollowers: number }
    >()

    for (const snap of snapshots) {
      const key = snap.date.toISOString().slice(0, 10)
      const existing = byDate.get(key)
      if (existing) {
        existing.totalViews += snap.totalViews
        existing.reach += snap.reach
        existing.followers += snap.followers
        existing.engagementRateSum += snap.engagementRate
        existing.platformCount += 1
        existing.profileVisits += snap.profileVisits
        existing.newFollowers += snap.newFollowers
      } else {
        byDate.set(key, {
          totalViews: snap.totalViews,
          reach: snap.reach,
          followers: snap.followers,
          engagementRateSum: snap.engagementRate,
          platformCount: 1,
          profileVisits: snap.profileVisits,
          newFollowers: snap.newFollowers,
        })
      }
    }

    // Build chart data sorted ascending, format date as "5 ene"
    const sortedKeys = Array.from(byDate.keys()).sort()
    const chartData = sortedKeys.map((key) => {
      const row = byDate.get(key)!
      const dateObj = new Date(key + 'T12:00:00Z') // noon UTC to avoid TZ shifts
      const label = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      return {
        date: label,
        impressions: row.totalViews, // chart key kept as 'impressions' for Recharts dataKey compatibility
        reach: row.reach,
      }
    })

    // Latest date aggregated values
    const lastKey = sortedKeys[sortedKeys.length - 1]
    const lastRow = byDate.get(lastKey)!

    const totalReach = Array.from(byDate.values()).reduce((s, r) => s + r.reach, 0)
    const latestAvgDailyReach = sortedKeys.length > 0 ? Math.round(totalReach / sortedKeys.length) : 0

    return NextResponse.json({
      chartData,
      latestFollowers: lastRow.followers,
      latestEngagementRate:
        lastRow.platformCount > 0 ? lastRow.engagementRateSum / lastRow.platformCount : 0,
      latestProfileVisits: lastRow.profileVisits,
      latestNewFollowers: lastRow.newFollowers,
      latestAvgDailyReach,
      hasData: true,
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/snapshot-history/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
