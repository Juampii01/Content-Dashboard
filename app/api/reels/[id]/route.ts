/**
 * GET /api/reels/[id]
 *
 * Returns full reel detail including the optional transcription and all
 * analyses ordered by createdAt desc (history preserved).
 *
 * Response: GetReelResponse
 * 404 when reel is not found.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import type {
  GetReelResponse,
  ReelDTO,
  TranscriptionDTO,
  AnalysisDTO,
} from '@/lib/types/competidores'
import type { ClaudeModelId } from '@/lib/claude/models'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safe JSON.parse for string[] columns — avoids crash on DB corruption (B7) */
function safeStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

// ─── DTO helpers ──────────────────────────────────────────────────────────────

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
  }
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

function toTranscriptionDTO(t: {
  id: string
  reelId: string
  text: string
  language: string
  provider: string
  costUsd: number | null
  createdAt: Date
}): TranscriptionDTO {
  return {
    id: t.id,
    reelId: t.reelId,
    text: t.text,
    language: t.language,
    provider: t.provider,
    costUsd: t.costUsd,
    createdAt: t.createdAt.toISOString(),
  }
}

function toAnalysisDTO(a: {
  id: string
  reelId: string
  model: string
  painPoints: string
  desires: string
  problems: string
  insights: string
  keywords: string
  inputTokens: number | null
  outputTokens: number | null
  costUsd: number | null
  createdAt: Date
}): AnalysisDTO {
  return {
    id: a.id,
    reelId: a.reelId,
    model: a.model as ClaudeModelId,
    painPoints: safeStringArray(a.painPoints),
    desires: safeStringArray(a.desires),
    problems: safeStringArray(a.problems),
    insights: safeStringArray(a.insights),
    keywords: safeStringArray(a.keywords),
    inputTokens: a.inputTokens,
    outputTokens: a.outputTokens,
    costUsd: a.costUsd,
    createdAt: a.createdAt.toISOString(),
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  // B9: wrap Prisma call in try/catch
  try {
    const reel = await db.reel.findFirst({
      where: { id, clientId },
      include: {
        transcription: true,
        analyses: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { analyses: true },
        },
      },
    })

    if (!reel) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    const reelDTO = toReelDTO(reel)
    const transcriptionDTO = reel.transcription
      ? toTranscriptionDTO(reel.transcription)
      : null
    const analysesDTO = reel.analyses.map(toAnalysisDTO)

    const body: GetReelResponse = {
      reel: reelDTO,
      transcription: transcriptionDTO,
      analyses: analysesDTO,
    }

    return NextResponse.json(body)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[reels/GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
