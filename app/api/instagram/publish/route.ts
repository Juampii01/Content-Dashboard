/**
 * POST /api/instagram/publish
 *
 * Publishes IMAGE, REEL or CAROUSEL to Instagram via the Content Publishing API.
 *
 * Flow:
 *   IMAGE/REEL  → create container → poll status → media_publish
 *   CAROUSEL    → create N item containers → poll each → create carousel container → poll → media_publish
 *
 * Body: {
 *   mediaType: 'IMAGE' | 'REEL' | 'CAROUSEL',
 *   mediaUrls: string[],            // 1 url for IMAGE/REEL, 2..10 for CAROUSEL
 *   itemTypes?: ('IMAGE'|'VIDEO')[],// per-item type for CAROUSEL (defaults all IMAGE)
 *   caption?: string,
 * }
 * URLs must be publicly accessible HTTPS (Meta pulls them).
 *
 * Real rate limit comes from GET /me/content_publishing_limit (429 if reached).
 *
 * GET /api/instagram/publish → { posts: PublishedPost[], limit: {quota_usage,quota_total}|null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { decryptToken } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import {
  createImageContainer, createReelContainer, createCarouselImageItem, createCarouselVideoItem,
  createCarouselContainer, getContainerStatus, publishContainer, getPermalink,
  getContentPublishingLimit, type IGResult,
} from '@/lib/instagram/client'

// Vercel: allow up to 60s for video container processing
export const maxDuration = 60

const BodySchema = z.object({
  mediaType: z.enum(['IMAGE', 'REEL', 'CAROUSEL']),
  mediaUrls: z.array(z.string().url().startsWith('https://')).min(1).max(10),
  itemTypes: z.array(z.enum(['IMAGE', 'VIDEO'])).optional(),
  caption: z.string().max(2200).optional().default(''),
}).refine(
  (d) => d.mediaType !== 'CAROUSEL' || d.mediaUrls.length >= 2,
  { message: 'CAROUSEL requiere 2 a 10 items', path: ['mediaUrls'] },
).refine(
  (d) => d.mediaType === 'CAROUSEL' || d.mediaUrls.length === 1,
  { message: 'IMAGE/REEL requiere exactamente 1 url', path: ['mediaUrls'] },
)

// Maps a failed Meta result → an HTTP response. Side-effect: expires token on code 190.
async function mapIgError(
  r: Extract<IGResult<unknown>, { ok: false }>,
  clientId: string, userId: string,
): Promise<NextResponse> {
  const { code, subcode, status, message } = r
  console.error('[instagram/publish] meta error', { code, subcode, status, message })
  if (code === 190) {
    await db.socialConnection.update({
      where: { clientId_platform: { clientId, platform: 'instagram' } },
      data: { expiresAt: new Date(0), updatedBy: userId },
    }).catch(() => {})
    return NextResponse.json({ error: 'TOKEN_EXPIRED', detail: message }, { status: 401 })
  }
  if (status === 429 || code === 4 || code === 17 || code === 32 || subcode === 2446079)
    return NextResponse.json({ error: 'RATE_LIMITED', detail: message }, { status: 429 })
  if (code === 9007) return NextResponse.json({ error: 'MEDIA_NOT_READY', detail: message }, { status: 503 })
  if (code === 24)   return NextResponse.json({ error: 'INVALID_MEDIA_TYPE', detail: message }, { status: 422 })
  return NextResponse.json({ error: 'FETCH_FAILED', detail: message }, { status: 502 })
}

/** Poll a container until FINISHED, honoring a wall-clock deadline (Vercel maxDuration). */
async function pollUntilFinished(
  token: string, containerId: string, deadline: number,
): Promise<{ ok: true } | { ok: false; reason: 'ERROR' | 'EXPIRED' | 'TIMEOUT' | 'NETWORK'; detail: string }> {
  let networkErrors = 0
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3_000))
    const s = await getContainerStatus(token, containerId)
    if (!s.ok) {
      if (++networkErrors >= 3) return { ok: false, reason: 'NETWORK', detail: s.message }
      continue
    }
    networkErrors = 0
    const code = s.data.status_code
    if (code === 'FINISHED') return { ok: true }
    if (code === 'ERROR' || code === 'EXPIRED') return { ok: false, reason: code, detail: `Container status: ${code}` }
    // IN_PROGRESS / PUBLISHED → keep waiting
  }
  return { ok: false, reason: 'TIMEOUT', detail: 'Container processing timed out' }
}

// ─── GET — history + real publishing limit ────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Auto-fail stale PENDING (process killed mid-publish)
  const staleCutoff = new Date(); staleCutoff.setMinutes(staleCutoff.getMinutes() - 10)
  await db.publishedPost.updateMany({
    where: { clientId, status: 'PENDING', createdAt: { lt: staleCutoff } },
    data: { status: 'FAILED', errorMessage: 'STALE_PENDING' },
  })

  const posts = await db.publishedPost.findMany({
    where: { clientId }, orderBy: { createdAt: 'desc' }, take: 20,
  })

  // Best-effort real limit from Meta
  let limit: { quota_usage: number; quota_total: number } | null = null
  const conn = await db.socialConnection.findUnique({ where: { clientId_platform: { clientId, platform: 'instagram' } } })
  if (conn && (!conn.expiresAt || conn.expiresAt.getTime() > Date.now())) {
    try { limit = await getContentPublishingLimit(decryptToken(conn.accessToken)) } catch { /* non-fatal */ }
  }

  return NextResponse.json({ posts, limit })
}

