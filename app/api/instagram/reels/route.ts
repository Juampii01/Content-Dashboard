/**
 * GET /api/instagram/reels
 *
 * Lists UserReel rows for the active client (scoped). Read-only — does not
 * call Graph API. Use `/api/instagram/sync` to refresh from IG first.
 *
 * Pagination: cursor-based on `id` (cuid is lexicographically time-ordered
 * within a millisecond range but Prisma's `cursor` skips by primary key so
 * the cursor is stable regardless). Default page size 100, max 200.
 *
 *   GET /api/instagram/reels                  → first page (newest 100)
 *   GET /api/instagram/reels?cursor=<id>      → next page after <id>
 *   GET /api/instagram/reels?limit=200        → bigger page
 *
 * Response: `{ reels, nextCursor }`. `nextCursor` is null when there are
 * no more rows to fetch.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireActiveClient,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

export async function GET(req: NextRequest): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const limitParam = Number(searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.floor(limitParam), MAX_LIMIT)
    : DEFAULT_LIMIT

  // Fetch limit + 1 so we can tell if there's a next page without a second query.
  const rows = await db.userReel.findMany({
    where: { clientId },
    orderBy: [{ publishedAt: 'desc' }, { syncedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > limit
  const reels = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? reels[reels.length - 1].id : null

  return NextResponse.json({ reels, nextCursor })
}
