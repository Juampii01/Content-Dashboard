/**
 * POST /api/ads/sync
 *
 * Pulls Meta Ads campaigns + 30-day insights for every accessible ad account
 * of the active client's connected Meta Ads SocialConnection.
 * Upserts AdAccount + AdCampaign rows and returns a summary.
 *
 * Meta Graph API docs:
 *   /me/adaccounts  → list ad accounts
 *   /act_{id}/campaigns?fields=id,name,status,objective,insights.date_preset(last_30d){...}
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { MetaAdAccountsResponseSchema, MetaCampaignsResponseSchema } from '@/lib/schemas/ads'

const GRAPH = 'https://graph.facebook.com/v19.0'
const DATE_PRESET = 'last_30d'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(s: string | undefined): number {
  const n = parseFloat(s ?? '0')
  return isNaN(n) ? 0 : n
}

function extractConversions(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0
  const conversions = actions.find(
    (a) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase',
  )
  return conversions ? parseInt(conversions.value, 10) || 0 : 0
}

function extractRoas(
  actionValues: Array<{ action_type: string; value: string }> | undefined,
  spend: number,
): number {
  if (!actionValues || spend <= 0) return 0
  const revenue = actionValues
    .filter(
      (a) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase',
    )
    .reduce((s, a) => s + parseNum(a.value), 0)
  return revenue > 0 ? revenue / spend : 0
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(): Promise<NextResponse> {
  // Rate limit
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'ads-sync', 5, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  // Auth
  let userId: string
  let clientId: string
  try {
    ;({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Connection
  const connection = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'meta-ads' } },
  })
  if (!connection) {
    return NextResponse.json({ error: 'NOT_CONNECTED', message: 'Conecta Meta Ads antes de sincronizar.' }, { status: 404 })
  }

  const accessToken = connection.accessToken

  try {
    // 1. Fetch all ad accounts
    const accountsUrl =
      `${GRAPH}/me/adaccounts?fields=id,name,currency,account_status&limit=25&access_token=${encodeURIComponent(accessToken)}`
    const accountsRes = await fetch(accountsUrl, { signal: AbortSignal.timeout(15_000) })
    if (!accountsRes.ok) {
      const text = await accountsRes.text()
      console.error('[ads/sync] adaccounts error:', accountsRes.status, text.slice(0, 300))
      if (accountsRes.status === 401 || accountsRes.status === 403) {
        return NextResponse.json({ error: 'AUTH_EXPIRED', message: 'Token de Meta Ads expirado. Reconecta la cuenta.', reconnect: true }, { status: 401 })
      }
      return NextResponse.json({ error: 'META_API_ERROR', message: `adaccounts: ${accountsRes.status}` }, { status: 502 })
    }

    const accountsRaw = await accountsRes.json()
    const accountsParsed = MetaAdAccountsResponseSchema.safeParse(accountsRaw)
    if (!accountsParsed.success) {
      console.error('[ads/sync] adaccounts shape drift:', accountsParsed.error.flatten())
      return NextResponse.json({ error: 'UPSTREAM_SHAPE_DRIFT', endpoint: 'adaccounts' }, { status: 502 })
    }

    const adAccounts = accountsParsed.data.data ?? []
    if (adAccounts.length === 0) {
      return NextResponse.json({ ok: true, synced: { accounts: 0, campaigns: 0 }, warning: 'NO_AD_ACCOUNTS' })
    }

    let totalCampaigns = 0

    // 2. For each account: upsert AdAccount + fetch + upsert campaigns
    for (const acct of adAccounts) {
      // Upsert AdAccount
      const dbAccount = await db.adAccount.upsert({
        where: { clientId_platform_accountId: { clientId, platform: 'meta', accountId: acct.id } },
        create: {
          clientId,
          createdBy: userId,
          updatedBy: userId,
          platform: 'meta',
          accountId: acct.id,
          accountName: acct.name ?? acct.id,
          currency: acct.currency ?? 'USD',
          syncedAt: new Date(),
        },
        update: {
          updatedBy: userId,
          accountName: acct.name ?? acct.id,
          currency: acct.currency ?? 'USD',
          syncedAt: new Date(),
        },
      })

      // 3. Fetch campaigns with 30d insights
      const insightFields = `spend,impressions,clicks,reach,ctr,cpc,actions,action_values`
      const campaignsUrl =
        `${GRAPH}/${acct.id}/campaigns` +
        `?fields=id,name,status,objective,insights.date_preset(${DATE_PRESET}){${insightFields}}` +
        `&limit=50&access_token=${encodeURIComponent(accessToken)}`

      const campaignsRes = await fetch(campaignsUrl, { signal: AbortSignal.timeout(15_000) })
      if (!campaignsRes.ok) {
        console.warn('[ads/sync] campaigns fetch failed for', acct.id, campaignsRes.status)
        continue
      }

      const campaignsRaw = await campaignsRes.json()
      const campaignsParsed = MetaCampaignsResponseSchema.safeParse(campaignsRaw)
      if (!campaignsParsed.success) {
        console.warn('[ads/sync] campaigns shape drift for', acct.id)
        continue
      }

      const campaigns = campaignsParsed.data.data ?? []
      const syncedAt = new Date()

      const results = await Promise.allSettled(
        campaigns.map((c) => {
          const insights = c.insights?.data?.[0]
          const spend = parseNum(insights?.spend)
          const impressions = Math.round(parseNum(insights?.impressions))
          const clicks = Math.round(parseNum(insights?.clicks))
          const reach = Math.round(parseNum(insights?.reach))
          const ctr = parseNum(insights?.ctr)
          const cpc = parseNum(insights?.cpc)
          const conversions = extractConversions(insights?.actions)
          const roas = extractRoas(insights?.action_values, spend)

          const payload = {
            clientId,
            adAccountId: dbAccount.id,
            platform: 'meta' as const,
            name: c.name ?? c.id,
            status: c.status ?? 'UNKNOWN',
            objective: c.objective ?? '',
            spend,
            impressions,
            clicks,
            reach,
            ctr,
            cpc,
            roas,
            conversions,
            datePreset: DATE_PRESET,
            syncedAt,
          }

          return db.adCampaign.upsert({
            where: { campaignId: c.id },
            create: { campaignId: c.id, createdAt: new Date(), ...payload },
            update: { ...payload },
          }).catch((err: unknown) => {
            console.error('[ads/sync] campaign upsert failed:', c.id, err)
            throw err
          })
        }),
      )

      totalCampaigns += results.filter((r) => r.status === 'fulfilled').length
    }

    return NextResponse.json({ ok: true, synced: { accounts: adAccounts.length, campaigns: totalCampaigns } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ads/sync] error:', message)
    return NextResponse.json({ error: 'SYNC_FAILED', message }, { status: 500 })
  }
}
