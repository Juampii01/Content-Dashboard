/**
 * GET /api/ads/campaigns
 *
 * Returns stored AdCampaign rows for the active client, ordered by spend desc.
 * Query params: platform (default 'meta'), limit (default 50, max 100), cursor
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { AdCampaignsQuerySchema } from '@/lib/schemas/ads'

export async function GET(req: NextRequest): Promise<NextResponse> {
  let clientId: string
  try {
    ;({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const parsed = AdCampaignsQuerySchema.safeParse({
    platform: req.nextUrl.searchParams.get('platform') ?? undefined,
    limit: req.nextUrl.searchParams.get('limit') ?? undefined,
    cursor: req.nextUrl.searchParams.get('cursor') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }
  const { platform, limit, cursor } = parsed.data

  const rows = await db.adCampaign.findMany({
    where: { clientId, platform },
    orderBy: [{ spend: 'desc' }, { id: 'asc' }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      campaignId: c.campaignId,
      name: c.name,
      status: c.status,
      objective: c.objective,
      spend: c.spend,
      impressions: c.impressions,
      clicks: c.clicks,
      reach: c.reach,
      ctr: c.ctr,
      cpc: c.cpc,
      roas: c.roas,
      conversions: c.conversions,
      datePreset: c.datePreset,
      syncedAt: c.syncedAt.toISOString(),
    })),
    nextCursor,
  })
}
