/**
 * GET /api/youtube/videos
 *
 * Returns the active client's stored YouTube videos, paginated by cursor.
 * Query params:
 *   - limit  (default 25, max 100)
 *   - cursor (video cuid for keyset pagination)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { YouTubeVideosQuerySchema } from '@/lib/schemas/youtube'

export async function GET(req: NextRequest): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Validate + coerce query params via Zod — rejects NaN and out-of-range values.
  const parsed = YouTubeVideosQuerySchema.safeParse({
    limit:  req.nextUrl.searchParams.get('limit') ?? undefined,
    cursor: req.nextUrl.searchParams.get('cursor') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid query', issues: parsed.error.flatten() }
        : { error: 'Invalid query' },
      { status: 400 },
    )
  }
  const { limit, cursor } = parsed.data

  const rows = await db.youTubeVideo.findMany({
    where: { clientId },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({
    items: items.map((v) => ({
      id: v.id,
      videoId: v.videoId,
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      url: v.url,
      durationSec: v.durationSec,
      durationLabel: v.durationLabel,
      viewsCount: v.viewsCount,
      likesCount: v.likesCount,
      commentsCount: v.commentsCount,
      favoriteCount: v.favoriteCount,
      watchTimeMinutes: v.watchTimeMinutes,
      averageViewDuration: v.averageViewDuration,
      averageViewPercent: v.averageViewPercent,
      ctr: v.ctr,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      syncedAt: v.syncedAt.toISOString(),
    })),
    nextCursor,
  })
}
