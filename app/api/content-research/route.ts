/**
 * /api/content-research — channel-level "what's working" research.
 *
 * Endpoints:
 *   GET     → list the active client's last 50 research runs.
 *   POST    → run a new research: detect platform, fetch top 5 videos,
 *             batch-analyze with Claude Haiku, persist to history.
 *   DELETE  → remove a row by id.
 *
 * Pipeline:
 *   YouTube channel → resolveYouTubeChannel + getTopYouTubeVideos
 *                     → analyzeRankedItems → save
 *   Instagram profile → fetchInstagramProfilePosts → top 5 by views
 *                       → analyzeRankedItems → save
 *
 * Slim-port note: the original Smart-Scale flow also transcribed each video
 * before analysis. We skip that here — analysis is on title + caption only —
 * because (a) running 5 transcriptions per request is expensive and slow, and
 * (b) Content Dashboard's existing `/transcript` route already covers the
 * "transcribe one video" use case.
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
  ResearchRequestSchema,
  DeleteResearchSchema,
} from '@/lib/schemas/content-research'
import {
  isYouTubeChannelUrl,
  resolveYouTubeChannel,
  getTopYouTubeVideos,
} from '@/lib/youtube/channel-research'
import {
  fetchInstagramProfilePosts,
  extractInstagramUsername,
} from '@/lib/instagram/profile-fetch'
import { analyzeRankedItems } from '@/lib/claude/analyze-videos-batch'
import { getYouTubeTranscript, extractYouTubeId } from '@/lib/youtube/transcript-fetch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface ResearchVideo {
  videoId: string
  title: string
  description: string
  thumbnail: string | null
  videoUrl: string
  views: number
  likes: number
  comments: number
  duration: string
  publishedAt: string | null
  transcript: string | null
  analysis: string | null
}

function authError(err: unknown): NextResponse | null {
  if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return null
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

// ─── GET ─────────────────────────────────────────────────────────────────────

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
    const items = await db.contentResearchHistory.findMany({
      where: { clientId: scope.clientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[content-research/GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

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
  const parsed = DeleteResearchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const result = await db.contentResearchHistory.deleteMany({
    where: { id: parsed.data.id, clientId: scope.clientId },
  })
  if (result.count === 0) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ success: true })
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let scope: { userId: string; clientId: string }
  try {
    scope = await requireActiveClient()
  } catch (err) {
    const e = authError(err)
    if (e) return e
    throw err
  }

  // Heavy pipeline (multiple external calls + Claude). 5/min mirrors scrape.
  const rl = await checkRateLimit(getIp(req), 'content-research', 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ResearchRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  const channelUrl = parsed.data.channelUrl
  const timeframeDays = parsed.data.timeframeDays ?? 30

  let platform: 'youtube' | 'instagram'
  let channelName = ''
  let channelAvatar: string | null = null
  let resolvedUrl = channelUrl
  let videos: ResearchVideo[] = []

  try {
    if (isYouTubeChannelUrl(channelUrl)) {
      platform = 'youtube'
      const ch = await resolveYouTubeChannel(channelUrl)
      channelName = ch.channelName
      channelAvatar = ch.channelAvatar
      resolvedUrl = ch.channelUrl
      const top = await getTopYouTubeVideos(ch.channelId, timeframeDays)
      videos = top.map((v) => ({
        videoId: v.videoId,
        title: v.title,
        description: v.description,
        thumbnail: v.thumbnail,
        videoUrl: v.videoUrl,
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        duration: v.duration,
        publishedAt: v.publishedAt,
        transcript: null,
        analysis: null,
      }))
      // Best-effort transcript fetch — YouTube caption tracks only, no Groq (free, fast).
      const transcripts = await Promise.allSettled(
        videos.map(async (v) => {
          const vid = extractYouTubeId(v.videoUrl)
          if (!vid) return null
          const r = await getYouTubeTranscript(vid)
          return r.transcript
        }),
      )
      videos.forEach((v, i) => {
        const r = transcripts[i]
        v.transcript = (r?.status === 'fulfilled' ? r.value : null) ?? null
      })
    } else if (extractInstagramUsername(channelUrl)) {
      platform = 'instagram'
      const ig = await fetchInstagramProfilePosts(channelUrl)
      channelName = ig.username
      resolvedUrl = `https://www.instagram.com/${ig.username}/`
      const cutoff = new Date(Date.now() - timeframeDays * 86_400_000).getTime()
      const within = ig.posts.filter((p) => {
        if (!p.timestamp) return true
        return new Date(p.timestamp).getTime() >= cutoff
      })
      // If no posts fall within the window (e.g. account hasn't posted recently),
      // fall back to the most recent posts across all time so the request doesn't fail.
      const pool = within.length > 0 ? within : ig.posts
      const top = pool
        .sort((a, b) => (b.videoPlayCount ?? b.likesCount ?? 0) - (a.videoPlayCount ?? a.likesCount ?? 0))
        .slice(0, 5)
      videos = top.map((p) => ({
        videoId: p.id,
        title: (p.caption ?? '').slice(0, 120) || 'Sin descripción',
        description: (p.caption ?? '').slice(0, 300),
        thumbnail: p.displayUrl,
        videoUrl: p.url,
        views: p.videoPlayCount ?? p.likesCount ?? 0,
        likes: p.likesCount,
        comments: p.commentsCount,
        duration: p.videoDuration
          ? `${Math.floor(p.videoDuration / 60)}:${String(Math.round(p.videoDuration % 60)).padStart(2, '0')}`
          : '—',
        publishedAt: p.timestamp,
        transcript: null,
        analysis: null,
      }))
    } else {
      return NextResponse.json(
        { error: 'URL no reconocida. Pegá un canal de YouTube o un perfil de Instagram.' },
        { status: 400 },
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[content-research] pipeline error:', message)
    const safeMessage = process.env.NODE_ENV !== 'production' ? message : null
    return NextResponse.json({ error: safeMessage || 'Error en la búsqueda.' }, { status: 502 })
  }

  if (videos.length === 0) {
    return NextResponse.json(
      { error: 'No se encontraron videos en la ventana solicitada.' },
      { status: 422 },
    )
  }

  // Best-effort batch analysis. If ANTHROPIC key is missing, analysis stays null.
  try {
    const analyses = await analyzeRankedItems(
      channelName,
      videos.map((v) => ({
        id: v.videoId,
        title: v.title,
        views: v.views,
        comments: v.comments,
        transcript: v.transcript ?? undefined,
      })),
    )
    videos.forEach((v) => {
      const a = analyses.get(v.videoId)
      if (a) v.analysis = a
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[content-research] analysis failed:', message)
  }

  const row = await db.contentResearchHistory.create({
    data: {
      clientId: scope.clientId,
      createdBy: scope.userId,
      platform,
      channelUrl: resolvedUrl,
      channelName,
      channelAvatar,
      timeframeDays,
      videos: videos as unknown as object,
    },
  })

  return NextResponse.json(row)
}
