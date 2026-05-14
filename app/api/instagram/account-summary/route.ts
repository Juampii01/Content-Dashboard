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
    impressions: number
    reach: number
    profileVisits: number
    newFollowers: number
    engagementRate: number
  } | null
  reelCount?: number
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
          impressions: snapshot.impressions,
          reach: snapshot.reach,
          profileVisits: snapshot.profileVisits,
          newFollowers: snapshot.newFollowers,
          engagementRate: snapshot.engagementRate,
        }
      : null,
    reelCount,
  })
}
