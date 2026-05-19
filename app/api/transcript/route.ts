/**
 * /api/transcript — paste-a-URL transcribe + AI summary.
 *
 * Endpoints:
 *   GET     → list the active client's last 50 transcripts
 *   POST    → resolve URL, transcribe, summarize, persist
 *   DELETE  → remove one row by id (must belong to active client)
 *
 * Pipeline (POST):
 *   Instagram URL → Apify resolves to videoUrl + caption → Groq Whisper → transcript
 *   YouTube URL   → caption tracks (Apify or watch-page scrape) → transcript
 *   then: Claude Sonnet → summary → save row
 *
 * Project conventions used:
 *   - `requireActiveClient()` for tenant scoping (httpOnly cookie, never body)
 *   - Zod schema for input validation
 *   - `checkRateLimit()` to throttle paid pipelines (Apify + Groq + Claude)
 *   - Prisma singleton via `@/lib/db`
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
  TranscribeRequestSchema,
  DeleteTranscriptSchema,
} from '@/lib/schemas/transcript'
import {
  isInstagramUrl,
  resolveInstagramUrl,
} from '@/lib/apify/instagram-url-resolver'
import {
  isYouTubeUrl,
  extractYouTubeId,
  getYouTubeTranscript,
  getYouTubeMetadataFromWatchPage,
} from '@/lib/youtube/transcript-fetch'
import { transcribeFromUrl } from '@/lib/groq/transcribe'
import { summarizeTranscript } from '@/lib/claude/summarize-transcript'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authError(err: unknown): NextResponse | null {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
  return null
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

// ─── GET: history ─────────────────────────────────────────────────────────────

export async function GET() {
  let scope: { userId: string; clientId: string }
  try {
    scope = await requireActiveClient()
  } catch (err) {
    const e = authError(err)
    if (e) return e
    throw err
  }

  try {
    const items = await db.transcriptHistory.findMany({
      where: { clientId: scope.clientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        url: true,
        platform: true,
        title: true,
        creator: true,
        duration: true,
        thumbnail: true,
        summary: true,
        transcript: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[transcript/GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE: remove one ───────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  let scope: { userId: string; clientId: string }
  try {
    scope = await requireActiveClient()
  } catch (err) {
    const e = authError(err)
    if (e) return e
    throw err
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = DeleteTranscriptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Ownership check via clientId — Prisma deleteMany returns 0 if not owned.
  const result = await db.transcriptHistory.deleteMany({
    where: { id: parsed.data.id, clientId: scope.clientId },
  })
  if (result.count === 0) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}

// ─── POST: transcribe + summarize ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let scope: { userId: string; clientId: string }
  try {
    scope = await requireActiveClient()
  } catch (err) {
    const e = authError(err)
    if (e) return e
    throw err
  }

  const ip = getIp(req)
  // Same budget as `/api/reels/[id]/transcribe`'s implicit cost: Apify + Groq +
  // Claude per call. 5/min mirrors `/api/analizador/scrape`.
  const rl = await checkRateLimit(ip, 'transcript', 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = TranscribeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  const url = parsed.data.url

  let platform: 'youtube' | 'instagram'
  let title: string | null = null
  let creator: string | null = null
  let thumbnail: string | null = null
  let duration: string | null = null
  let transcript: string | null = null

  try {
    if (isInstagramUrl(url)) {
      platform = 'instagram'
      const ig = await resolveInstagramUrl(url)
      if (!ig) {
        return NextResponse.json(
          { error: 'No se pudo resolver el reel desde Instagram (Apify).' },
          { status: 422 },
        )
      }
      creator = ig.username
      duration = ig.duration
      title = ig.caption ? ig.caption.slice(0, 120) : `Reel${ig.username ? ` · ${ig.username}` : ''}`
      if (!ig.videoUrl) {
        return NextResponse.json(
          { error: 'Apify resolvió el post pero no expuso un videoUrl utilizable.' },
          { status: 422 },
        )
      }
      const result = await transcribeFromUrl(ig.videoUrl)
      transcript = result.text
    } else if (isYouTubeUrl(url)) {
      platform = 'youtube'
      const videoId = extractYouTubeId(url)
      if (!videoId) {
        return NextResponse.json(
          { error: 'URL de YouTube no reconocida.' },
          { status: 400 },
        )
      }
      const meta = await getYouTubeMetadataFromWatchPage(videoId)
      title = meta.title
      creator = meta.creator
      thumbnail = meta.thumbnail
      duration = meta.duration

      const yt = await getYouTubeTranscript(videoId)
      transcript = yt.transcript
      if (!transcript) {
        const message =
          yt.reason === 'login_required'
            ? 'Este video requiere login, tiene restricción de edad o es privado.'
            : 'No se pudo obtener la transcripción desde los proveedores disponibles.'
        return NextResponse.json(
          { error: message, reason: yt.reason },
          { status: 422 },
        )
      }
    } else {
      return NextResponse.json(
        { error: 'URL no reconocida. Pegá un link de YouTube o Instagram.' },
        { status: 400 },
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[transcript] pipeline error:', message)
    return NextResponse.json(
      { error: 'Error al obtener el transcript.' },
      { status: 502 },
    )
  }

  if (!transcript || !transcript.trim()) {
    return NextResponse.json(
      { error: 'Transcript vacío. El proveedor no devolvió texto.' },
      { status: 422 },
    )
  }

  let summary = ''
  try {
    summary = await summarizeTranscript(transcript, creator)
  } catch (err) {
    // Summary is best-effort — surface the transcript even if summarize fails.
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[transcript] summary failed:', message)
  }

  const row = await db.transcriptHistory.create({
    data: {
      clientId: scope.clientId,
      createdBy: scope.userId,
      url,
      platform,
      title,
      creator,
      duration,
      thumbnail,
      transcript,
      summary,
    },
    select: {
      id: true,
      url: true,
      platform: true,
      title: true,
      creator: true,
      duration: true,
      thumbnail: true,
      transcript: true,
      summary: true,
      createdAt: true,
    },
  })

  return NextResponse.json(row)
}
