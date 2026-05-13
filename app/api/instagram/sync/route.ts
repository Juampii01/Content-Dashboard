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
import { maybeRefreshToken } from '@/lib/instagram/refresh-token'
import {
  startRun as apifyStartRun,
  pollRun as apifyPollRun,
  fetchItems as apifyFetchItems,
  type ApifyReelItem,
} from '@/lib/apify/instagram-reel-scraper'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRAPH = 'https://graph.facebook.com/v19.0'
const APIFY_REEL_LIMIT = 50

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

/** Derive an instagramId / shortcode from an Apify reel-scraper item. */
function shortcodeFromUrl(url: string): string {
  const m = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
  return m?.[1] ?? ''
}

/**
 * Run an Apify reel-scrape for the given handle and upsert the results into
 * UserReel.  Used when the SocialConnection has no real access token (i.e.
 * connected via /api/instagram/connect-handle instead of OAuth).
 */
async function syncViaApify(
  handle: string,
  clientId: string,
  userId: string,
): Promise<{ ok: true; reelsSynced: number } | { ok: false; status: number; error: string; detail?: string }> {
  let runId: string
  try {
    const r = await apifyStartRun([handle], APIFY_REEL_LIMIT)
    runId = r.runId
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[instagram/sync · apify] startRun failed:', message)
    return { ok: false, status: 502, error: 'APIFY_START_FAILED', detail: message }
  }

  const poll = await apifyPollRun(runId, { pollIntervalMs: 4_000, maxWaitMs: 120_000 })
  if (poll.status !== 'SUCCEEDED' || !poll.datasetId) {
    return {
      ok: false,
      status: 502,
      error: 'APIFY_RUN_FAILED',
      detail: poll.error ?? 'no datasetId',
    }
  }

  let items: ApifyReelItem[]
  try {
    items = await apifyFetchItems(poll.datasetId, APIFY_REEL_LIMIT)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[instagram/sync · apify] fetchItems failed:', message)
    return { ok: false, status: 502, error: 'APIFY_FETCH_FAILED', detail: message }
  }

  const upserts = await Promise.allSettled(
    items.map((item) => {
      const shortcode =
        item.shortCode?.trim() ||
        (item.url ? shortcodeFromUrl(item.url) : '')
      const instagramId = String(item.id ?? '').trim() || shortcode
      if (!instagramId) {
        return Promise.reject(new Error('item without id/shortcode'))
      }
      const url = item.url?.trim() || `https://www.instagram.com/reel/${shortcode}/`
      const publishedAt =
        item.timestamp && !isNaN(Date.parse(item.timestamp))
          ? new Date(item.timestamp)
          : null

      return db.userReel.upsert({
        where: { instagramId },
        create: {
          clientId,
          createdBy: userId,
          updatedBy: userId,
          instagramId,
          shortcode: shortcode || instagramId,
          url,
          thumbnailUrl: item.displayUrl ?? null,
          videoUrl: item.videoUrl ?? null,
          caption: item.caption ?? null,
          durationSec: item.videoDuration ?? null,
          viewsCount: item.videoPlayCount ?? 0,
          likesCount: item.likesCount ?? 0,
          commentsCount: item.commentsCount ?? 0,
          sharesCount: item.sharesCount ?? 0,
          publishedAt,
          mediaType: 'REELS',
          syncedAt: new Date(),
        },
        update: {
          updatedBy: userId,
          shortcode: shortcode || instagramId,
          url,
          thumbnailUrl: item.displayUrl ?? null,
          videoUrl: item.videoUrl ?? null,
          caption: item.caption ?? null,
          durationSec: item.videoDuration ?? null,
          viewsCount: item.videoPlayCount ?? 0,
          likesCount: item.likesCount ?? 0,
          commentsCount: item.commentsCount ?? 0,
          sharesCount: item.sharesCount ?? 0,
          publishedAt,
          mediaType: 'REELS',
          syncedAt: new Date(),
        },
      })
    }),
  )

  const reelsSynced = upserts.filter((r) => r.status === 'fulfilled').length
  return { ok: true, reelsSynced }
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

  // 1. Load connection
  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) {
    return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
  }

  // 2. Branch on connection mode:
  //    accessToken === ''  → Apify path (connected via @handle)
  //    accessToken !== ''  → Graph API path (real OAuth — legacy / future)
  if (conn.accessToken === '') {
    const r = await syncViaApify(conn.accountId, clientId, userId)
    if (!r.ok) {
      return NextResponse.json(
        { error: r.error, detail: r.detail },
        { status: r.status },
      )
    }
    return NextResponse.json({
      ok: true,
      synced: { reels: r.reelsSynced, snapshot: false },
      via: 'apify',
    })
  }

  // 3. Graph API path — only runs when a real OAuth access token is present.
  //    Token expiry check
  if (conn.expiresAt && conn.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })
  }

  const igId = conn.accountId
  // Refresh token if expiring within 7 days (no-op if token is still fresh)
  const accessToken = await maybeRefreshToken(
    { accessToken: conn.accessToken, expiresAt: conn.expiresAt, clientId },
    userId,
  )

  // 4. Fetch latest media (50) — video_views available for VIDEO/REELS without App Review
  const mediaUrl =
    `${GRAPH}/${igId}/media` +
    `?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,shortcode,video_views` +
    `&limit=50&access_token=${encodeURIComponent(accessToken)}`

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
    console.error('[instagram/sync] media fetch failed', mediaRes.err)
    return NextResponse.json({ error: 'SYNC_FAILED', detail: message }, { status: 502 })
  }

  const mediaParsed = InstagramMediaListSchema.safeParse(mediaRes.data)
  if (!mediaParsed.success) {
    console.error('[instagram/sync] media payload did not match schema', mediaParsed.error.flatten())
    return NextResponse.json({ error: 'SYNC_FAILED', detail: 'invalid_media_payload' }, { status: 502 })
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
            mediaType: u.mediaType,
            syncedAt: new Date(),
          },
          update: {
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
            mediaType: u.mediaType,
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

  // 5. Per-media insights (requires instagram_manage_insights scope — skip silently if unavailable)
  //    Fetches saves, impressions, reach per VIDEO/REELS item and patches viewsCount/savesCount.
  const videoMedia = mediaParsed.data.data.filter(
    (m) => m.media_type === 'VIDEO' || m.media_type === 'REELS',
  )
  if (videoMedia.length > 0) {
    await Promise.allSettled(
      videoMedia.map(async (m) => {
        const insightUrl =
          `${GRAPH}/${m.id}/insights` +
          `?metric=impressions,reach,saved,video_views` +
          `&access_token=${encodeURIComponent(accessToken)}`
        const insRes = await graphGet<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(insightUrl)
        if (!insRes.ok) return // 403 = scope not available, skip
        const vals: Record<string, number> = {}
        for (const metric of insRes.data.data) {
          vals[metric.name] = metric.values?.[0]?.value ?? 0
        }
        const views = vals['video_views'] ?? 0
        const saves = vals['saved'] ?? 0
        if (views > 0 || saves > 0) {
          await db.userReel.updateMany({
            where: { instagramId: m.id, clientId },
            data: {
              ...(views > 0 ? { viewsCount: views } : {}),
              ...(saves > 0 ? { savesCount: saves } : {}),
              updatedBy: userId,
            },
          })
        }
      }),
    )
  }

  // 6. Account-level insights (requires instagram_manage_insights — skip silently if unavailable)
  //    Fetches impressions, reach, profile_views, follower_count for today.
  const insightsSince = Math.floor(Date.now() / 1000) - 86400 // yesterday
  const insightsUntil = Math.floor(Date.now() / 1000)
  const accountInsightUrl =
    `${GRAPH}/${igId}/insights` +
    `?metric=impressions,reach,profile_views` +
    `&period=day&since=${insightsSince}&until=${insightsUntil}` +
    `&access_token=${encodeURIComponent(accessToken)}`

  const accountInsightRes = await graphGet<{
    data: Array<{ name: string; values: Array<{ value: number; end_time: string }> }>
  }>(accountInsightUrl)

  let insightsData: { impressions: number; reach: number; profileViews: number } | null = null
  if (accountInsightRes.ok) {
    const agg: Record<string, number> = {}
    for (const metric of accountInsightRes.data.data) {
      agg[metric.name] = metric.values.reduce((s, v) => s + (v.value ?? 0), 0)
    }
    insightsData = {
      impressions:  agg['impressions']   ?? 0,
      reach:        agg['reach']         ?? 0,
      profileViews: agg['profile_views'] ?? 0,
    }
  }

  // 7. Fetch account info
  const accountUrl =
    `${GRAPH}/${igId}` +
    `?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count` +
    `&access_token=${encodeURIComponent(accessToken)}`
  const accountRes = await graphGet<unknown>(accountUrl)

  let snapshotWritten = false
  if (accountRes.ok) {
    const accountParsed = InstagramAccountSchema.safeParse(accountRes.data)
    if (accountParsed.success) {
      const snap = accountToSnapshot(accountParsed.data)
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
            ...(insightsData ? {
              impressions:  insightsData.impressions,
              reach:        insightsData.reach,
              profileVisits: insightsData.profileViews,
            } : {}),
          },
          update: {
            updatedBy: userId,
            followers: snap.followers,
            posts: snap.posts,
            ...(insightsData ? {
              impressions:  insightsData.impressions,
              reach:        insightsData.reach,
              profileVisits: insightsData.profileViews,
            } : {}),
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
    via: 'graph',
  })
}
