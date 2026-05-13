/**
 * POST /api/tiktok/sync
 *
 * Scrapes the connected TikTok account via Apify and upserts videos into
 * TikTokVideo. Requires a prior /api/tiktok/connect-handle call to set the
 * handle.
 *
 *   200 { ok: true, synced: { videos: number } }
 *   401 { error: 'UNAUTHORIZED' }
 *   403 { error: 'FORBIDDEN' }
 *   404 { error: 'NOT_CONNECTED' }
 *   429 { error: 'RATE_LIMIT' }
 *   502 { error: 'APIFY_*', detail }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireActiveClient,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import {
  startRun,
  pollRun,
  fetchItems,
  type ApifyTikTokVideoItem,
} from '@/lib/apify/tiktok-scraper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const RESULTS_PER_PAGE = 50

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

function shortcodeFromUrl(url: string): string | null {
  // https://www.tiktok.com/@user/video/123456789 → "123456789"
  const m = url.match(/\/video\/(\d+)/)
  return m?.[1] ?? null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const rl = await checkRateLimit(getIp(req), 'tiktok-sync', 5, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 })
  }

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'tiktok' } },
  })
  if (!conn) {
    return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
  }

  const handle = conn.accountId

  let runId: string
  try {
    const r = await startRun([handle], RESULTS_PER_PAGE)
    runId = r.runId
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tiktok/sync] startRun failed:', message)
    return NextResponse.json(
      { error: 'APIFY_START_FAILED', detail: message },
      { status: 502 },
    )
  }

  const poll = await pollRun(runId, { pollIntervalMs: 4_000, maxWaitMs: 180_000 })
  if (poll.status !== 'SUCCEEDED' || !poll.datasetId) {
    return NextResponse.json(
      { error: 'APIFY_RUN_FAILED', detail: poll.error ?? 'no datasetId' },
      { status: 502 },
    )
  }

  let items: ApifyTikTokVideoItem[]
  try {
    items = await fetchItems(poll.datasetId, RESULTS_PER_PAGE)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tiktok/sync] fetchItems failed:', message)
    return NextResponse.json(
      { error: 'APIFY_FETCH_FAILED', detail: message },
      { status: 502 },
    )
  }

  const upserts = await Promise.allSettled(
    items.map((item) => {
      const tiktokId = String(item.id ?? '').trim()
      if (!tiktokId) {
        return Promise.reject(new Error('item without id'))
      }
      const url = item.webVideoUrl?.trim() || `https://www.tiktok.com/@${handle}/video/${tiktokId}`
      const shortcode = url ? shortcodeFromUrl(url) : null
      const publishedAt = item.createTime
        ? new Date(item.createTime * 1000)
        : null

      return db.tikTokVideo.upsert({
        where: { tiktokId },
        create: {
          clientId,
          createdBy: userId,
          updatedBy: userId,
          tiktokId,
          shortcode,
          url,
          thumbnailUrl: item.videoMeta?.coverUrl ?? item.videoMeta?.originalCoverUrl ?? null,
          videoUrl: item.videoMeta?.downloadAddr ?? null,
          caption: item.text ?? null,
          durationSec: item.videoMeta?.duration ?? null,
          viewsCount: item.playCount ?? 0,
          likesCount: item.diggCount ?? 0,
          commentsCount: item.commentCount ?? 0,
          sharesCount: item.shareCount ?? 0,
          publishedAt,
          syncedAt: new Date(),
        },
        update: {
          updatedBy: userId,
          shortcode,
          url,
          thumbnailUrl: item.videoMeta?.coverUrl ?? item.videoMeta?.originalCoverUrl ?? null,
          videoUrl: item.videoMeta?.downloadAddr ?? null,
          caption: item.text ?? null,
          durationSec: item.videoMeta?.duration ?? null,
          viewsCount: item.playCount ?? 0,
          likesCount: item.diggCount ?? 0,
          commentsCount: item.commentCount ?? 0,
          sharesCount: item.shareCount ?? 0,
          publishedAt,
          syncedAt: new Date(),
        },
      })
    }),
  )

  const videosSynced = upserts.filter((r) => r.status === 'fulfilled').length
  return NextResponse.json({
    ok: true,
    synced: { videos: videosSynced },
    via: 'apify',
  })
}
