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
} from '@/lib/schemas/instagram'
import { accountToSnapshot, mediaToUserReel } from '@/lib/instagram/transform'
import { decryptToken } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/utils/ratelimit'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRAPH = 'https://graph.instagram.com'

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

  const accessToken = decryptToken(conn.accessToken)

  // 3. Fetch latest media (25)
  const mediaUrl =
    `${GRAPH}/me/media` +
    `?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,shortcode` +
    `&limit=25&access_token=${encodeURIComponent(accessToken)}`

  const mediaRes = await graphGet<unknown>(mediaUrl)
  if (!mediaRes.ok) {
    const { code, subcode, status, message } = mediaRes.err
    // Token invalidated: 190 = invalid/expired OAuth token
    if (code === 190) {
      await db.socialConnection.update({
        where: { clientId_platform: { clientId, platform: 'instagram' } },
        data: { expiresAt: new Date(0), updatedBy: userId },
      })
      return NextResponse.json({ error: 'TOKEN_EXPIRED', detail: message }, { status: 401 })
    }
    // Rate limited: code 4 (app) / 17 (user) / 32 (page), or 429
    if (status === 429 || code === 4 || code === 17 || code === 32 || subcode === 2446079) {
      console.warn('[instagram/sync] rate-limited', { code, subcode, message })
      return NextResponse.json({ error: 'RATE_LIMITED', detail: message }, { status: 429 })
    }
    // "Unsupported request - method type: get" → personal account connected via
    // Business Login. The /me/media endpoint only works for Business/Creator accounts.
    if (message.toLowerCase().includes('unsupported request') || message.toLowerCase().includes('method type')) {
      return NextResponse.json({ error: 'PERSONAL_ACCOUNT' }, { status: 422 })
    }
    console.error('[instagram/sync] media fetch failed', mediaRes.err)
    return NextResponse.json({ error: 'SYNC_FAILED', detail: message }, { status: 502 })
  }

  const mediaParsed = InstagramMediaListSchema.safeParse(mediaRes.data)
  if (!mediaParsed.success) {
    console.error('[instagram/sync] media payload did not match schema', mediaParsed.error.flatten())
    return NextResponse.json({ error: 'SYNC_FAILED', detail: 'invalid_media_payload' }, { status: 502 })
  }

  // If the API returned 0 items, the account is likely personal (not Business/Creator).
  // We still write the snapshot so followers show up, but we tell the client why media is empty.
  if (mediaParsed.data.data.length === 0) {
    // Still try to write account snapshot
    const accountUrl2 =
      `${GRAPH}/me` +
      `?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count` +
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
        if (accountParsed2.data.username && accountParsed2.data.username !== conn.accountName) {
          await db.socialConnection.update({
            where: { clientId_platform: { clientId, platform: 'instagram' } },
            data: { accountName: accountParsed2.data.username, accountPic: accountParsed2.data.profile_picture_url ?? conn.accountPic, updatedBy: userId },
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
    mediaParsed.data.data.map((m) => {
      const u = mediaToUserReel(m)
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
            viewsCount: u.viewsCount,
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
            viewsCount: u.viewsCount,
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

  // Aggregate views + engagement across ALL stored reels for this client so the
  // TopBar can show real numbers (AccountSnapshot.impressions / engagementRate).
  const allReels = await db.userReel.findMany({
    where: { clientId },
    select: { viewsCount: true, likesCount: true, commentsCount: true },
  })
  const totalViews = allReels.reduce((s, r) => s + r.viewsCount, 0)
  const totalInteractions = allReels.reduce((s, r) => s + r.likesCount + r.commentsCount, 0)

  // 5. Fetch account info
  const accountUrl =
    `${GRAPH}/me` +
    `?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count` +
    `&access_token=${encodeURIComponent(accessToken)}`
  const accountRes = await graphGet<unknown>(accountUrl)

  let snapshotWritten = false
  if (accountRes.ok) {
    const accountParsed = InstagramAccountSchema.safeParse(accountRes.data)
    if (accountParsed.success) {
      const snap = accountToSnapshot(accountParsed.data)
      const engagementRate = snap.followers > 0
        ? (totalInteractions / snap.followers) * 100
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
            impressions: totalViews,
            engagementRate,
          },
          update: {
            updatedBy: userId,
            followers: snap.followers,
            posts: snap.posts,
            impressions: totalViews,
            engagementRate,
          },
        })
        snapshotWritten = true

        // Refresh accountName/pic on the connection if they changed
        if (
          accountParsed.data.username &&
          accountParsed.data.username !== conn.accountName
        ) {
          await db.socialConnection.update({
            where: { clientId_platform: { clientId, platform: 'instagram' } },
            data: {
              accountName: accountParsed.data.username,
              accountPic: accountParsed.data.profile_picture_url ?? conn.accountPic,
              updatedBy: userId,
            },
          })
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
