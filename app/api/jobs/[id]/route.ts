/**
 * GET /api/jobs/[id]
 *
 * Returns job status + progressPct for polling by the UI.
 * progressPct = Math.min(100, (actualCount / requestedCount) * 100)
 * When status is "pending" or "running" and actualCount=0, returns 0.
 * When status is "completed", always returns 100.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import type { GetJobResponse, ScrapeJobDTO } from '@/lib/types/competidores'

// ─── GET /api/jobs/[id] ────────────────────────────────────────────────────

export async function GET(
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

  // Rate limit: 60 requests / 60 s per IP (B8)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'jobs-get', 60, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 })
  }

  const { id } = await params

  // B9: wrap Prisma call in try/catch
  try {
    // Scope to active client to prevent cross-tenant job status disclosure.
    const job = await db.scrapeJob.findFirst({ where: { id, clientId } })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Compute progressPct
    let progressPct: number
    if (job.status === 'completed') {
      progressPct = 100
    } else if (job.status === 'failed') {
      progressPct = 0
    } else if (job.requestedCount > 0 && job.actualCount > 0) {
      progressPct = Math.min(100, Math.round((job.actualCount / job.requestedCount) * 100))
    } else {
      progressPct = 0
    }

    const dto: ScrapeJobDTO = {
      id: job.id,
      competitorId: job.competitorId,
      username: job.username,
      requestedCount: job.requestedCount,
      actualCount: job.actualCount,
      status: job.status as ScrapeJobDTO['status'],
      kind: job.kind as ScrapeJobDTO['kind'],
      // Sanitize errorMessage in production to avoid leaking internals (B8)
      errorMessage: job.status === 'failed'
        ? (process.env.NODE_ENV !== 'production' ? job.errorMessage : 'Error interno')
        : null,
      costUsd: job.costUsd,
      startedAt: job.startedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    }

    const response: GetJobResponse = { job: dto, progressPct }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[jobs/GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
