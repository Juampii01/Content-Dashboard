/**
 * POST /api/reels/[id]/analyze
 *
 * Runs Claude tool_use analysis on a reel and persists a new Analysis row
 * (history is preserved — never upsert).
 *
 * Body: { model: ClaudeModelId }  (validated with AnalyzeSchema)
 *
 * Error codes:
 *   400 TRANSCRIPTION_REQUIRED — no Transcription row exists for this reel
 *   404 NOT_FOUND
 *   422 INVALID_BODY (Zod)
 *   429 TOO_MANY_REQUESTS
 *   500 internal errors
 *
 * Response: AnalyzeResponse
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyzeReel } from '@/lib/claude/analyze-reel'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { AnalyzeSchema } from '@/lib/schemas/competidores'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import type { AnalyzeResponse, AnalysisDTO } from '@/lib/types/competidores'
import type { ClaudeModelId } from '@/lib/claude/models'

// Claude calls can take up to a minute on long transcriptions.
export const maxDuration = 120

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safe JSON.parse for string[] columns — avoids crash on DB corruption (B7) */
function safeStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

// ─── DTO helper ───────────────────────────────────────────────────────────────

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  // 0. Rate limit (10 calls / 60 s per IP)
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!rawIp && process.env.NODE_ENV === 'production') {
    console.warn('[ratelimit] missing x-forwarded-for header — all anonymous requests share the 127.0.0.1 bucket')
  }
  const ip = rawIp ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'analyze', 10, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 })
  }

  // 1. ANTHROPIC_API_KEY sanity check
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI_NOT_CONFIGURED' }, { status: 503 })
  }

  const { id } = await params

  // 2. Parse + validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = AnalyzeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'INVALID_BODY', issues: parsed.error.flatten() }
        : { error: 'INVALID_BODY' },
      { status: 422 }
    )
  }

  // AnalyzeSchema's z.enum now uses [ClaudeModelId, ...ClaudeModelId[]] (B6),
  // so Zod infers model as ClaudeModelId — no cast needed.
  const model = parsed.data.model

  // 3. Load reel + transcription (scoped to active client)
  const reel = await db.reel.findFirst({
    where: { id, clientId },
    include: { transcription: true },
  })

  if (!reel) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // 4. Transcription is required before analysis
  if (!reel.transcription) {
    return NextResponse.json({ error: 'TRANSCRIPTION_REQUIRED' }, { status: 400 })
  }

  // 5. Call Claude tool_use
  let result: Awaited<ReturnType<typeof analyzeReel>>
  try {
    result = await analyzeReel({
      caption: reel.caption,
      transcription: reel.transcription.text,
      metrics: {
        viewsCount: reel.viewsCount,
        likesCount: reel.likesCount,
        commentsCount: reel.commentsCount,
        sharesCount: reel.sharesCount,
      },
      model,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[analyze] Claude error:', message)
    return NextResponse.json(
      { error: 'ANALYSIS_FAILED', message: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    )
  }

  // 6. Persist new Analysis row (INSERT — never upsert, history preserved)
  const analysis = await db.analysis.create({
    data: {
      clientId,
      createdBy: userId,
      updatedBy: userId,
      reelId: id,
      model,
      // Arrays stored as JSON strings in the SQLite String columns
      painPoints: JSON.stringify(result.painPoints),
      desires: JSON.stringify(result.desires),
      problems: JSON.stringify(result.problems),
      insights: JSON.stringify(result.insights),
      keywords: JSON.stringify(result.keywords),
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
    },
  })

  // 7. Respond with un-stringified DTO
  const responseBody: AnalyzeResponse = {
    analysis: toAnalysisDTO(analysis),
  }
  return NextResponse.json(responseBody)
}
