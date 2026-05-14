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

import { NextRequest, NextResponse } from 'next/server'
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
  InstagramMediaInsightsSchema,
} from '@/lib/schemas/instagram'
import { accountToSnapshot, mediaToUserReel } from '@/lib/instagram/transform'
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'instagram-sync', 5, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

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

  // Token expiry is only set to new Date(0) when the Graph API returns error 190.
  // Page tokens from a long-lived user token don't have a natural expiry, so we
  // skip the pre-check and let the 190 handler below cover invalidated tokens.
  if (conn.expiresAt && conn.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })
  }

  const igId = conn.accountId
  const accessToken = conn.accessToken

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
            publishedAt: u.publishedAt,
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

  // 5. Fetch per-reel insights (requires instagram_manage_insights scope).
  // Probe the first reel: if the scope isn't approved yet, the API returns a
  // permissions error (code 10 / 200) and we skip the rest silently so the
  // sync still succeeds with the data we have. Once App Review is approved,
  // all reels get viewsCount / impressions / reachCount / savesCount / sharesCount.
  const INSIGHT_PERMISSION_ERRORS = new Set([10, 200, 190])
  let insightsSynced = 0

  if (mediaParsed.data.data.length > 0) {
    const [firstMedia, ...restMedia] = mediaParsed.data.data

    const fetchInsights = async (mediaId: string, mediaType: string | undefined) => {
      const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS'
      const metrics = isVideo
        ? 'plays,impressions,reach,saved,shares'
        : 'impressions,reach,saved,shares'
      const url =
        `${GRAPH}/${mediaId}/insights?metric=${metrics}` +
        `&access_token=${encodeURIComponent(accessToken)}`
      const res = await graphGet<unknown>(url)
      if (!res.ok) return null
      const parsed = InstagramMediaInsightsSchema.safeParse(res.data)
      if (!parsed.success) return null
      const vals: Record<string, number> = {}
      for (const item of parsed.data.data) {
        vals[item.name] = item.values[0]?.value ?? 0
      }
      return vals
    }

    const probeVals = await fetchInsights(firstMedia.id, firstMedia.media_type)

    if (probeVals !== null) {
      // Scope available — apply first reel and fetch the rest in parallel
      const applyInsights = async (mediaId: string, vals: Record<string, number>) => {
        await db.userReel.update({
          where: { instagramId: mediaId },
          data: {
            viewsCount: vals.plays ?? 0,
            impressions: vals.impressions ?? 0,
            reachCount: vals.reach ?? 0,
            savesCount: vals.saved ?? 0,
            sharesCount: vals.shares ?? 0,
          },
        })
      }

      const remainingResults = await Promise.allSettled(
        restMedia.map(async (m) => {
          const vals = await fetchInsights(m.id, m.media_type)
          if (vals) await applyInsights(m.id, vals)
          return vals !== null
        }),
      )

      await applyInsights(firstMedia.id, probeVals).catch(() => null)
      insightsSynced =
        1 + remainingResults.filter((r) => r.status === 'fulfilled' && r.value).length
    } else {
      // Check if it was a permission error by probing again — graphGet already
      // returned null meaning the parse failed; check the raw error via a fresh call
      const probeUrl =
        `${GRAPH}/${firstMedia.id}/insights?metric=impressions` +
        `&access_token=${encodeURIComponent(accessToken)}`
      const probeRaw = await graphGet<unknown>(probeUrl)
      if (!probeRaw.ok && probeRaw.err.code !== null && INSIGHT_PERMISSION_ERRORS.has(probeRaw.err.code)) {
        console.info('[instagram/sync] instagram_manage_insights not yet approved — insights skipped')
      } else {
        console.warn('[instagram/sync] insights probe failed (non-fatal)', probeRaw.ok ? 'parse error' : probeRaw.err)
      }
    }
  }

  // 6b. Sync stories
  const storiesUrl =
    `${GRAPH}/me/stories?fields=id,media_url,thumbnail_url,timestamp` +
    `&access_token=${encodeURIComponent(accessToken)}`
  const storiesRes = await graphGet<unknown>(storiesUrl)
  let storiesSynced = 0
  if (storiesRes.ok) {
    const storiesData = storiesRes.data as {
      data?: Array<{ id: string; media_url?: string; thumbnail_url?: string; timestamp?: string }>
    }
    const storiesList = storiesData.data ?? []

    await Promise.allSettled(
      storiesList.map(async (s) => {
        await db.story.upsert({
          where: { instagramId: s.id },
          create: {
            clientId,
            createdBy: userId,
            updatedBy: userId,
            instagramId: s.id,
            thumbnailUrl: s.thumbnail_url ?? s.media_url ?? null,
            publishedAt: s.timestamp ? new Date(s.timestamp) : null,
          },
          update: {
            updatedBy: userId,
            thumbnailUrl: s.thumbnail_url ?? s.media_url ?? null,
            publishedAt: s.timestamp ? new Date(s.timestamp) : null,
          },
        })
        storiesSynced++
      }),
    )
  }

  // 7. Fetch account info
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
          },
          update: {
            updatedBy: userId,
            followers: snap.followers,
            posts: snap.posts,
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
    synced: { reels: reelsSynced, snapshot: snapshotWritten, insights: insightsSynced, stories: storiesSynced },
  })
}
