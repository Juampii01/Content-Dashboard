/**
 * POST /api/youtube/sync
 *
 * Pulls the latest channel metrics and the most recent videos for the active
 * client's connected YouTube channel, persists them into AccountSnapshot (today)
 * and YouTubeVideo (upsert), and returns a small summary.
 *
 * Requires an active SocialConnection with platform='youtube'.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { youtubeFetch, YouTubeAuthError } from '@/lib/youtube/auth'
import {
  YTChannelListSchema,
  YTPlaylistItemsListSchema,
  YTVideoListSchema,
} from '@/lib/schemas/youtube'
import { transformVideo } from '@/lib/youtube/transform'

const MAX_VIDEOS = 25

export async function POST(): Promise<NextResponse> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // ── Connection ─────────────────────────────────────────────────────────────
  const connection = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'youtube' } },
  })
  if (!connection) {
    return NextResponse.json(
      { error: 'NOT_CONNECTED', message: 'Conecta YouTube antes de sincronizar.' },
      { status: 404 },
    )
  }

  try {
    // ── 1. Channel info (snippet + statistics + uploads playlist) ────────────
    const channelUrl =
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true'
    const channelRes = await youtubeFetch(channelUrl, connection)
    if (!channelRes.ok) {
      return handleYouTubeError(channelRes, 'channels.list')
    }
    const channelRaw = await channelRes.json()
    const channelParsed = YTChannelListSchema.safeParse(channelRaw)
    if (!channelParsed.success) {
      console.error('[youtube/sync] channels.list shape drift:', channelParsed.error.flatten())
      return NextResponse.json(
        { error: 'UPSTREAM_SHAPE_DRIFT', endpoint: 'channels.list', detail: channelParsed.error.flatten() },
        { status: 502 },
      )
    }
    const channelJson = channelParsed.data
    const channel = channelJson.items?.[0]
    if (!channel) {
      return NextResponse.json(
        { error: 'NO_CHANNEL', message: 'No se encontró un canal de YouTube para esta cuenta.' },
        { status: 404 },
      )
    }

    const stats = channel.statistics
    const rawSubscribers = stats?.subscriberCount ?? '0'
    const rawTotalViews = stats?.viewCount ?? '0'
    const rawVideoCount = stats?.videoCount ?? '0'
    const parsedSubscribers = parseInt(rawSubscribers, 10)
    const parsedTotalViews = parseInt(rawTotalViews, 10)
    const parsedVideoCount = parseInt(rawVideoCount, 10)
    if (isNaN(parsedSubscribers)) console.warn('[youtube:sync] non-numeric field value', 'subscriberCount', rawSubscribers)
    if (isNaN(parsedTotalViews)) console.warn('[youtube:sync] non-numeric field value', 'viewCount', rawTotalViews)
    if (isNaN(parsedVideoCount)) console.warn('[youtube:sync] non-numeric field value', 'videoCount', rawVideoCount)
    const subscribers = parsedSubscribers || 0
    const totalViews = parsedTotalViews || 0
    const videoCount = parsedVideoCount || 0
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
    const channelId = channel.id

    // ── 2. AccountSnapshot upsert for today ──────────────────────────────────
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    await db.accountSnapshot.upsert({
      where: {
        clientId_platform_date: { clientId, platform: 'youtube', date: today },
      },
      create: {
        clientId,
        platform: 'youtube',
        createdBy: userId,
        updatedBy: userId,
        date: today,
        followers: subscribers,
        totalViews,
        posts: videoCount,
      },
      update: {
        updatedBy: userId,
        followers: subscribers,
        totalViews,
        posts: videoCount,
      },
    })

    // ── 3. Uploads playlist → last N video ids ───────────────────────────────
    let videosSynced = 0
    if (uploadsPlaylistId) {
      const playlistUrl =
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${MAX_VIDEOS}&playlistId=${encodeURIComponent(uploadsPlaylistId)}`
      const playlistRes = await youtubeFetch(playlistUrl, connection)
      if (!playlistRes.ok) {
        return handleYouTubeError(playlistRes, 'playlistItems.list')
      }
      const playlistRaw = await playlistRes.json()
      const playlistParsed = YTPlaylistItemsListSchema.safeParse(playlistRaw)
      if (!playlistParsed.success) {
        console.error('[youtube/sync] playlistItems.list shape drift:', playlistParsed.error.flatten())
        return NextResponse.json(
          { error: 'UPSTREAM_SHAPE_DRIFT', endpoint: 'playlistItems.list', detail: playlistParsed.error.flatten() },
          { status: 502 },
        )
      }
      const playlistJson = playlistParsed.data
      const videoIds: string[] = (playlistJson.items ?? [])
        .map((it) => it.contentDetails?.videoId)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)

      // ── 4. Batch videos.list (up to 50 ids per call) ──────────────────────
      for (let i = 0; i < videoIds.length; i += 50) {
        const batch = videoIds.slice(i, i + 50)
        const videosUrl =
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch.join(',')}`
        const videosRes = await youtubeFetch(videosUrl, connection)
        if (!videosRes.ok) {
          return handleYouTubeError(videosRes, 'videos.list')
        }
        const videosRaw = await videosRes.json()
        const videosParsed = YTVideoListSchema.safeParse(videosRaw)
        if (!videosParsed.success) {
          console.error('[youtube/sync] videos.list shape drift:', videosParsed.error.flatten())
          return NextResponse.json(
            { error: 'UPSTREAM_SHAPE_DRIFT', endpoint: 'videos.list', detail: videosParsed.error.flatten() },
            { status: 502 },
          )
        }
        const videosJson = videosParsed.data
        const items = videosJson.items ?? []
        // Run upserts for this batch in parallel (MH-03). Failures are logged
        // per-video; one bad row doesn't abort the rest of the batch.
        const batchResults = await Promise.allSettled(
          items.map((item) => {
            const data = transformVideo(item)
            const { channelId: videoChannelId, ...rest } = data
            // Guard: only overwrite channelId when upstream gave a non-empty value.
            // Previously `videoChannelId || channelId` treated empty string as
            // fallback-to-outer-channel, which could silently downgrade an
            // existing stored channelId to the sync's fallback (MH-08).
            const hasValidChannelId = typeof videoChannelId === 'string' && videoChannelId.trim().length > 0
            const resolvedChannelId = hasValidChannelId ? videoChannelId : channelId
            const updateData: {
              updatedBy: string
              title: string
              description: string
              thumbnailUrl: string | null
              url: string
              durationSec: number
              durationLabel: string
              viewsCount: number
              likesCount: number
              commentsCount: number
              favoriteCount: number
              publishedAt: Date | null
              syncedAt: Date
              channelId?: string
            } = {
              updatedBy: userId,
              title: data.title,
              description: data.description,
              thumbnailUrl: data.thumbnailUrl,
              url: data.url,
              durationSec: data.durationSec,
              durationLabel: data.durationLabel,
              viewsCount: data.viewsCount,
              likesCount: data.likesCount,
              commentsCount: data.commentsCount,
              favoriteCount: data.favoriteCount,
              publishedAt: data.publishedAt,
              syncedAt: new Date(),
            }
            if (hasValidChannelId) {
              updateData.channelId = videoChannelId
            }
            return db.youTubeVideo
              .upsert({
                where: { clientId_videoId: { clientId, videoId: data.videoId } },
                create: {
                  clientId,
                  createdBy: userId,
                  updatedBy: userId,
                  channelId: resolvedChannelId,
                  ...rest,
                },
                update: updateData,
              })
              .catch((err) => {
                console.error('[youtube/sync] upsert failed for', data.videoId, err)
                throw err
              })
          }),
        )
        videosSynced += batchResults.filter((r) => r.status === 'fulfilled').length
      }
    }

    return NextResponse.json({
      ok: true,
      synced: {
        videos: videosSynced,
        snapshot: { date: today.toISOString(), subscribers, totalViews, videoCount },
      },
    })
  } catch (err) {
    if (err instanceof YouTubeAuthError) {
      const status = err.code === 'INVALID_GRANT' || err.code === 'NO_REFRESH_TOKEN' ? 401 : 500
      return NextResponse.json(
        { error: err.code, message: err.message, reconnect: status === 401 },
        { status },
      )
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[youtube/sync] error:', message)
    return NextResponse.json(
      { error: 'SYNC_FAILED', message: process.env.NODE_ENV !== 'production' ? message : 'Internal error' },
      { status: 500 },
    )
  }
}

// ─── Error mapper ────────────────────────────────────────────────────────────

async function handleYouTubeError(res: Response, op: string): Promise<NextResponse> {
  const text = await res.text()
  console.error(`[youtube/sync] ${op} error:`, res.status, text.slice(0, 300))

  // Google returns a structured error body; parse for known reasons.
  let reason: string | undefined
  try {
    const parsed = JSON.parse(text) as {
      error?: { errors?: Array<{ reason?: string }>; message?: string }
    }
    reason = parsed.error?.errors?.[0]?.reason
  } catch {
    // fall through
  }

  if (res.status === 401) {
    return NextResponse.json(
      { error: 'AUTH_EXPIRED', message: 'Sesión de YouTube expirada. Reconecta la cuenta.', reconnect: true },
      { status: 401 },
    )
  }
  if (res.status === 403 && reason === 'quotaExceeded') {
    return NextResponse.json(
      { error: 'QUOTA_EXCEEDED', message: 'Cuota diaria de YouTube Data API agotada. Inténtalo mañana.' },
      { status: 429 },
    )
  }
  if (res.status === 403) {
    return NextResponse.json(
      { error: 'FORBIDDEN_BY_YT', message: `YouTube rechazó la solicitud (${reason ?? 'forbidden'}).` },
      { status: 403 },
    )
  }
  return NextResponse.json(
    { error: 'YT_API_ERROR', message: `Fallo al llamar ${op}: ${res.status}` },
    { status: 502 },
  )
}
