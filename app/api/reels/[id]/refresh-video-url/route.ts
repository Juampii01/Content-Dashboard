/**
 * POST /api/reels/[id]/refresh-video-url
 *
 * Re-fetches metadata (videoUrl, thumbnailUrl, scrapedAt) for a single reel
 * by scraping the competitor's latest 30 reels from Apify and locating the
 * matching shortcode.
 *
 * Flow:
 *  1. Load reel + competitor from DB.
 *  2. Kick off Apify run for the competitor's username (resultsLimit: 30).
 *  3. Poll until done.
 *  4. Find item whose shortCode matches reel.shortcode.
 *     - Found  → update videoUrl / thumbnailUrl / scrapedAt, return { reel: ReelDTO }.
 *     - Not found → 410 REEL_NO_LONGER_AVAILABLE.
 *
 * NOTE: The apify~instagram-reel-scraper actor does not accept individual reel
 * URLs as input — it requires a username. We fetch the latest 30 reels and
 * filter by shortcode post-fetch. This is the pragmatic approach given the
 * actor's constraints.
 *
 * Rate limit: 5 / 60 s per IP.
 * maxDuration: 120 s (Vercel Pro).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import {
  startRun,
  pollRun,
  fetchItems,
} from '@/lib/apify/instagram-reel-scraper'
import type { ReelDTO } from '@/lib/types/competidores'

export const maxDuration = 120

// Number of reels to pull when scanning for the target shortcode.
const SCAN_LIMIT = 30

// ─── DTO helper ───────────────────────────────────────────────────────────────

function toReelDTO(
  reel: {
    id: string
    competitorId: string
    instagramId: string
    shortcode: string
    url: string
    thumbnailUrl: string | null
    videoUrl: string | null
    caption: string | null
    viewsCount: number
    likesCount: number
    commentsCount: number
    sharesCount: number
    durationSec: number | null
    postedAt: Date | null
    scrapedAt: Date
    transcription: { id: string } | null
    _count: { analyses: number }
  },
): ReelDTO {
  return {
    id: reel.id,
    competitorId: reel.competitorId,
    instagramId: reel.instagramId,
    shortcode: reel.shortcode,
    url: reel.url,
    thumbnailUrl: reel.thumbnailUrl,
    videoUrl: reel.videoUrl,
    caption: reel.caption,
    viewsCount: reel.viewsCount,
    likesCount: reel.likesCount,
    commentsCount: reel.commentsCount,
    sharesCount: reel.sharesCount,
    durationSec: reel.durationSec,
    postedAt: reel.postedAt?.toISOString() ?? null,
    scrapedAt: reel.scrapedAt.toISOString(),
    hasTranscription: reel.transcription !== null,
    analysesCount: reel._count.analyses,
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    throw err
  }

  // Rate limit: 5 per 60 s
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!rawIp && process.env.NODE_ENV === 'production') {
    console.warn('[ratelimit] missing x-forwarded-for header — all anonymous requests share the 127.0.0.1 bucket')
  }
  const ip = rawIp ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'reels-refresh-video-url', 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 })
  }

  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json({ error: 'APIFY_API_TOKEN no configurado' }, { status: 500 })
  }

  const { id } = await params

  // 1. Load reel + competitor (scoped to active client)
  const reel = await db.reel.findFirst({
    where: { id, clientId },
    include: {
      competitor: true,
      transcription: { select: { id: true } },
      _count: { select: { analyses: true } },
    },
  })

  if (!reel) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const username = reel.competitor.username

  // 2. Start Apify run for the competitor's username
  let runId: string
  try {
    const result = await startRun([username], SCAN_LIMIT)
    runId = result.runId
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[refresh-video-url] startRun error:', message)
    return NextResponse.json({ error: 'APIFY_START_FAILED' }, { status: 502 })
  }

  // 3. Poll until terminal
  let pollResult: Awaited<ReturnType<typeof pollRun>>
  try {
    pollResult = await pollRun(runId, { maxWaitMs: 100_000 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[refresh-video-url] pollRun error:', message)
    return NextResponse.json({ error: 'APIFY_POLL_FAILED' }, { status: 502 })
  }

  if (pollResult.status === 'FAILED' || !pollResult.datasetId) {
    return NextResponse.json(
      { error: 'APIFY_RUN_FAILED', detail: pollResult.error ?? 'no datasetId' },
      { status: 502 },
    )
  }

  // 4. Fetch items and locate matching shortcode
  let items: Awaited<ReturnType<typeof fetchItems>>
  try {
    items = await fetchItems(pollResult.datasetId, SCAN_LIMIT)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[refresh-video-url] fetchItems error:', message)
    return NextResponse.json({ error: 'APIFY_FETCH_FAILED' }, { status: 502 })
  }

  // Normalise shortcodes: prefer explicit shortCode field, otherwise derive from URL
  const shortcodeFromUrl = (url: string): string => {
    const m = url.match(/\/reel\/([A-Za-z0-9_-]+)/i)
    return m?.[1] ?? ''
  }

  const match = items.find((item) => {
    const sc =
      item.shortCode?.trim() ||
      (item.url ? shortcodeFromUrl(item.url) : '')
    return sc === reel.shortcode
  })

  if (!match) {
    // The reel was not present in the latest 30 — treat as gone
    return NextResponse.json({ error: 'REEL_NO_LONGER_AVAILABLE' }, { status: 410 })
  }

  // 5. Update DB with fresh URLs
  const updated = await db.reel.update({
    where: { id },
    data: {
      videoUrl: match.videoUrl ?? reel.videoUrl,
      thumbnailUrl: match.displayUrl ?? reel.thumbnailUrl,
      scrapedAt: new Date(),
    },
    include: {
      transcription: { select: { id: true } },
      _count: { select: { analyses: true } },
    },
  })

  return NextResponse.json({ reel: toReelDTO(updated) })
}
