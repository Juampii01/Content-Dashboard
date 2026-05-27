/**
 * GET /api/youtube/channel-summary
 *
 * Returns the connection state + most recent AccountSnapshot for the active
 * client's YouTube channel. Used by the /youtube dashboard to decide whether
 * to show the "Conectar" / "Sincronizar" / data view.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const connection = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'youtube' } },
    select: {
      accountId: true,
      accountName: true,
      accountPic: true,
      connectedAt: true,
      expiresAt: true,
      refreshToken: true,
    },
  })

  if (!connection) {
    return NextResponse.json({ connected: false })
  }

  const snapshot = await db.accountSnapshot.findFirst({
    where: { clientId, platform: 'youtube' },
    orderBy: { date: 'desc' },
  })

  const videosCount = await db.youTubeVideo.count({ where: { clientId } })

  return NextResponse.json({
    connected: true,
    channel: {
      id: connection.accountId,
      name: connection.accountName,
      avatarUrl: connection.accountPic,
      connectedAt: connection.connectedAt.toISOString(),
      // expired if expiresAt passed AND we lack a refresh token
      needsReconnect: !connection.refreshToken,
    },
    snapshot: snapshot
      ? {
          date: snapshot.date.toISOString(),
          subscribers: snapshot.followers,
          totalViews: snapshot.totalViews,
          videoCount: snapshot.posts,
        }
      : null,
    videosCount,
  })
}
