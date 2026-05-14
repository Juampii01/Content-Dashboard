/**
 * GET /api/instagram/stories
 *
 * Returns Story rows for the active client (read-only). Use
 * `/api/instagram/sync` to refresh from the Graph API first.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireActiveClient,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const stories = await db.story.findMany({
    where: { clientId },
    orderBy: [{ publishedAt: 'desc' }, { syncedAt: 'desc' }],
    take: 50,
  })

  return NextResponse.json({ stories })
}
