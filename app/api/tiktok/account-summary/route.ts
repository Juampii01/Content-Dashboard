/**
 * GET /api/tiktok/account-summary
 *
 * Connection status for the active client's TikTok account.
 * Same shape as /api/instagram/account-summary.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActiveClientId, getUserIdOrNull } from '@/lib/auth-user'

interface Response {
  connected: boolean
  reason?: 'NO_SESSION' | 'NO_ACTIVE_CLIENT' | 'NOT_CONNECTED'
  accountName?: string
  accountPic?: string | null
  videoCount?: number
}

export async function GET(): Promise<NextResponse<Response>> {
  const userId = await getUserIdOrNull()
  if (!userId) return NextResponse.json({ connected: false, reason: 'NO_SESSION' })
  const clientId = await getActiveClientId()
  if (!clientId) return NextResponse.json({ connected: false, reason: 'NO_ACTIVE_CLIENT' })

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'tiktok' } },
    select: { accountName: true, accountPic: true },
  })
  if (!conn) return NextResponse.json({ connected: false, reason: 'NOT_CONNECTED' })

  const videoCount = await db.tikTokVideo.count({ where: { clientId } })

  return NextResponse.json({
    connected: true,
    accountName: conn.accountName,
    accountPic: conn.accountPic,
    videoCount,
  })
}
