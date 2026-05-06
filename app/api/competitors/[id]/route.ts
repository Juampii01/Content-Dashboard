/**
 * GET    /api/competitors/[id] — competitor detail + reels (sorted)
 * DELETE /api/competitors/[id] — cascade delete, returns 204
 *
 * The [id] param accepts:
 *  - a CUID (standard Prisma id)
 *  - a username string (convenience — resolved internally)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { resolveCompetitor } from '@/lib/competidores/resolve-competitor'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import type {
  GetCompetitorResponse,
  CompetitorDTO,
  ReelDTO,
  ReelSortField,
  ReelSortDir,
} from '@/lib/types/competidores'
import type { Prisma } from '@prisma/client'

// ─── Helpers ───────────────────────────────────────────────────────────────

function toCompetitorDTO(c: {
  id: string
  username: string
  displayName: string | null
  profilePicUrl: string | null
  followersCount: number | null
  lastScrapedAt: Date | null
  createdAt: Date
}): CompetitorDTO {
  return {
    id: c.id,
    username: c.username,
    displayName: c.displayName,
    profilePicUrl: c.profilePicUrl,
    followersCount: c.followersCount,
    lastScrapedAt: c.lastScrapedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }
}

function toReelDTO(
  r: {
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
    _count: { analyses: number; transcription?: number }
    transcription: { id: string } | null
  },
): ReelDTO {
  return {
    id: r.id,
    competitorId: r.competitorId,
    instagramId: r.instagramId,
    shortcode: r.shortcode,
    url: r.url,
    thumbnailUrl: r.thumbnailUrl,
    videoUrl: r.videoUrl,
    caption: r.caption,
    viewsCount: r.viewsCount,
    likesCount: r.likesCount,
    commentsCount: r.commentsCount,
    sharesCount: r.sharesCount,
    durationSec: r.durationSec,
    postedAt: r.postedAt?.toISOString() ?? null,
    scrapedAt: r.scrapedAt.toISOString(),
    hasTranscription: r.transcription !== null,
    analysesCount: r._count.analyses,
  }
}

/** Build the Prisma orderBy clause from sort query params. */
function buildOrderBy(
  field: ReelSortField,
  dir: ReelSortDir,
): Prisma.ReelOrderByWithRelationInput {
  const direction = dir === 'asc' ? 'asc' : 'desc'
  switch (field) {
    case 'views':
      return { viewsCount: direction }
    case 'likes':
      return { likesCount: direction }
    case 'comments':
      return { commentsCount: direction }
    case 'postedAt':
    default:
      return { postedAt: direction }
  }
}

// ─── GET /api/competitors/[id] ─────────────────────────────────────────────

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

  const { id } = await params

  // Parse + validate sort query params before casting (B10)
  const searchParams = req.nextUrl.searchParams
  const validFields: ReelSortField[] = ['views', 'likes', 'comments', 'postedAt']
  const validDirs: ReelSortDir[] = ['asc', 'desc']
  const rawSort = searchParams.get('sort') ?? 'postedAt'
  const rawDir = searchParams.get('dir') ?? 'desc'
  // Cast only after membership has been confirmed — avoids unsafe widening (B10)
  const field: ReelSortField = (validFields as string[]).includes(rawSort) ? (rawSort as ReelSortField) : 'postedAt'
  const dir: ReelSortDir = (validDirs as string[]).includes(rawDir) ? (rawDir as ReelSortDir) : 'desc'

  const competitor = await resolveCompetitor(id, clientId)

  if (!competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
  }

  const reels = await db.reel.findMany({
    where: { competitorId: competitor.id, clientId },
    orderBy: buildOrderBy(field, dir),
    include: {
      transcription: { select: { id: true } },
      _count: { select: { analyses: true } },
    },
  })

  const response: GetCompetitorResponse = {
    competitor: toCompetitorDTO(competitor),
    reels: reels.map(toReelDTO),
  }

  return NextResponse.json(response)
}

// ─── DELETE /api/competitors/[id] ─────────────────────────────────────────

export async function DELETE(
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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'competitors-delete', 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params

  const competitor = await resolveCompetitor(id, clientId)

  if (!competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
  }

  // Cascade is handled by Prisma schema (onDelete: Cascade on Reel → *)
  await db.competitor.delete({ where: { id: competitor.id } })

  return new NextResponse(null, { status: 204 })
}
