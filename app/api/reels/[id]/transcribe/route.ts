/**
 * POST /api/reels/[id]/transcribe
 *
 * Transcribes a reel's video using Groq Whisper.  Idempotent: if a Transcription
 * row already exists it is returned immediately without re-calling Groq.
 *
 * Error codes (machine-readable, per CONTRACTS § 4):
 *   410 VIDEO_URL_MISSING   — reel has no videoUrl
 *   410 VIDEO_URL_EXPIRED   — Groq returned 4xx that indicates CDN URL expired
 *   422 VIDEO_URL_INVALID   — videoUrl host is not an allowed Instagram CDN
 *   429 TOO_MANY_REQUESTS   — rate limit exceeded
 *   502 TRANSCRIPTION_FAILED — Groq auth / rate error (not a URL issue)
 *   500 internal errors
 *
 * Response: TranscribeResponse
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { transcribeFromUrl } from '@/lib/groq/transcribe'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import type { TranscribeResponse, TranscriptionDTO } from '@/lib/types/competidores'

// Allow up to 5 minutes — Groq is fast but the reel video can take time to
// fetch on Groq's side.
export const maxDuration = 300

// Only allow known Instagram CDN hostnames (SSRF defence — B1)
const ALLOWED_HOSTS = ['cdninstagram.com', 'fbcdn.net']

// ─── DTO helper ───────────────────────────────────────────────────────────────

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

  // 0. Rate limit (10 calls / 60 s per IP) — B1
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!rawIp && process.env.NODE_ENV === 'production') {
    console.warn('[ratelimit] missing x-forwarded-for header — all anonymous requests share the 127.0.0.1 bucket')
  }
  const ip = rawIp ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'transcribe', 10, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 })
  }

  const { id } = await params

  // 1. Load reel (scoped to active client)
  const reel = await db.reel.findFirst({
    where: { id, clientId },
    include: { transcription: true },
  })

  if (!reel) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // 2. videoUrl required
  if (!reel.videoUrl) {
    return NextResponse.json({ error: 'VIDEO_URL_MISSING' }, { status: 410 })
  }

  // 3. Validate videoUrl hostname — SSRF defence (B1)
  try {
    const u = new URL(reel.videoUrl)
    if (!ALLOWED_HOSTS.some((h) => u.hostname.endsWith(h))) {
      return NextResponse.json({ error: 'VIDEO_URL_INVALID' }, { status: 422 })
    }
  } catch {
    return NextResponse.json({ error: 'VIDEO_URL_INVALID' }, { status: 422 })
  }

  // 4. Idempotency — return cached transcription if it exists
  if (reel.transcription) {
    const body: TranscribeResponse = {
      transcription: toTranscriptionDTO(reel.transcription),
    }
    return NextResponse.json(body)
  }

  // 5. Call Groq
  let result: Awaited<ReturnType<typeof transcribeFromUrl>>
  try {
    result = await transcribeFromUrl(reel.videoUrl)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)

    // Discriminate Groq 4xx errors — B1:
    //   401 (Groq auth) and 403 (forbidden) → not a URL issue, surface as 502
    //   429 (Groq rate limit)               → not a URL issue, surface as 502
    if (/HTTP 40[13]/.test(message) || /HTTP 429/.test(message)) {
      console.error('[transcribe] Groq auth/rate error:', message)
      return NextResponse.json({ error: 'TRANSCRIPTION_FAILED' }, { status: 502 })
    }
    // Other 4xx (e.g. 410, 404) → Instagram CDN URL has expired
    if (/HTTP 4\d\d/.test(message)) {
      return NextResponse.json({ error: 'VIDEO_URL_EXPIRED' }, { status: 410 })
    }

    // Internal / unexpected error
    console.error('[transcribe] Groq error:', message)
    return NextResponse.json(
      { error: 'TRANSCRIPTION_FAILED', message: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    )
  }

  // 6. Persist Transcription row — wrap in P2002 catch for concurrent requests (B1)
  try {
    const transcription = await db.transcription.create({
      data: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        reelId: id,
        text: result.text,
        language: result.language,
        provider: 'groq-whisper-v3-turbo',
        costUsd: result.costUsd,
      },
    })

    const body: TranscribeResponse = {
      transcription: toTranscriptionDTO(transcription),
    }
    return NextResponse.json(body)
  } catch (err) {
    // Two concurrent requests can race on the reelId @unique constraint — B1
    if ((err as { code?: string }).code === 'P2002') {
      const existing = await db.transcription.findUnique({ where: { reelId: id } })
      if (existing) return NextResponse.json({ transcription: toTranscriptionDTO(existing) })
    }
    throw err
  }
}
