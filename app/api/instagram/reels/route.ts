/**
 * GET /api/instagram/reels
 *
 * Lists UserReel rows for the active client (scoped). Read-only — does not
 * call Graph API. Use `/api/instagram/sync` to refresh from IG first.
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

  const reels = await db.userReel.findMany({
    where: { clientId },
    orderBy: [{ publishedAt: 'desc' }, { syncedAt: 'desc' }],
    take: 100,
  })

  return NextResponse.json({ reels })
}
