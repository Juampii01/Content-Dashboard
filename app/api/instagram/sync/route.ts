/**
 * POST /api/instagram/sync
 *
 * Pulls the latest media + account info from Instagram Graph API for the
 * active client's connected account and upserts UserReel + AccountSnapshot
 * rows. Requires an existing SocialConnection (platform='instagram').
 *
 * Returns:
 *   200 { ok: true, synced: { reels, snapshot } }
 *   401 { error: 'UNAUTHORIZED' | 'TOKEN_EXPIRED' }
 *   403 { error: 'FORBIDDEN' }
 *   404 { error: 'NOT_CONNECTED' }
 *   429 { error: 'RATE_LIMITED' }
 *   500 { error: 'SYNC_FAILED', detail }
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireActiveClient,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'
import {
  InstagramAccountSchema,
  InstagramGraphErrorSchema,
  InstagramMediaListSchema,
  type InstagramMedia,
} from '@/lib/schemas/instagram'
import { accountToSnapshot, mediaToUserReel } from '@/lib/instagram/transform'
import { getMediaInsights } from '@/lib/instagram/client'
import { decryptToken } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/utils/ratelimit'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Instagram Business Login tokens use unversioned graph.instagram.com endpoints.
// /v21.0/me and /me both 404 in this flow — correct form is /{user_id}.
// The user_id is stored in SocialConnection.accountId at OAuth time.
const GRAPH = 'https://graph.instagram.com'
const GRAPH_VERSION = 'v23.0'

interface GraphErrorInfo {
  status: number
  code: number | null
  subcode: number | null
  message: string
}

async function graphGet<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; err: GraphErrorInfo }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    const parsed = InstagramGraphErrorSchema.safeParse(json)
    const e = parsed.success ? parsed.data.error : null
    return {
      ok: false,
      err: {
        status: res.status,
        code: e?.code ?? null,
        subcode: e?.error_subcode ?? null,
        message: e?.message ?? `HTTP ${res.status}`,
      },
    }
  }
  return { ok: true, data: json as T }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Rate limit — 5 per minute per client (mirrors youtube/sync)
  const rl = await checkRateLimit(clientId, `instagram:sync:${clientId}`, 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  // 1. Load connection
  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) {
    return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
  }

  // 2. Token expiry check
  if (conn.expiresAt && conn.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })
  }

  let accessToken: string
  try {
    accessToken = decryptToken(conn.accessToken)
  } catch (err) {
    console.error('[instagram/sync] token decrypt failed:', err)
    return NextResponse.json({ error: 'TOKEN_DECRYPTION_FAILED', reconnect: true }, { status: 401 })
  }

  // Proactive token refresh when token expires within 7 days
  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  if (conn.expiresAt && conn.expiresAt < soon) {
    try {
      const refreshRes = await fetch('https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' + encodeURIComponent(accessToken))
      if (refreshRes.ok) {
        const d = await refreshRes.json() as { access_token: string; expires_in: number }
        const exp = new Date(); exp.setSeconds(exp.getSeconds() + d.expires_in);
        const { encryptToken: enc } = await import('@/lib/crypto')
        await db.socialConnection.update({ where: { id: conn.id }, data: { accessToken: enc(d.access_token), expiresAt: exp } })
        accessToken = d.access_token
      }
    } catch (e) { console.warn('[instagram/sync] proactive refresh failed (non-fatal):', e) }
  }

  // 3. Fetch ALL media with cursor-based pagination (100 per page, max 5 pages = 500).
  // /v21.0/me/media is the correct endpoint for Instagram Login tokens.
  // Do NOT use /{user_id}/media — that path fails with "unsupported request".
  // conn.accountId (igUserId) is not used in the URL: /me/media works with Instagram Login
  // tokens and avoids the "unsupported request" error from /{user_id}/media.
  // `views` is the v23.0+ field for total plays on Reels (replaces deprecated `video_views`).
  // NOTE: `reach`, `impressions`, `saved`, `shares` require scope `instagram_manage_insights`
  // which is pending Meta App Review. Add them here once approved.
  const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,shortcode,views'
  const firstUrl =
    `${GRAPH}/${GRAPH_VERSION}/me/media` +
    `?fields=${FIELDS}&limit=100&access_token=${encodeURIComponent(accessToken)}`

  // First page — errors here are fatal
  const firstRes = await graphGet<unknown>(firstUrl)
  if (!firstRes.ok) {
    const { code, subcode, status, message } = firstRes.err
    if (code === 190) {
      await db.socialConnection.update({
        where: { clientId_platform: { clientId, platform: 'instagram' } },
        data: { expiresAt: new Date(0), updatedBy: userId },
      })
      return NextResponse.json({ error: 'TOKEN_EXPIRED', detail: message }, { status: 401 })
    }
    if (status === 429 || code === 4 || code === 17 || code === 32 || subcode === 2446079) {
      console.warn('[instagram/sync] rate-limited', { code, subcode, message })
      return NextResponse.json({ error: 'RATE_LIMITED', detail: message }, { status: 429 })
    }
    // For any other error: check the real account_type before assuming personal.
    // "unsupported request"/"method type" means bad endpoint — NOT necessarily personal account.
    // Only return PERSONAL_ACCOUNT if account_type is actually PERSONAL.
    const diagUrl = `${GRAPH}/${GRAPH_VERSION}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(accessToken)}`
    const diagRes = await graphGet<{ user_id?: string; username?: string; account_type?: string }>(diagUrl)
    if (diagRes.ok) {
      const accountType = (diagRes.data as Record<string, unknown>).account_type as string | undefined
      if (accountType && accountType !== 'BUSINESS' && accountType !== 'MEDIA_CREATOR') {
        console.warn('[instagram/sync] PERSONAL_ACCOUNT confirmed via account_type', { accountType, code, subcode, status, message })
        return NextResponse.json({ error: 'PERSONAL_ACCOUNT', detail: message, account_type: accountType }, { status: 422 })
      }
      // Account IS professional but sync still failed — log full details for diagnosis
      console.error('[instagram/sync] media fetch failed for professional account', { accountType, code, subcode, status, message })
    } else {
      console.error('[instagram/sync] media fetch failed AND diag call failed', {
        mediaErr: { code, subcode, status, message },
        diagErr: diagRes.err,
      })
    }
    return NextResponse.json({ error: 'SYNC_FAILED', detail: message }, { status: 502 })
  }

  const firstParsed = InstagramMediaListSchema.safeParse(firstRes.data)
  if (!firstParsed.success) {
    console.error('[instagram/sync] media payload did not match schema', firstParsed.error.flatten())
    return NextResponse.json({ error: 'SYNC_FAILED', detail: 'invalid_media_payload' }, { status: 502 })
  }

  // Paginate: follow paging.next until exhausted (max 4 more pages = 500 total)
  const allMedia: InstagramMedia[] = [...firstParsed.data.data]
  let nextUrl: string | undefined = firstParsed.data.paging?.next
  let pageCount = 1
  while (nextUrl && pageCount < 5) {
    const pageRes = await graphGet<unknown>(nextUrl)
    if (!pageRes.ok) break // non-fatal: stop pagination, keep what we have
    const pageParsed = InstagramMediaListSchema.safeParse(pageRes.data)
    if (!pageParsed.success) break
    allMedia.push(...pageParsed.data.data)
    nextUrl = pageParsed.data.paging?.next
    pageCount++
  }
  if (nextUrl) {
    console.warn(`[instagram:sync] truncated at 500 reels for client ${clientId} — account has more posts`)
  }
  console.log(`[instagram/sync] fetched ${allMedia.length} media items across ${pageCount} page(s)`)

  // Wrap into the shape the rest of the handler expects
  const mediaParsed = { data: { data: allMedia } }

  // If the API returned 0 items, the account is likely personal (not Business/Creator).
  // We still write the snapshot so followers show up, but we tell the client why media is empty.
  if (mediaParsed.data.data.length === 0) {
    // Still try to write account snapshot
    const accountUrl2 =
      `${GRAPH}/${GRAPH_VERSION}/me` +
      `?fields=user_id,username,account_type,profile_picture_url,followers_count,follows_count,media_count` +
      `&access_token=${encodeURIComponent(accessToken)}`
    const accountRes2 = await graphGet<unknown>(accountUrl2)
    if (accountRes2.ok) {
      const accountParsed2 = InstagramAccountSchema.safeParse(accountRes2.data)
      if (accountParsed2.success) {
        const snap2 = accountToSnapshot(accountParsed2.data)
        const today2 = new Date()
        today2.setUTCHours(0, 0, 0, 0)
        await db.accountSnapshot.upsert({
          where: { clientId_platform_date: { clientId, platform: 'instagram', date: today2 } },
          create: { clientId, platform: 'instagram', createdBy: userId, updatedBy: userId, date: today2, followers: snap2.followers, posts: snap2.posts },
          update: { updatedBy: userId, followers: snap2.followers, posts: snap2.posts },
        }).catch(() => {})
        const resolvedName2 = accountParsed2.data.username
        const isNumeric2 = /^\d+$/.test(conn.accountName ?? '')
        if (resolvedName2 && (resolvedName2 !== conn.accountName || isNumeric2)) {
          await db.socialConnection.update({
            where: { clientId_platform: { clientId, platform: 'instagram' } },
            data: { accountName: resolvedName2, accountPic: accountParsed2.data.profile_picture_url ?? conn.accountPic, updatedBy: userId },
          }).catch(() => {})
        }
      }
    }
    return NextResponse.json({
      ok: true,
      synced: { reels: 0, snapshot: true },
      warning: 'NO_MEDIA_RETURNED',
    })
  }

  // 4. Upsert each reel in parallel (MH-04). Failures are logged per-reel so
  // one bad row doesn't abort the rest — preserves prior try/catch semantics.
  const upsertResults = await Promise.allSettled(
    mediaParsed.data.data.map(async (m) => {
      const u = mediaToUserReel(m)
      // Views reales desde /{media}/insights — el campo `views` de /me/media vuelve null.
      const insights = await getMediaInsights(m.id, m.media_type ?? '', accessToken)
      const viewsCount = insights.views ?? u.viewsCount
      return db.userReel
        .upsert({
          where: { instagramId: u.instagramId },
          create: {
            clientId,
            createdBy: userId,
            updatedBy: userId,
            instagramId: u.instagramId,
            shortcode: u.shortcode,
            url: u.url,
            thumbnailUrl: u.thumbnailUrl,
            videoUrl: u.videoUrl,
            caption: u.caption,
            likesCount: u.likesCount,
            commentsCount: u.commentsCount,
            viewsCount,
            publishedAt: u.publishedAt,
            syncedAt: new Date(),
          },
          update: {
            clientId,
            updatedBy: userId,
            shortcode: u.shortcode,
            url: u.url,
            thumbnailUrl: u.thumbnailUrl,
            videoUrl: u.videoUrl,
            caption: u.caption,
            likesCount: u.likesCount,
            commentsCount: u.commentsCount,
            viewsCount,
            publishedAt: u.publishedAt,
            syncedAt: new Date(),
          },
        })
        .then(() => u.instagramId)
        .catch((err) => {
          console.error('[instagram/sync] upsert failed for', u.instagramId, err)
          throw err
        })
    }),
  )
  const reelsSynced = upsertResults.filter((r) => r.status === 'fulfilled').length

  // Remove reels that are no longer returned by the API (deleted from Instagram)
  const syncedIds = allMedia.map((m: InstagramMedia) => m.id)
  if (syncedIds.length > 0) {
    await db.userReel.deleteMany({ where: { clientId, instagramId: { notIn: syncedIds } } })
  }

  // Aggregate views + engagement across ALL stored reels for this client so the
  // TopBar can show real numbers (AccountSnapshot.impressions / engagementRate).
  const allReels = await db.userReel.findMany({
    where: { clientId },
    orderBy: { publishedAt: 'desc' },
    select: { viewsCount: true, likesCount: true, commentsCount: true, publishedAt: true },
  })
  const totalViews = allReels.reduce((s, r) => s + r.viewsCount, 0)

  // 5. Fetch account info — /v21.0/me for Instagram Login tokens.
  const accountUrl =
    `${GRAPH}/${GRAPH_VERSION}/me` +
    `?fields=user_id,username,account_type,profile_picture_url,followers_count,follows_count,media_count` +
    `&access_token=${encodeURIComponent(accessToken)}`
  const accountRes = await graphGet<unknown>(accountUrl)

  let snapshotWritten = false
  if (accountRes.ok) {
    const accountParsed = InstagramAccountSchema.safeParse(accountRes.data)
    if (accountParsed.success) {
      const snap = accountToSnapshot(accountParsed.data)
      // Engagement rate: average per-reel engagement of last 30 days.
      // Formula: avg((likes + comments) / followers * 100) per reel.
      // Previous formula used slice(0,30) → could include old reels; now filters by date.
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      const recentReels = allReels.filter((r: { publishedAt: Date | null; viewsCount: number; likesCount: number; commentsCount: number }) => r.publishedAt && new Date(r.publishedAt) >= cutoff)
      const reelsForEngagement = recentReels.length > 0 ? recentReels : allReels.slice(0, 30)
      const engagementRate = snap.followers > 0 && reelsForEngagement.length > 0
        ? reelsForEngagement.reduce((s: number, r: { likesCount: number; commentsCount: number }) => s + ((r.likesCount + r.commentsCount) / snap.followers) * 100, 0) / reelsForEngagement.length
        : 0
      // Normalise to midnight UTC so @@unique([clientId, platform, date]) collapses repeated syncs per day.
      // Scoped by platform='instagram' so YouTube sync can write its own row for the same day without collision.
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      try {
        await db.accountSnapshot.upsert({
          where: {
            clientId_platform_date: { clientId, platform: 'instagram', date: today },
          },
          create: {
            clientId,
            platform: 'instagram',
            createdBy: userId,
            updatedBy: userId,
            date: today,
            followers: snap.followers,
            posts: snap.posts,
            totalViews,
            engagementRate,
          },
          update: {
            updatedBy: userId,
            followers: snap.followers,
            posts: snap.posts,
            totalViews,
            engagementRate,
          },
        })
        snapshotWritten = true

        // Refresh accountName/pic on the connection.
        // Always update if current accountName looks like a numeric ID (fallback
        // from failed profile fetch during OAuth) so it self-heals on first sync.
        // Use username first; fall back to name if username not returned by API.
        const resolvedName = accountParsed.data.username
        const accountNameIsNumeric = /^\d+$/.test(conn.accountName ?? '')
        if (
          resolvedName &&
          (resolvedName !== conn.accountName || accountNameIsNumeric)
        ) {
          await db.socialConnection.update({
            where: { clientId_platform: { clientId, platform: 'instagram' } },
            data: {
              accountName: resolvedName,
              accountPic: accountParsed.data.profile_picture_url ?? conn.accountPic,
              updatedBy: userId,
            },
          })
          console.log('[instagram/sync] accountName updated to', resolvedName)
        }
      } catch (e) {
        console.error('[instagram/sync] snapshot upsert failed', e)
      }
    } else {
      console.warn('[instagram/sync] account payload did not match schema', accountParsed.error.flatten())
    }
  } else {
    console.warn('[instagram/sync] account fetch failed (non-fatal)', accountRes.err)
  }

  return NextResponse.json({
    ok: true,
    synced: { reels: reelsSynced, snapshot: snapshotWritten },
  })
}
