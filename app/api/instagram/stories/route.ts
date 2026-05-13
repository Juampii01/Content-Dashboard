/**
 * GET /api/instagram/stories
 *
 * Paginated list of Story rows for the active client, most recent first.
 *
 *   GET /api/instagram/stories                  → first page (newest 50)
 *   GET /api/instagram/stories?cursor=<id>      → next page
 *   GET /api/instagram/stories?limit=100        → bigger page (max 200)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireActiveClient,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'

const DEFAULT_LIMIT = 50
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

  try {
    const rows = await db.story.findMany({
      where: { clientId },
      orderBy: [{ publishedAt: 'desc' }, { syncedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const stories = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? stories[stories.length - 1].id : null

    return NextResponse.json({ stories, nextCursor })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[instagram/stories/GET] error:', message)
    return NextResponse.json({ error: 'DB_READ_FAILED', detail: message }, { status: 500 })
  }
}