// ─── POST — publish ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({
      error: 'VALIDATION_ERROR',
      ...(process.env.NODE_ENV !== 'production' ? { detail: parsed.error.flatten() } : {}),
    }, { status: 400 })
  }
  const { mediaType, mediaUrls, itemTypes, caption } = parsed.data

  // App-level burst guard: 5/min
  const rl = await checkRateLimit(clientId, `instagram:publish:${clientId}`, 5, '60 s')
  if (rl !== null && !rl.success) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })

  const conn = await db.socialConnection.findUnique({ where: { clientId_platform: { clientId, platform: 'instagram' } } })
  if (!conn) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
  if (conn.expiresAt && conn.expiresAt.getTime() <= Date.now())
    return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })

  const token = decryptToken(conn.accessToken)

  // Real daily quota from Meta (carousel counts as 1 publish)
  const limit = await getContentPublishingLimit(token)
  if (limit && limit.quota_usage >= limit.quota_total) {
    return NextResponse.json(
      { error: 'DAILY_LIMIT_REACHED', detail: `Límite de Instagram alcanzado (${limit.quota_usage}/${limit.quota_total} en 24h).` },
      { status: 429 },
    )
  }

  // Persist queue row immediately (idempotency + recovery)
  const record = await db.publishedPost.create({
    data: {
      clientId, createdBy: userId,
      mediaType, mediaUrl: mediaUrls[0], mediaUrls,
      itemTypes: mediaType === 'CAROUSEL' ? (itemTypes ?? mediaUrls.map(() => 'IMAGE')) : [],
      caption, status: 'PENDING', updatedAt: new Date(),
    },
  })

  const fail = async (msg: string) => {
    await db.publishedPost.update({ where: { id: record.id }, data: { status: 'FAILED', errorMessage: msg, updatedAt: new Date() } })
  }

  const deadline = Date.now() + 50_000 // leave headroom under maxDuration=60s

  // ── Build the container to publish ──────────────────────────────────────────
  let creationId: string

  if (mediaType === 'CAROUSEL') {
    // 1) create + poll each child item
    const childIds: string[] = []
    const types = itemTypes ?? mediaUrls.map(() => 'IMAGE')
    for (let i = 0; i < mediaUrls.length; i++) {
      const item = types[i] === 'VIDEO'
        ? await createCarouselVideoItem(token, mediaUrls[i])
        : await createCarouselImageItem(token, mediaUrls[i])
      if (!item.ok) { await fail(item.message); return mapIgError(item, clientId, userId) }
      const poll = await pollUntilFinished(token, item.data.id, deadline)
      if (!poll.ok) { await fail(`item ${i + 1}: ${poll.detail}`); return NextResponse.json({ error: poll.reason === 'TIMEOUT' ? 'PUBLISH_TIMEOUT' : 'CONTAINER_FAILED', detail: poll.detail }, { status: 502 }) }
      childIds.push(item.data.id)
    }
    // 2) carousel container
    const carousel = await createCarouselContainer(token, childIds, caption)
    if (!carousel.ok) { await fail(carousel.message); return mapIgError(carousel, clientId, userId) }
    const poll = await pollUntilFinished(token, carousel.data.id, deadline)
    if (!poll.ok) { await fail(poll.detail); return NextResponse.json({ error: poll.reason === 'TIMEOUT' ? 'PUBLISH_TIMEOUT' : 'CONTAINER_FAILED', detail: poll.detail }, { status: 502 }) }
    creationId = carousel.data.id
  } else {
    const container = mediaType === 'REEL'
      ? await createReelContainer(token, mediaUrls[0], caption)
      : await createImageContainer(token, mediaUrls[0], caption)
    if (!container.ok) { await fail(container.message); return mapIgError(container, clientId, userId) }
    await db.publishedPost.update({ where: { id: record.id }, data: { containerId: container.data.id } })
    const poll = await pollUntilFinished(token, container.data.id, deadline)
    if (!poll.ok) { await fail(poll.detail); return NextResponse.json({ error: poll.reason === 'TIMEOUT' ? 'PUBLISH_TIMEOUT' : 'CONTAINER_FAILED', detail: poll.detail }, { status: 502 }) }
    creationId = container.data.id
  }

  // ── Publish ─────────────────────────────────────────────────────────────────
  const pub = await publishContainer(token, creationId)
  if (!pub.ok) { await fail(pub.message); return mapIgError(pub, clientId, userId) }

  const publishedId = pub.data.id
  const now = new Date()
  const permalink = await getPermalink(token, publishedId).catch(() => null)

  const post = await db.publishedPost.update({
    where: { id: record.id },
    data: { postId: publishedId, status: 'PUBLISHED', publishedAt: now, updatedAt: now, permalink },
  })

  return NextResponse.json({ post })
}
