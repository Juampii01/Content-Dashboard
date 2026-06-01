/**
 * GET /api/instagram/audience
 *
 * Fetches Instagram audience demographics from the Insights API and caches
 * the result in AudienceSnapshot (one row per day). On subsequent calls the
 * same day the cached row is returned immediately.
 *
 * Metrics fetched:
 *   - audience_gender_age  (lifetime)
 *   - audience_country     (lifetime)
 *   - audience_city        (lifetime)
 *   - follower_count       (day, last 30 days)
 *   - reach                (day, last 30 days)
 *
 * Returns:
 *   200 { cached, date, genderAge, country, city, followerHistory, reachHistory }
 *   401 UNAUTHORIZED | TOKEN_EXPIRED
 *   403 FORBIDDEN
 *   404 NOT_CONNECTED
 *   422 INSUFFICIENT_FOLLOWERS (< 100)
 *   429 RATE_LIMITED
 *   502 FETCH_FAILED
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { decryptToken } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/utils/ratelimit'

const GRAPH = 'https://graph.instagram.com'
const GRAPH_VERSION = 'v23.0'

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface IGInsightsError {
  error: { message: string; type: string; code: number; error_subcode?: number }
}

async function igGet<T>(url: string): Promise<
  { ok: true; data: T } | { ok: false; code: number; subcode: number | null; message: string; status: number }
> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const e = (json as IGInsightsError | null)?.error
      return {
        ok: false,
        status: res.status,
        code: e?.code ?? 0,
        subcode: e?.error_subcode ?? null,
        message: e?.message ?? `HTTP ${res.status}`,
      }
    }
    return { ok: true, data: json as T }
  } catch (e) {
    return { ok: false, status: 0, code: 0, subcode: null, message: String(e) }
  }
}

type InsightValue = Record<string, number>
interface InsightItem {
  name: string
  period: string
  values?: Array<{ value: InsightValue | number; end_time?: string }>
  data?: Array<{ value: InsightValue | number; end_time?: string }>
  title?: string
  id: string
}
interface InsightsResponse {
  data: InsightItem[]
}

interface HistoryPoint { date: string; value: number }

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Rate limit: 10/min
  const rl = await checkRateLimit(clientId, `instagram:audience:${clientId}`, 10, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  // Load connection
  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })

  if (conn.expiresAt && conn.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })
  }

  // Today's cache key (midnight UTC)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Return cached snapshot if already fetched today (only if followerHistory is non-empty)
  const cached = await db.audienceSnapshot.findUnique({
    where: { clientId_platform_date: { clientId, platform: 'instagram', date: today } },
  })
  if (cached) {
    const fh = cached.followerHistory
    const hasHistory = Array.isArray(fh) ? fh.length > 0 : typeof fh === 'string' ? fh !== '[]' : false
    if (hasHistory) {
      return NextResponse.json({
        cached: true,
        date: cached.date.toISOString(),
        genderAge: cached.genderAge,
        country: cached.country,
        city: cached.city,
        followerHistory: cached.followerHistory,
        reachHistory: cached.reachHistory,
      })
    }
  }

  const token = decryptToken(conn.accessToken)
  const t = encodeURIComponent(token)

  // ── Fetch lifetime demographics ────────────────────────────────────────────
  const since30 = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const until0   = Math.floor(Date.now() / 1000)

  const [demoRes, trendRes] = await Promise.all([
    igGet<InsightsResponse>(
      `${GRAPH}/${GRAPH_VERSION}/me/insights?metric=audience_gender_age,audience_country,audience_city&period=lifetime&access_token=${t}`,
    ),
    igGet<InsightsResponse>(
      `${GRAPH}/${GRAPH_VERSION}/me/insights?metric=follower_count,reach&period=day&since=${since30}&until=${until0}&access_token=${t}`,
    ),
  ])

  // Handle fatal errors
  if (!demoRes.ok) {
    const { code, subcode, status, message } = demoRes
    console.error('[instagram/audience] demographics fetch failed', { code, subcode, status, message })
    if (code === 190) {
      await db.socialConnection.update({
        where: { clientId_platform: { clientId, platform: 'instagram' } },
        data: { expiresAt: new Date(0), updatedBy: userId },
      })
      return NextResponse.json({ error: 'TOKEN_EXPIRED', detail: message }, { status: 401 })
    }
    if (status === 429 || code === 4 || code === 17 || code === 32 || subcode === 2446079) {
      return NextResponse.json({ error: 'RATE_LIMITED', detail: message }, { status: 429 })
    }
    // code 100 with "minimum" in message → insufficient followers
    if (message.toLowerCase().includes('minimum') || message.toLowerCase().includes('100 follow')) {
      return NextResponse.json({ error: 'INSUFFICIENT_FOLLOWERS', detail: message }, { status: 422 })
    }
    return NextResponse.json({ error: 'FETCH_FAILED', detail: message }, { status: 502 })
  }

  // ── Parse demographics ─────────────────────────────────────────────────────
  const genderAge: Record<string, number> = {}
  const country: Record<string, number> = {}
  const city: Record<string, number> = {}

  for (const item of demoRes.data.data) {
    const vals = item.values ?? item.data ?? []
    const latest = vals[vals.length - 1]
    if (!latest) continue
    const val = latest.value
    if (typeof val !== 'object') continue

    if (item.name === 'audience_gender_age') Object.assign(genderAge, val)
    else if (item.name === 'audience_country') Object.assign(country, val)
    else if (item.name === 'audience_city')    Object.assign(city, val)
  }

  // ── Parse trends ───────────────────────────────────────────────────────────
  const followerHistory: HistoryPoint[] = []
  const reachHistory: HistoryPoint[] = []
  let trendFailed = false

  if (trendRes.ok) {
    for (const item of trendRes.data.data) {
      const points = item.values ?? item.data ?? []
      const target = item.name === 'follower_count' ? followerHistory : reachHistory
      for (const p of points) {
        target.push({
          date: p.end_time ? p.end_time.slice(0, 10) : '',
          value: typeof p.value === 'number' ? p.value : 0,
        })
      }
    }
  } else {
    trendFailed = true
    console.warn('[instagram/audience] trend metrics fetch failed (non-fatal)', trendRes.message)
  }

  // ── Persist to cache ───────────────────────────────────────────────────────
  // If trend fetch failed, do not overwrite existing followerHistory/reachHistory
  const trendUpdate = trendFailed
    ? {}
    : {
        followerHistory: followerHistory as unknown as Prisma.InputJsonValue,
        reachHistory: reachHistory as unknown as Prisma.InputJsonValue,
      }

  await db.audienceSnapshot.upsert({
    where: { clientId_platform_date: { clientId, platform: 'instagram', date: today } },
    create: {
      clientId,
      platform: 'instagram',
      date: today,
      createdBy: userId,
      updatedBy: userId,
      genderAge,
      country,
      city,
      followerHistory: followerHistory as unknown as Prisma.InputJsonValue,
      reachHistory: reachHistory as unknown as Prisma.InputJsonValue,
    },
    update: {
      updatedBy: userId,
      genderAge,
      country,
      city,
      ...trendUpdate,
    },
  })

  return NextResponse.json({
    cached: false,
    date: today.toISOString(),
    genderAge,
    country,
    city,
    followerHistory,
    reachHistory,
  })
}
