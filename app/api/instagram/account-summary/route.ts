/**
 * GET /api/instagram/account-summary
 *
 * Returns connection status + latest AccountSnapshot for the active client.
 * Always responds 200; consumer uses `connected` to decide UI state.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActiveClientId, getUserIdOrNull } from '@/lib/auth-user'

interface Response {
  connected: boolean
  reason?: 'NO_SESSION' | 'NO_ACTIVE_CLIENT' | 'NOT_CONNECTED'
  accountName?: string
  accountPic?: string | null
  expiresAt?: string | null
  tokenExpired?: boolean
  latestSnapshot?: {
    date: string
    followers: number
    posts: number
  } | null
  reelCount?: number
}

export async function GET(): Promise<NextResponse<Response>> {
  const userId = await getUserIdOrNull()
  if (!userId) return NextResponse.json({ connected: false, reason: 'NO_SESSION' })
  const clientId = await getActiveClientId()
  if (!clientId) return NextResponse.json({ connected: false, reason: 'NO_ACTIVE_CLIENT' })

  // Defense in depth: never select the access / refresh tokens — they only
  // belong on server-side sync paths.
  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
    select: {
      accountName: true,
      accountPic: true,
      expiresAt: true,
    },
  })
  if (!conn) return NextResponse.json({ connected: false, reason: 'NOT_CONNECTED' })

  const [snapshot, reelCount] = await Promise.all([
    db.accountSnapshot.findFirst({
      where: { clientId, platform: 'instagram' },
      orderBy: { date: 'desc' },
    }),
    db.userReel.count({ where: { clientId } }),
  ])

  const tokenExpired = conn.expiresAt ? conn.expiresAt.getTime() <= Date.now() : false

  return NextResponse.json({
    connected: true,
    accountName: conn.accountName,
    accountPic: conn.accountPic,
    expiresAt: conn.expiresAt?.toISOString() ?? null,
    tokenExpired,
    latestSnapshot: snapshot
      ? {
          date: snapshot.date.toISOString(),
          followers: snapshot.followers,
          posts: snapshot.posts,
        }
      : null,
    reelCount,
  })
}
