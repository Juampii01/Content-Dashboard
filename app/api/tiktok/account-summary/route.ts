/**
 * GET /api/tiktok/account-summary
 *
 * Returns the connection state + most recent AccountSnapshot for the active
 * client's TikTok account. Used by the /tiktok dashboard to decide whether
 * to show "Conectar" / "Sincronizar" / data view.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try {
    ;({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const [connection, snapshot, videosCount] = await Promise.all([
    db.socialConnection.findUnique({
      where: { clientId_platform: { clientId, platform: 'tiktok' } },
      select: {
        accountName: true,
        accountPic: true,
        expiresAt: true,
        refreshToken: true,
      },
    }),
    db.accountSnapshot.findFirst({
      where: { clientId, platform: 'tiktok' },
      orderBy: { date: 'desc' },
      select: {
        followers: true,
        following: true,
        posts: true,
        totalViews: true,
        engagementRate: true,
        date: true,
      },
    }),
    db.tikTokVideo.count({ where: { clientId } }),
  ])

  if (!connection) {
    return NextResponse.json({
      connected: false,
      tokenExpired: false,
      account: null,
      latestSnapshot: null,
      videosCount: 0,
    })
  }

  const tokenExpired = connection.expiresAt ? connection.expiresAt < new Date() && !connection.refreshToken : false

  return NextResponse.json({
    connected: true,
    tokenExpired,
    account: {
      accountName: connection.accountName ?? '',
      accountPic: connection.accountPic ?? null,
    },
    latestSnapshot: snapshot
      ? {
          followers: snapshot.followers,
          following: snapshot.following,
          posts: snapshot.posts,
          totalViews: snapshot.totalViews,
          engagementRate: snapshot.engagementRate,
          date: snapshot.date.toISOString(),
        }
      : null,
    videosCount,
  })
}
