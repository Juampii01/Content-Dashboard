/**
 * POST /api/competitors — create competitor + kick off background scrape
 * GET  /api/competitors — list all competitors with reelsCount
 */

import { after, NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CreateCompetitorSchema } from '@/lib/schemas/competidores'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import {
  startRun,
  pollRun,
  fetchItems,
  mapItemToReelCreate,
} from '@/lib/apify/instagram-reel-scraper'
import type {
  CreateCompetitorResponse,
  ListCompetitorsResponse,
  CompetitorDTO,
} from '@/lib/types/competidores'

// Allow up to 5 min for background work on Vercel Pro/Enterprise
export const maxDuration = 300

// ─── Helpers ───────────────────────────────────────────────────────────────

function toCompetitorDTO(
  competitor: {
    id: string
    username: string
    displayName: string | null
    profilePicUrl: string | null
    followersCount: number | null
    lastScrapedAt: Date | null
    createdAt: Date
  },
  reelsCount?: number,
): CompetitorDTO {
  return {
    id: competitor.id,
    username: competitor.username,
    displayName: competitor.displayName,
    profilePicUrl: competitor.profilePicUrl,
    followersCount: competitor.followersCount,
    lastScrapedAt: competitor.lastScrapedAt?.toISOString() ?? null,
    createdAt: competitor.createdAt.toISOString(),
    ...(reelsCount !== undefined ? { reelsCount } : {}),
  }
}

// ─── POST /api/competitors ─────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
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

  // Rate limit: 5 per 60 s
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!rawIp && process.env.NODE_ENV === 'production') {
    console.warn('[ratelimit] missing x-forwarded-for header — all anonymous requests share the 127.0.0.1 bucket')
  }
  const ip = rawIp ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'competitors-post', 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Validate APIFY token early so we don't create records if config is broken
  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json({ error: 'APIFY_API_TOKEN no configurado' }, { status: 500 })
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateCompetitorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  const { username, limit } = parsed.data

  // Upsert Competitor + create ScrapeJob atomically so a crash between the two
  // calls never leaves a Competitor with no ScrapeJob.
  const { competitor, job } = await db.$transaction(async (tx) => {
    const competitor = await tx.competitor.upsert({
      where: { clientId_username: { clientId, username } },
      create: { clientId, createdBy: userId, updatedBy: userId, username },
      update: {},
    })

    const job = await tx.scrapeJob.create({
      data: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        competitorId: competitor.id,
        username,
        requestedCount: limit,
        status: 'pending',
        kind: 'initial',
      },
    })

    return { competitor, job }
  })

  // Build response immediately
  const response: CreateCompetitorResponse = {
    competitor: toCompetitorDTO(competitor),
    jobId: job.id,
  }

  // Background: run the actual scrape after response is sent
  after(async () => {
    try {
      // Mark running
      await db.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'running' },
      })

      // Start Apify run
      const { runId } = await startRun([username], limit)

      // Store runId for external polling
      await db.scrapeJob.update({
        where: { id: job.id },
        data: { apifyRunId: runId },
      })

      // Poll until done
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

      // Fetch items
      const items = await fetchItems(result.datasetId, limit)

      // Deduplicate by instagramId before inserting, scoped by competitor so
      // two tenants (or two competitors in the same tenant) that happen to
      // share an instagramId don't shadow each other's inserts (MH-01).
      //
      // `Reel.instagramId` has a global @unique in the schema (IG post IDs are
      // globally unique in Instagram's own system). The dedup question we want
      // to answer here is "does THIS competitor already have this reel?" —
      // scoping by competitorId enforces tenant isolation implicitly because
      // competitor is already tenant-scoped via the caller. This prevents the
      // bug where a stale match across tenants caused a legit insert to be
      // skipped, leaving the reel silently missing in the owner's view.
      // Sibling route `/api/competitors/[id]/refresh` already does this.
      const allInstagramIds = items.map((i) => String(i.id ?? ''))
      const existingRows = await db.reel.findMany({
        where: {
          instagramId: { in: allInstagramIds },
          competitorId: competitor.id,
        },
        select: { instagramId: true },
      })
      const existingSet = new Set(existingRows.map((r) => r.instagramId))
      const newItems = items.filter((i) => !existingSet.has(String(i.id ?? '')))

      let inserted = 0
      if (newItems.length > 0) {
        const reelInputs = newItems.map((item) => ({
          ...mapItemToReelCreate(item, competitor.id),
          clientId,
        }))
        // P2002 catch: concurrent scrapes of the same competitor can collide on
        // Reel.instagramId @unique — swallow the conflict and continue (B2)
        try {
          const createResult = await db.reel.createMany({ data: reelInputs })
          inserted = createResult.count
        } catch (createErr: unknown) {
          if ((createErr as { code?: string }).code !== 'P2002') throw createErr
          console.warn('[competitors/POST] P2002 on createMany — concurrent scrape collision, continuing')
        }
      }

      // Update competitor lastScrapedAt
      await db.competitor.update({
        where: { id: competitor.id },
        data: { lastScrapedAt: new Date() },
      })

      // Mark completed
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
      console.error('[competitors/POST] background scrape error:', message)
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
          console.error('[competitors/POST] failed to update job status:', e),
        )
    }
  })

  return NextResponse.json(response, { status: 201 })
}

// ─── GET /api/competitors ──────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  // Auth
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

  // B9: wrap Prisma call in try/catch
  try {
    const competitors = await db.competitor.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { reels: true } },
      },
    })

    const response: ListCompetitorsResponse = {
      competitors: competitors.map((c) =>
        toCompetitorDTO(c, c._count.reels),
      ),
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[competitors/GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
