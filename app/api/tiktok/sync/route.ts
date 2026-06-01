/**
 * POST /api/tiktok/sync
 *
 * Pulls the latest account metrics and recent videos for the active client's
 * connected TikTok account. Persists data into TikTokVideo (upsert) and
 * AccountSnapshot (today) and returns a small summary.
 *
 * Requires an active SocialConnection with platform='tiktok'.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { TikTokUserInfoSchema, TikTokVideoListResponseSchema } from '@/lib/schemas/tiktok'
import { encryptToken, decryptToken } from '@/lib/crypto'

const MAX_PAGES = 3
const VIDEOS_PER_PAGE = 20

const TIKTOK_USER_INFO_URL =
  'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,follower_count,following_count,likes_count,video_count'
const TIKTOK_VIDEO_LIST_URL =
  'https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count'

export async function POST(): Promise<NextResponse> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  let userId: string
  let clientId: string
  try {
    ;({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rl = await checkRateLimit(clientId, `tiktok-sync:${clientId}`, 5, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 })
  }

  // ── Connection ─────────────────────────────────────────────────────────────
  const connection = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'tiktok' } },
  })
  if (!connection) {
    return NextResponse.json(
      { error: 'NOT_CONNECTED', message: 'Conecta TikTok antes de sincronizar.' },
      { status: 404 },
    )
  }

  let accessToken: string
  try {
    accessToken = decryptToken(connection.accessToken)
  } catch (err) {
    console.error('[tiktok/sync] token decrypt failed:', err)
    return NextResponse.json({ error: 'TOKEN_DECRYPTION_FAILED', reconnect: true }, { status: 401 })
  }

  // ── Token refresh if expired ───────────────────────────────────────────────
  const now = new Date()
  const isExpired = connection.expiresAt ? connection.expiresAt < now : false
  if (isExpired && connection.refreshToken) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET
    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { error: 'MISSING_CONFIG', message: 'TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET no configurados.' },
        { status: 500 },
      )
    }
    const refreshRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: (() => { try { return decryptToken(connection.refreshToken!) } catch { return connection.refreshToken! } })(),
      }).toString(),
    })

    if (!refreshRes.ok) {
      return NextResponse.json(
        { error: 'AUTH_EXPIRED', message: 'El token de TikTok expiró. Reconecta la cuenta.', reconnect: true },
        { status: 401 },
      )
    }

    const refreshJson = (await refreshRes.json()) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
    }

    if (!refreshJson.access_token) {
      return NextResponse.json(
        { error: 'AUTH_EXPIRED', message: 'No se pudo refrescar el token de TikTok.', reconnect: true },
        { status: 401 },
      )
    }

    accessToken = refreshJson.access_token
    const newExpiresAt = refreshJson.expires_in
      ? new Date(Date.now() + refreshJson.expires_in * 1000)
      : null

    await db.socialConnection.update({
      where: { clientId_platform: { clientId, platform: 'tiktok' } },
      data: {
        accessToken: encryptToken(accessToken),
        ...(newExpiresAt ? { expiresAt: newExpiresAt } : {}),
        ...(refreshJson.refresh_token ? { refreshToken: encryptToken(refreshJson.refresh_token) } : {}),
      },
    })
  } else if (isExpired && !connection.refreshToken) {
    return NextResponse.json(
      { error: 'AUTH_EXPIRED', message: 'El token de TikTok expiró y no hay refresh token. Reconecta la cuenta.', reconnect: true },
      { status: 401 },
    )
  }

  try {
    // ── 1. User info ─────────────────────────────────────────────────────────
    const userInfoRes = await fetch(TIKTOK_USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!userInfoRes.ok) {
      return handleTikTokHttpError(userInfoRes, 'user/info')
    }

    const userInfoRaw = await userInfoRes.json()

    // Check TikTok error code in body
    const userInfoParsed = TikTokUserInfoSchema.safeParse(userInfoRaw)
    if (!userInfoParsed.success) {
      console.error('[tiktok/sync] user/info shape drift:', userInfoParsed.error.flatten())
      return NextResponse.json(
        { error: 'UPSTREAM_SHAPE_DRIFT', endpoint: 'user/info', detail: userInfoParsed.error.flatten() },
        { status: 502 },
      )
    }

    const userInfoData = userInfoParsed.data
    if (userInfoData.error && userInfoData.error.code !== 'ok') {
      return handleTikTokBodyError(userInfoData.error.code, userInfoData.error.message)
    }

    const userInfo = userInfoData.data?.user
    const followers = userInfo?.follower_count ?? 0
    const following = userInfo?.following_count ?? 0
    const videoCount = userInfo?.video_count ?? 0

    // ── 2. Video list (paginated, max 3 pages) ───────────────────────────────
    const allVideos: Array<{
      videoId: string
      title: string
      description: string
      coverUrl: string | null
      shareUrl: string
      durationSec: number
      viewCount: number
      likeCount: number
      commentCount: number
      shareCount: number
      publishedAt: Date | null
    }> = []

    let cursor: number | undefined = undefined
    let hasMore = true
    let pagesFetched = 0

    while (hasMore && pagesFetched < MAX_PAGES) {
      const body: Record<string, unknown> = { max_count: VIDEOS_PER_PAGE }
      if (cursor !== undefined) body.cursor = cursor

      const videoListRes = await fetch(TIKTOK_VIDEO_LIST_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!videoListRes.ok) {
        return handleTikTokHttpError(videoListRes, 'video/list')
      }

      const videoListRaw = await videoListRes.json()
      const videoListParsed = TikTokVideoListResponseSchema.safeParse(videoListRaw)
      if (!videoListParsed.success) {
        console.error('[tiktok/sync] video/list shape drift:', videoListParsed.error.flatten())
        return NextResponse.json(
          { error: 'UPSTREAM_SHAPE_DRIFT', endpoint: 'video/list', detail: videoListParsed.error.flatten() },
          { status: 502 },
        )
      }

      const videoListData = videoListParsed.data
      if (videoListData.error && videoListData.error.code !== 'ok') {
        return handleTikTokBodyError(videoListData.error.code, videoListData.error.message)
      }

      const videos = videoListData.data?.videos ?? []
      for (const v of videos) {
        allVideos.push({
          videoId: v.id,
          title: v.title ?? '',
          description: v.video_description ?? '',
          coverUrl: v.cover_image_url ?? null,
          shareUrl: v.share_url ?? '',
          durationSec: v.duration ?? 0,
          viewCount: v.view_count ?? 0,
          likeCount: v.like_count ?? 0,
          commentCount: v.comment_count ?? 0,
          shareCount: v.share_count ?? 0,
          publishedAt: v.create_time ? new Date(v.create_time * 1000) : null,
        })
      }

      hasMore = videoListData.data?.has_more ?? false
      cursor = videoListData.data?.cursor
      pagesFetched++
    }

    // ── 3. Upsert TikTokVideo rows ────────────────────────────────────────────
    const syncedAt = new Date()
    const upsertResults = await Promise.allSettled(
      allVideos.map((v) =>
        db.tikTokVideo
          .upsert({
            where: { clientId_videoId: { clientId, videoId: v.videoId } },
            create: {
              clientId,
              createdBy: userId,
              updatedBy: userId,
              videoId: v.videoId,
              title: v.title,
              description: v.description,
              coverUrl: v.coverUrl,
              shareUrl: v.shareUrl,
              durationSec: v.durationSec,
              viewCount: v.viewCount,
              likeCount: v.likeCount,
              commentCount: v.commentCount,
              shareCount: v.shareCount,
              publishedAt: v.publishedAt,
              syncedAt,
            },
            update: {
              updatedBy: userId,
              title: v.title,
              description: v.description,
              coverUrl: v.coverUrl,
              shareUrl: v.shareUrl,
              durationSec: v.durationSec,
              viewCount: v.viewCount,
              likeCount: v.likeCount,
              commentCount: v.commentCount,
              shareCount: v.shareCount,
              publishedAt: v.publishedAt,
              syncedAt,
            },
          })
          .catch((err: unknown) => {
            console.error('[tiktok/sync] upsert failed for', v.videoId, err)
            throw err
          }),
      ),
    )
    const videosSynced = upsertResults.filter((r) => r.status === 'fulfilled').length

    // ── 4. Compute aggregates from ALL rows for this client ───────────────────
    const aggregate = await db.tikTokVideo.aggregate({
      where: { clientId },
      _sum: { viewCount: true, likeCount: true, commentCount: true },
    })
    const totalViews = aggregate._sum.viewCount ?? 0
    const totalInteractions = (aggregate._sum.likeCount ?? 0) + (aggregate._sum.commentCount ?? 0)
    const engagementRate = followers > 0 ? (totalInteractions / followers) * 100 : 0

    // ── 5. Upsert AccountSnapshot for today ───────────────────────────────────
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    await db.accountSnapshot.upsert({
      where: { clientId_platform_date: { clientId, platform: 'tiktok', date: today } },
      create: {
        clientId,
        platform: 'tiktok',
        createdBy: userId,
        updatedBy: userId,
        date: today,
        followers,
        following,
        posts: videoCount,
        totalViews,
        engagementRate,
      },
      update: {
        updatedBy: userId,
        followers,
        following,
        posts: videoCount,
        totalViews,
        engagementRate,
      },
    })

    return NextResponse.json({
      ok: true,
      synced: {
        videos: videosSynced,
        snapshot: { followers, videoCount },
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tiktok/sync] error:', message)
    return NextResponse.json({ error: 'SYNC_FAILED', message: process.env.NODE_ENV !== 'production' ? message : 'Internal error' }, { status: 500 })
  }
}

// ─── Error helpers ────────────────────────────────────────────────────────────

async function handleTikTokHttpError(res: Response, op: string): Promise<NextResponse> {
  const text = await res.text()
  console.error(`[tiktok/sync] ${op} HTTP error:`, res.status, text.slice(0, 300))
  if (res.status === 401) {
    return NextResponse.json(
      { error: 'AUTH_EXPIRED', message: 'Sesión de TikTok expirada. Reconecta la cuenta.', reconnect: true },
      { status: 401 },
    )
  }
  return NextResponse.json({ error: 'TIKTOK_API_ERROR', message: `Fallo al llamar ${op}: ${res.status}` }, { status: 502 })
}

function handleTikTokBodyError(code: string, message?: string): NextResponse {
  console.error('[tiktok/sync] TikTok body error:', code, message)
  if (code === 'access_token_invalid') {
    return NextResponse.json(
      { error: 'AUTH_EXPIRED', message: 'Token de TikTok inválido. Reconecta la cuenta.', reconnect: true },
      { status: 401 },
    )
  }
  if (code === 'scope_not_authorized') {
    return NextResponse.json(
      { error: 'SCOPE_NOT_AUTHORIZED', message: 'Permisos insuficientes en TikTok. Reconecta la cuenta.', reconnect: true },
      { status: 403 },
    )
  }
  return NextResponse.json({ error: 'TIKTOK_API_ERROR', message: message ?? code }, { status: 502 })
}
