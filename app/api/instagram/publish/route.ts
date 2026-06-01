/**
 * POST /api/instagram/publish
 *
 * Publishes a photo or reel to Instagram via the Content Publishing API.
 * Two-step flow:
 *   1. Create media container  →  POST /me/media
 *   2. Poll container status   →  GET  /{containerId}?fields=status_code
 *   3. Publish container       →  POST /me/media_publish
 *
 * Body: { mediaType: 'IMAGE' | 'REEL', mediaUrl: string, caption?: string }
 *
 * mediaUrl must be a publicly accessible HTTPS URL.
 *
 * Returns:
 *   200 { post: PublishedPost }
 *   400 VALIDATION_ERROR
 *   401 UNAUTHORIZED | TOKEN_EXPIRED
 *   403 FORBIDDEN
 *   404 NOT_CONNECTED
 *   429 RATE_LIMITED
 *   502 FETCH_FAILED | CONTAINER_FAILED | PUBLISH_TIMEOUT
 *
 * GET /api/instagram/publish
 *
 * Returns last 20 published posts for the active client.
 *   200 { posts: PublishedPost[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { decryptToken } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/utils/ratelimit'

// Vercel Pro: allow up to 60s for video container processing
export const maxDuration = 60

const GRAPH = 'https://graph.instagram.com'
const GRAPH_VERSION = 'v23.0'

const BodySchema = z.object({
  mediaType: z.enum(['IMAGE', 'REEL']),
  mediaUrl: z.string().url().startsWith('https://'),
  caption: z.string().max(2200).optional().default(''),
})

interface IGError {
  error: { message: string; type: string; code: number; error_subcode?: number }
}

async function igPost<T>(url: string, body: URLSearchParams): Promise<
  { ok: true; data: T } | { ok: false; code: number; subcode: number | null; message: string; status: number }
> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(15_000),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const e = (json as IGError | null)?.error
      return { ok: false, status: res.status, code: e?.code ?? 0, subcode: e?.error_subcode ?? null, message: e?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, data: json as T }
  } catch (e) {
    return { ok: false, status: 0, code: 0, subcode: null, message: String(e) }
  }
}

async function igGet<T>(url: string): Promise<
  { ok: true; data: T } | { ok: false; code: number; subcode: number | null; message: string; status: number }
> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const e = (json as IGError | null)?.error
      return { ok: false, status: res.status, code: e?.code ?? 0, subcode: e?.error_subcode ?? null, message: e?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, data: json as T }
  } catch (e) {
    return { ok: false, status: 0, code: 0, subcode: null, message: String(e) }
  }
}

// ─── GET — list recent published posts ────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Clean up stale PENDING records older than 10 minutes
  const staleCutoff = new Date(); staleCutoff.setMinutes(staleCutoff.getMinutes() - 10);
  await db.publishedPost.updateMany({
    where: { clientId, status: 'PENDING', createdAt: { lt: staleCutoff } },
    data: { status: 'FAILED', errorMessage: 'STALE_PENDING' },
  })

  const posts = await db.publishedPost.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ posts })
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
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', detail: parsed.error.flatten() }, { status: 400 })
  const { mediaType, mediaUrl, caption } = parsed.data

  // Rate limit: 5/min (publishing is expensive)
  const rl = await checkRateLimit(clientId, `instagram:publish:${clientId}`, 5, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
  if (conn.expiresAt && conn.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })
  }

  const token = decryptToken(conn.accessToken)

  // ── Daily quota check ──────────────────────────────────────────────────────
  const ago24 = new Date(); ago24.setHours(ago24.getHours() - 24);
  const dailyCount = await db.publishedPost.count({
    where: { clientId, status: { in: ['PUBLISHED', 'PENDING'] }, createdAt: { gte: ago24 } },
  })
  if (dailyCount >= 24) {
    return NextResponse.json(
      { error: 'DAILY_LIMIT_REACHED', detail: 'Límite de 25 publicaciones/día de Instagram alcanzado.' },
      { status: 429 },
    )
  }

  // ── MIME preflight (non-fatal) ─────────────────────────────────────────────
  const headRes = await fetch(mediaUrl, { method: 'HEAD' }).catch(() => null)
  if (headRes) {
    const ct = headRes.headers.get('content-type') ?? ''
    const ok = mediaType === 'REEL' ? ct.includes('video/') : ct.includes('image/')
    if (!ok) {
      return NextResponse.json(
        { error: 'INVALID_MEDIA_TYPE', detail: 'Tipo de archivo no compatible con Meta.' },
        { status: 422 },
      )
    }
  }

  // ── Step 1: Create container ───────────────────────────────────────────────
  const containerParams = new URLSearchParams({ caption, access_token: token })
  if (mediaType === 'IMAGE') {
    containerParams.set('image_url', mediaUrl)
  } else {
    containerParams.set('media_type', 'REELS')
    containerParams.set('video_url', mediaUrl)
    containerParams.set('share_to_feed', 'true')
  }

  const containerRes = await igPost<{ id: string }>(
    `${GRAPH}/${GRAPH_VERSION}/me/media`,
    containerParams,
  )

  if (!containerRes.ok) {
    const { code, subcode, status, message } = containerRes
    console.error('[instagram/publish] container creation failed', { code, subcode, status, message })
    if (code === 190) {
      await db.socialConnection.update({
        where: { clientId_platform: { clientId, platform: 'instagram' } },
        data: { expiresAt: new Date(0), updatedBy: userId },
      })
      return NextResponse.json({ error: 'TOKEN_EXPIRED', detail: message }, { status: 401 })
    }
    if (status === 429 || code === 4 || code === 17 || code === 32 || subcode === 2446079) {
      return NextResponse.json({ error: 'RATE_LIMITED', detail: message }, { status: 429 })
    }
    if (code === 9007) {
      return NextResponse.json({ error: 'MEDIA_NOT_READY', detail: message }, { status: 503 })
    }
    if (code === 24) {
      return NextResponse.json({ error: 'INVALID_MEDIA_TYPE', detail: message }, { status: 422 })
    }
    return NextResponse.json({ error: 'FETCH_FAILED', detail: message }, { status: 502 })
  }

  const containerId = containerRes.data.id

  // Persist as PENDING immediately
  const record = await db.publishedPost.create({
    data: {
      clientId,
      createdBy: userId,
      containerId,
      mediaType,
      mediaUrl,
      caption,
      status: 'PENDING',
      updatedAt: new Date(),
    },
  })

  // ── Step 2: Poll container status ──────────────────────────────────────────
  // For images: typically FINISHED in <1s. For reels: up to ~30s.
  // Poll up to 10× with 3s delay = 30s max.
  const MAX_POLLS = 10
  const POLL_INTERVAL_MS = 3_000
  let statusCode = 'IN_PROGRESS'
  let networkErrorCount = 0

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))

    const statusRes = await igGet<{ status_code: string }>(
      `${GRAPH}/${GRAPH_VERSION}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
    )

    if (!statusRes.ok) {
      console.warn('[instagram/publish] status poll failed (non-fatal)', statusRes.message)
      networkErrorCount++
      if (networkErrorCount >= 3) break
      continue
    }

    networkErrorCount = 0
    statusCode = statusRes.data.status_code

    if (statusCode === 'FINISHED') break
    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      await db.publishedPost.update({
        where: { id: record.id },
        data: { status: 'FAILED', errorMessage: `Container status: ${statusCode}`, updatedAt: new Date() },
      })
      return NextResponse.json({ error: 'CONTAINER_FAILED', detail: statusCode }, { status: 502 })
    }
  }

  if (networkErrorCount >= 3) {
    return NextResponse.json({ error: 'NETWORK_ERROR', detail: 'Status polling failed due to repeated network errors' }, { status: 503 })
  }

  if (statusCode !== 'FINISHED') {
    await db.publishedPost.update({
      where: { id: record.id },
      data: { status: 'FAILED', errorMessage: 'Timeout waiting for container', updatedAt: new Date() },
    })
    return NextResponse.json({ error: 'PUBLISH_TIMEOUT', detail: 'Container processing timed out' }, { status: 502 })
  }

  // ── Step 3: Publish ────────────────────────────────────────────────────────
  const publishRes = await igPost<{ id: string }>(
    `${GRAPH}/${GRAPH_VERSION}/me/media_publish`,
    new URLSearchParams({ creation_id: containerId, access_token: token }),
  )

  if (!publishRes.ok) {
    const { code, subcode, status, message } = publishRes
    console.error('[instagram/publish] publish failed', { code, subcode, status, message })
    await db.publishedPost.update({
      where: { id: record.id },
      data: { status: 'FAILED', errorMessage: message, updatedAt: new Date() },
    })
    if (code === 190) {
      await db.socialConnection.update({
        where: { clientId_platform: { clientId, platform: 'instagram' } },
        data: { expiresAt: new Date(0), updatedBy: userId },
      })
      return NextResponse.json({ error: 'TOKEN_EXPIRED', detail: message }, { status: 401 })
    }
    if (status === 429 || code === 4 || code === 17 || code === 32 || subcode === 2446079) {
      return NextResponse.json({ error: 'RATE_LIMITED', detail: message }, { status: 429 })
    }
    return NextResponse.json({ error: 'FETCH_FAILED', detail: message }, { status: 502 })
  }

  const publishedId = publishRes.data.id
  const now = new Date()

  // Fetch permalink from Meta
  let permalink: string | null = null
  try {
    const permalinkRes = await fetch(
      `${GRAPH}/${GRAPH_VERSION}/${publishedId}?fields=permalink`,
      { headers: { Authorization: 'Bearer ' + token } },
    )
    if (permalinkRes.ok) {
      const d = await permalinkRes.json() as { permalink?: string }
      permalink = d.permalink ?? null
    }
  } catch {}

  const post = await db.publishedPost.update({
    where: { id: record.id },
    data: { postId: publishedId, status: 'PUBLISHED', publishedAt: now, updatedAt: now, permalink },
  })

  return NextResponse.json({ post })
}
