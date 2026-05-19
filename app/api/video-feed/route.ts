/**
 * /api/video-feed — connect the active client's own Instagram profile and get
 * its last 30 days of posts ranked by engagement, each with an AI summary.
 *
 * Endpoints:
 *   GET     → return the stored account + posts (or null if not connected)
 *   POST    → connect or refresh: re-scrape, only re-analyze NEW posts,
 *             merge with existing analyses, persist
 *   DELETE  → disconnect (remove the row)
 *
 * Singleton design: there's one row per (clientId, platform). Posts are
 * stored as JSON inside the row — re-running POST upserts.
 *
 * Ported from Smart-Scale's `app/api/video-feed/route.ts`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireActiveClient,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { ConnectFeedSchema } from '@/lib/schemas/video-feed'
import {
  fetchInstagramProfilePosts,
  type InstagramPost,
} from '@/lib/instagram/profile-fetch'
import { analyzeRankedItems } from '@/lib/claude/analyze-videos-batch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PLATFORM = 'instagram' as const
const WINDOW_DAYS = 30

interface FeedPost {
  postId: string
  type: 'Video' | 'Image'
  title: string
  caption: string
  thumbnail: string | null
  postUrl: string
  views: number
  likes: number
  comments: number
  duration: string | null
  publishedAt: string | null
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

function engagement(p: FeedPost): number {
  return (p.views + p.comments) / 2
}

function igPostToFeed(p: InstagramPost): FeedPost {
  return {
    postId: p.id,
    type: p.isVideo ? 'Video' : 'Image',
    title: (p.caption ?? '').slice(0, 120) || 'Sin descripción',
    caption: (p.caption ?? '').slice(0, 300),
    thumbnail: p.displayUrl,
    postUrl: p.url,
    views: Math.max(0, p.videoPlayCount ?? p.likesCount ?? 0),
    likes: p.likesCount,
    comments: p.commentsCount,
    duration: p.videoDuration
      ? `${Math.floor(p.videoDuration / 60)}:${String(Math.round(p.videoDuration % 60)).padStart(2, '0')}`
      : null,
    publishedAt: p.timestamp,
    analysis: null,
  }
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
    const account = await db.videoFeedAccount.findUnique({
      where: { clientId_platform: { clientId: scope.clientId, platform: PLATFORM } },
    })
    return NextResponse.json({ account })
  } catch (err) {
    console.error('[video-feed/GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE() {
  let scope: { userId: string; clientId: string }
  try {
    scope = await requireActiveClient()
  } catch (err) {
    const e = authError(err)
    if (e) return e
    throw err
  }
  await db.videoFeedAccount.deleteMany({
    where: { clientId: scope.clientId, platform: PLATFORM },
  })
  return NextResponse.json({ success: true })
}

// ─── POST: connect or refresh ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let scope: { userId: string; clientId: string }
  try {
    scope = await requireActiveClient()
  } catch (err) {
    const e = authError(err)
    if (e) return e
    throw err
  }

  const rl = await checkRateLimit(getIp(req), 'video-feed', 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = ConnectFeedSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  const existing = await db.videoFeedAccount.findUnique({
    where: { clientId_platform: { clientId: scope.clientId, platform: PLATFORM } },
  })
  const existingPosts: FeedPost[] = Array.isArray(existing?.posts) ? (existing.posts as unknown as FeedPost[]) : []
  const existingIds = new Set(existingPosts.map((p) => p.postId))

  let username = ''
  let scraped: InstagramPost[] = []
  try {
    const ig = await fetchInstagramProfilePosts(parsed.data.channelUrl)
    username = ig.username
    scraped = ig.posts
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const safeMessage = process.env.NODE_ENV !== 'production' ? message : null
    return NextResponse.json({ error: safeMessage || 'No se pudieron obtener los posts.' }, { status: 502 })
  }

  const cutoff = Date.now() - WINDOW_DAYS * 86_400_000
  const within = scraped
    .map(igPostToFeed)
    .filter((p) => p.publishedAt && new Date(p.publishedAt).getTime() >= cutoff)

  const newPosts = within.filter((p) => !existingIds.has(p.postId))

  // Re-use existing analyses for posts we already had
  for (const p of within) {
    if (existingIds.has(p.postId)) {
      const prev = existingPosts.find((ep) => ep.postId === p.postId)
      if (prev?.analysis) p.analysis = prev.analysis
    }
  }

  if (newPosts.length > 0) {
    const analyses = await analyzeRankedItems(
      username,
      newPosts.map((p) => ({ id: p.postId, title: p.title, views: p.views, comments: p.comments })),
    )
    newPosts.forEach((p) => {
      const a = analyses.get(p.postId)
      if (a) p.analysis = a
    })
  }

  const merged = within.sort((a, b) => engagement(b) - engagement(a))

  const row = await db.videoFeedAccount.upsert({
    where: { clientId_platform: { clientId: scope.clientId, platform: PLATFORM } },
    update: {
      channelUrl: `https://www.instagram.com/${username}/`,
      channelName: username,
      posts: merged as unknown as object,
    },
    create: {
      clientId: scope.clientId,
      createdBy: scope.userId,
      platform: PLATFORM,
      channelUrl: `https://www.instagram.com/${username}/`,
      channelName: username,
      posts: merged as unknown as object,
    },
  })

  return NextResponse.json({
    account: row,
    newPostsCount: newPosts.length,
  })
}
