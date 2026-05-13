/**
 * GET /api/me/dashboard-stats?period=7|14|30|90
 *
 * Returns DashboardStats populated from real DB data:
 *   - UserReel (published in the requested period) → views, likes, saves, comments
 *   - AccountSnapshot (instagram, last period) → followers, engagementRate
 *
 * Fields that require Meta Insights (impressions, reach, profileVisits,
 * newFollowers) come from AccountSnapshot; they are 0 for Apify-synced
 * accounts since the Apify path doesn't write those columns.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import type { DashboardStats, Period } from '@/lib/types'

const VALID_PERIODS: Period[] = [7, 14, 30, 90]

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function pctChange(current: number, prev: number): number {
  if (prev === 0) return 0
  return Math.round((current - prev) / prev * 100)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)   return NextResponse.json({ error: 'FORBIDDEN' },     { status: 403 })
    throw err
  }

  const raw = req.nextUrl.searchParams.get('period')
  const period: Period = VALID_PERIODS.includes(Number(raw) as Period) ? Number(raw) as Period : 30

  const cutoff     = daysAgo(period)
  const prevCutoff = daysAgo(period * 2)

  // ── Parallel fetches ───────────────────────────────────────────────────────

  const [currentReels, prevReels, snapshots] = await Promise.all([
    db.userReel.findMany({
      where:  { clientId, publishedAt: { gte: cutoff } },
      select: { viewsCount: true, likesCount: true, savesCount: true, commentsCount: true, publishedAt: true, organicPercent: true },
      orderBy: { publishedAt: 'asc' },
    }),
    db.userReel.findMany({
      where:  { clientId, publishedAt: { gte: prevCutoff, lt: cutoff } },
      select: { viewsCount: true, likesCount: true, savesCount: true, commentsCount: true },
    }),
    db.accountSnapshot.findMany({
      where:   { clientId, platform: 'instagram', date: { gte: cutoff } },
      orderBy: { date: 'asc' },
      select:  { date: true, followers: true, engagementRate: true, impressions: true, reach: true, newFollowers: true, profileVisits: true },
    }),
  ])

  // ── Aggregate current period ───────────────────────────────────────────────

  const totalViews    = currentReels.reduce((s, r) => s + r.viewsCount,    0)
  const totalLikes    = currentReels.reduce((s, r) => s + r.likesCount,    0)
  const totalSaves    = currentReels.reduce((s, r) => s + r.savesCount,    0)
  const totalComments = currentReels.reduce((s, r) => s + r.commentsCount, 0)
  const bestReelViews = currentReels.reduce((m, r) => Math.max(m, r.viewsCount), 0)
  const avgOrganic    = currentReels.length > 0
    ? Math.round(currentReels.reduce((s, r) => s + r.organicPercent, 0) / currentReels.length)
    : 100

  // Engagement rate: (likes + saves + comments) / views × 100, per reel, then averaged
  const engagementRate = currentReels.length > 0
    ? parseFloat((currentReels.reduce((s, r) => {
        const v = r.viewsCount || 1
        return s + (r.likesCount + r.savesCount + r.commentsCount) / v * 100
      }, 0) / currentReels.length).toFixed(1))
    : 0

  // ── Previous period totals (for % change) ─────────────────────────────────

  const prevViews    = prevReels.reduce((s, r) => s + r.viewsCount,    0)
  const prevLikes    = prevReels.reduce((s, r) => s + r.likesCount,    0)
  const prevSaves    = prevReels.reduce((s, r) => s + r.savesCount,    0)
  const prevComments = prevReels.reduce((s, r) => s + r.commentsCount, 0)

  const impressionsChange = pctChange(totalViews,    prevViews)
  const likesChange       = pctChange(totalLikes,    prevLikes)
  const savesChange       = pctChange(totalSaves,    prevSaves)
  const commentsChange    = pctChange(totalComments, prevComments)

  // ── AccountSnapshot data (may be 0 for Apify accounts) ───────────────────

  const profileVisits  = snapshots.reduce((s, snap) => s + snap.profileVisits,  0)
  const newFollowers   = snapshots.reduce((s, snap) => s + snap.newFollowers,    0)
  // Snapshots from Apify don't write impressions/reach; use view totals as proxy
  const snapshotImpressions = snapshots.reduce((s, snap) => s + snap.impressions, 0)
  const snapshotReach       = snapshots.reduce((s, snap) => s + snap.reach,       0)

  // Use AccountSnapshot impression/reach if available, else fall back to reel views
  const impressions    = snapshotImpressions > 0 ? snapshotImpressions : totalViews
  const totalReach     = snapshotReach > 0 ? snapshotReach : Math.round(totalViews * 0.6)
  const avgDailyReach  = Math.round(totalReach / period)

  // Profile conversion: newFollowers / profileVisits (only meaningful with Insights data)
  const profileConversionRate = profileVisits > 0
    ? parseFloat((newFollowers / profileVisits * 100).toFixed(1))
    : 0

  // ── Time-series chart data from reels ─────────────────────────────────────

  // Group UserReels by publishedAt date
  const byDate = new Map<string, { impressions: number; reach: number; likes: number; saves: number; comments: number }>()

  for (const r of currentReels) {
    if (!r.publishedAt) continue
    const key = dateLabel(r.publishedAt)
    const existing = byDate.get(key) ?? { impressions: 0, reach: 0, likes: 0, saves: 0, comments: 0 }
    existing.impressions += r.viewsCount
    existing.reach       += r.likesCount + r.savesCount + r.commentsCount
    existing.likes       += r.likesCount
    existing.saves       += r.savesCount
    existing.comments    += r.commentsCount
    byDate.set(key, existing)
  }

  // If no reels in period, fall back to AccountSnapshot data for impressions/reach chart
  if (byDate.size === 0 && snapshots.length > 0) {
    for (const snap of snapshots) {
      const key = dateLabel(snap.date)
      byDate.set(key, {
        impressions: snap.impressions,
        reach:       snap.reach,
        likes:       0,
        saves:       0,
        comments:    0,
      })
    }
  }

  const chartData: DashboardStats['chartData'] = Array.from(byDate.entries()).map(([date, v]) => ({
    date,
    impressions: v.impressions,
    reach:       v.reach,
  }))

  const interactionsData: DashboardStats['interactionsData'] = Array.from(byDate.entries()).map(([date, v]) => ({
    date,
    likes:    v.likes,
    saves:    v.saves,
    comments: v.comments,
  }))

  // ── Assemble response ──────────────────────────────────────────────────────

  const result: DashboardStats & {
    impressionsChange: number
    likesChange: number
    savesChange: number
    commentsChange: number
  } = {
    impressions,
    avgDailyReach,
    impressionsChange,
    likesChange,
    savesChange,
    commentsChange,
    profileConversionRate,
    profileVisits,
    newFollowers,
    conversionChange: 0,
    profileGrowth:    newFollowers,
    growthLast30:     newFollowers,
    trafficOrganic:   avgOrganic,
    trafficPaid:      100 - avgOrganic,
    likes:            totalLikes,
    saves:            totalSaves,
    comments:         totalComments,
    engagementRate,
    bestReelViews,
    chartData,
    interactionsData,
    viewsGoalPct:     0,
    followersGoalPct: 0,
  }

  return NextResponse.json(result)
}
