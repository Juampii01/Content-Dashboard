/**
 * POST /api/competitors/[id]/refresh
 *
 * Scrapes only new reels for a competitor (smaller limit: 30).
 * Filters out instagramIds that already exist in the DB.
 * Returns { jobId } immediately; scrape runs via after().
 */

import { after, NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { resolveCompetitor } from '@/lib/competidores/resolve-competitor'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import {
  startRun,
  pollRun,
  fetchItems,
  mapItemToReelCreate,
} from '@/lib/apify/instagram-reel-scraper'
import type { RefreshCompetitorResponse } from '@/lib/types/competidores'

export const maxDuration = 300

const REFRESH_LIMIT = 15

// ─── POST /api/competitors/[id]/refresh ───────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    throw err
  }

  // Rate limit
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!rawIp && process.env.NODE_ENV === 'production') {
    console.warn('[ratelimit] missing x-forwarded-for header — all anonymous requests share the 127.0.0.1 bucket')
  }
  const ip = rawIp ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'competitors-refresh', 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json({ error: 'APIFY_API_TOKEN no configurado' }, { status: 500 })
  }

  const { id } = await params

  // Resolve competitor (CUID or username) via shared helper
  const competitor = await resolveCompetitor(id, clientId)

  if (!competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
  }

  // Create ScrapeJob row (kind: refresh)
  const job = await db.scrapeJob.create({
    data: {
      clientId,
      createdBy: userId,
      updatedBy: userId,
      competitorId: competitor.id,
      username: competitor.username,
      requestedCount: REFRESH_LIMIT,
      status: 'pending',
      kind: 'refresh',
    },
  })

  const response: RefreshCompetitorResponse = { jobId: job.id }

  // Background scrape
  after(async () => {
    try {
      await db.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'running' },
      })

      const { runId } = await startRun([competitor.username], REFRESH_LIMIT)

      await db.scrapeJob.update({
        where: { id: job.id },
        data: { apifyRunId: runId },
      })

      const result = await pollRun(runId)

      if (result.status === 'FAILED' || !result.datasetId) {
        await db.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: result.error ?? 'Apify run failed without datasetId',
            completedAt: new Date(),
          },
        })
        return
      }

      const items = await fetchItems(result.datasetId, REFRESH_LIMIT)

      // Filter out already-stored reels by instagramId
      const existingIds = await db.reel
        .findMany({
          where: {
            competitorId: competitor.id,
            instagramId: { in: items.map((i) => String(i.id ?? '')) },
          },
          select: { instagramId: true },
        })
        .then((rows) => new Set(rows.map((r) => r.instagramId)))

      const newItems = items.filter(
        (item) => !existingIds.has(String(item.id ?? '')),
      )

      let inserted = 0
      if (newItems.length > 0) {
        const reelInputs = newItems.map((item) => ({
          ...mapItemToReelCreate(item, competitor.id),
          clientId,
        }))
        // P2002 catch: concurrent refresh calls can collide on Reel.instagramId @unique (B2)
        try {
          const createResult = await db.reel.createMany({ data: reelInputs })
          inserted = createResult.count
        } catch (createErr: unknown) {
          if ((createErr as { code?: string }).code !== 'P2002') throw createErr
          console.warn('[competitors/refresh] P2002 on createMany — concurrent scrape collision, continuing')
        }
      }

      await db.competitor.update({
        where: { id: competitor.id },
        data: { lastScrapedAt: new Date() },
      })

      await db.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          actualCount: inserted,
          completedAt: new Date(),
        },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[competitors/refresh] background scrape error:', message)
      await db.scrapeJob
        .update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: message,
            completedAt: new Date(),
          },
        })
        .catch((e: unknown) =>
          console.error('[competitors/refresh] failed to update job status:', e),
        )
    }
  })

  return NextResponse.json(response, { status: 202 })
}
