/**
 * POST /api/instagram/stories/sync
 *
 * Scrapes the currently-LIVE Instagram stories of the connected account
 * (24h window) via Apify and upserts them into Story.
 *
 *   200 { ok: true, synced: { stories } }
 *   404 { error: 'NOT_CONNECTED' }
 *   429 { error: 'RATE_LIMIT' }
 *   502 { error: 'APIFY_*', detail }
 *
 * Insights fields (reach, impressions, replies, stickerTaps, exits,
 * completionRate) are NOT scrapeable — they default to 0 in the upsert.
 * Meta's Graph API with `instagram_manage_insights` scope is the only
 * way to populate them.
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
  type ApifyStoryItem,
} from '@/lib/apify/instagram-story-scraper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const MAX_STORIES = 50

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
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

  const rl = await checkRateLimit(getIp(req), 'instagram-stories-sync', 5, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 })
  }

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
    select: { accountId: true },
  })
  if (!conn) {
    return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
  }

  const handle = conn.accountId

  let runId: string
  try {
    const r = await startRun([handle])
    runId = r.runId
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[instagram/stories/sync] startRun failed:', message)
    return NextResponse.json(
      { error: 'APIFY_START_FAILED', detail: message },
      { status: 502 },
    )
  }

  const poll = await pollRun(runId, { pollIntervalMs: 3_000, maxWaitMs: 120_000 })
  if (poll.status !== 'SUCCEEDED' || !poll.datasetId) {
    return NextResponse.json(
      { error: 'APIFY_RUN_FAILED', detail: poll.error ?? 'no datasetId' },
      { status: 502 },
    )
  }

  let items: ApifyStoryItem[]
  try {
    items = await fetchItems(poll.datasetId, MAX_STORIES)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[instagram/stories/sync] fetchItems failed:', message)
    return NextResponse.json(
      { error: 'APIFY_FETCH_FAILED', detail: message },
      { status: 502 },
    )
  }

  const upserts = await Promise.allSettled(
    items.map((item) => {
      const instagramId = String(item.id ?? '').trim()
      if (!instagramId) {
        return Promise.reject(new Error('story without id'))
      }
      const publishedAt = item.takenAtTimestamp
        ? new Date(item.takenAtTimestamp * 1000)
        : null

      return db.story.upsert({
        where: { instagramId },
        create: {
          clientId,
          createdBy: userId,
          updatedBy: userId,
          instagramId,
          thumbnailUrl: item.displayUrl ?? null,
          publishedAt,
          syncedAt: new Date(),
          // insights (reach/impressions/replies/stickerTaps/exits/completionRate)
          // are gated behind Meta App Review; leave at default 0.
        },
        update: {
          updatedBy: userId,
          thumbnailUrl: item.displayUrl ?? null,
          publishedAt,
          syncedAt: new Date(),
        },
      })
    }),
  )

  const storiesSynced = upserts.filter((r) => r.status === 'fulfilled').length
  return NextResponse.json({
    ok: true,
    synced: { stories: storiesSynced },
    via: 'apify',
  })
}
