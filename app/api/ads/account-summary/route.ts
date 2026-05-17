/**
 * GET /api/ads/account-summary
 *
 * Returns the Meta Ads connection state + aggregate stats across all campaigns
 * for the active client (total spend, impressions, clicks, avg ROAS).
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

  const connection = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'meta-ads' } },
    select: { accountName: true, accountPic: true, expiresAt: true },
  })

  const connected = Boolean(connection)
  const tokenExpired = connection?.expiresAt ? connection.expiresAt < new Date() : false

  if (!connected) {
    return NextResponse.json({ connected: false, tokenExpired: false, account: null, stats: null, campaignsCount: 0 })
  }

  // Aggregate across all stored campaigns for this client
  const [agg, campaignsCount] = await Promise.all([
    db.adCampaign.aggregate({
      where: { clientId, platform: 'meta' },
      _sum: { spend: true, impressions: true, clicks: true, conversions: true },
      _avg: { roas: true, ctr: true },
    }),
    db.adCampaign.count({ where: { clientId, platform: 'meta' } }),
  ])

  // Latest syncedAt across any campaign
  const latest = await db.adCampaign.findFirst({
    where: { clientId, platform: 'meta' },
    orderBy: { syncedAt: 'desc' },
    select: { syncedAt: true },
  })

  return NextResponse.json({
    connected,
    tokenExpired,
    account: connection ? { accountName: connection.accountName, accountPic: connection.accountPic } : null,
    stats: campaignsCount > 0
      ? {
          spend: agg._sum.spend ?? 0,
          impressions: agg._sum.impressions ?? 0,
          clicks: agg._sum.clicks ?? 0,
          conversions: agg._sum.conversions ?? 0,
          avgRoas: agg._avg.roas ?? 0,
          avgCtr: agg._avg.ctr ?? 0,
          syncedAt: latest?.syncedAt?.toISOString() ?? null,
        }
      : null,
    campaignsCount,
  })
}
