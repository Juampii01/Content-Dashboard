/**
 * GET /api/ads/monthly-insights
 *
 * Returns aggregated monthly spend/impressions/clicks/reach for the last year
 * across all AdAccounts of the active client's Meta Ads connection.
 *
 * Meta Graph API:
 *   /act_{accountId}/insights?fields=spend,impressions,clicks,reach
 *     &time_increment=monthly&date_preset=last_year
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { decryptToken } from '@/lib/crypto'
import { META_GRAPH_BASE as GRAPH } from '@/lib/meta'

interface MetaMonthlyInsightRecord {
  spend: string
  impressions: string
  clicks: string
  reach: string
  date_start: string
}

interface MetaInsightsResponse {
  data?: MetaMonthlyInsightRecord[]
}

interface MonthBucket {
  spend: number
  impressions: number
  clicks: number
  reach: number
}

function parseNum(s: string | undefined): number {
  const n = parseFloat(s ?? '0')
  return isNaN(n) ? 0 : n
}

// Returns "YYYY-MM" from a date string like "2024-01-01"
function toYearMonth(dateStart: string): string {
  return dateStart.slice(0, 7)
}

export async function GET(): Promise<NextResponse> {
  // Rate limit
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'ads-monthly', 10, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  // Auth
  let clientId: string
  try {
    ;({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Connection
  const connection = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'meta-ads' } },
  })
  if (!connection || (connection.expiresAt !== null && connection.expiresAt < new Date())) {
    return NextResponse.json({ months: [] })
  }

  // Ad accounts
  const adAccounts = await db.adAccount.findMany({
    where: { clientId, platform: 'meta' },
    select: { accountId: true },
  })
  if (adAccounts.length === 0) {
    return NextResponse.json({ months: [] })
  }

  const accessToken = decryptToken(connection.accessToken)
  const monthMap = new Map<string, MonthBucket>()

  await Promise.allSettled(
    adAccounts.map(async ({ accountId }) => {
      const url =
        `${GRAPH}/act_${accountId}/insights` +
        `?fields=spend,impressions,clicks,reach` +
        `&time_increment=monthly` +
        `&date_preset=last_year` +
        `&access_token=${encodeURIComponent(accessToken)}`

      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) {
        console.warn('[ads/monthly-insights] insights fetch failed for', accountId, res.status)
        return
      }

      const json = (await res.json()) as MetaInsightsResponse
      const records = json.data ?? []

      for (const record of records) {
        const month = toYearMonth(record.date_start)
        const existing = monthMap.get(month) ?? { spend: 0, impressions: 0, clicks: 0, reach: 0 }
        monthMap.set(month, {
          spend: existing.spend + parseNum(record.spend),
          impressions: existing.impressions + Math.round(parseNum(record.impressions)),
          clicks: existing.clicks + Math.round(parseNum(record.clicks)),
          reach: existing.reach + Math.round(parseNum(record.reach)),
        })
      }
    }),
  )

  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bucket]) => ({ month, ...bucket }))

  return NextResponse.json({ months })
}
