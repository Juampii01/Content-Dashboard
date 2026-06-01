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
  accountName?: string
  accountPic?: string | null
  expiresAt?: string | null
  tokenExpired?: boolean
  latestSnapshot?: {
    date: string
    followers: number
    posts: number
    engagementRate?: number
    totalViews?: number
    reach?: number
    profileVisits?: number
  } | null
  reelCount?: number
  syncedReels?: number
  reelsSyncCapped?: boolean
}

export async function GET(): Promise<NextResponse<Response>> {
  const userId = await getUserIdOrNull()
  if (!userId) return NextResponse.json({ connected: false })
  const clientId = await getActiveClientId()
  if (!clientId) return NextResponse.json({ connected: false })

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) return NextResponse.json({ connected: false })

  // Fetch snapshot + reelCount separately so a DB schema mismatch (e.g. during
  // a rolling deploy before migrations complete) degrades gracefully instead of
  // returning a 500 that makes the whole page show "not connected".
  let snapshot = null
  let reelCount = 0
  try {
    ;[snapshot, reelCount] = await Promise.all([
      db.accountSnapshot.findFirst({
        where: { clientId, platform: 'instagram' },
        orderBy: { date: 'desc' },
      }),
      db.userReel.count({ where: { clientId } }),
    ])
  } catch (e) {
    console.error('[instagram/account-summary] snapshot/reelCount query failed:', e)
  }

  const tokenExpired = conn.expiresAt ? conn.expiresAt.getTime() <= Date.now() : false

  const storedReelCount = reelCount
  const realCount = snapshot?.posts ?? storedReelCount

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
          engagementRate: snapshot.engagementRate,
          totalViews: snapshot.totalViews,
          reach: snapshot.reach,
          profileVisits: snapshot.profileVisits,
        }
      : null,
    reelCount: realCount,
    syncedReels: storedReelCount,
    reelsSyncCapped: storedReelCount >= 500 && realCount > storedReelCount,
  })
}
