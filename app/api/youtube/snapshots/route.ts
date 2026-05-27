/**
 * GET /api/youtube/snapshots?limit=
 *
 * Returns the active client's recent AccountSnapshot rows (subscribers +
 * totalViews over time) used to draw the growth chart on /youtube.
 *
 * Snapshots are created by POST /api/youtube/sync (one row per UTC day).
 * With fewer than 2 rows the UI renders an empty state instead of
 * fabricating a trend line.
 *
 * Query params:
 *   - limit  (default 90, max 365)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export async function GET(req: NextRequest): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '90')
  const limit = Math.min(Math.max(limitParam, 1), 365)

  const rows = await db.accountSnapshot.findMany({
    where: { clientId, platform: 'youtube' },
    orderBy: { date: 'desc' },
    take: limit,
    select: {
      date: true,
      followers: true,
      totalViews: true,
      posts: true,
    },
  })

  // Return ascending by date so the chart plots left-to-right without reversing.
  const items = rows
    .slice()
    .reverse()
    .map((r) => ({
      date: r.date.toISOString(),
      subscribers: r.followers,
      totalViews: r.totalViews,
      videoCount: r.posts,
    }))

  return NextResponse.json({ items })
}
