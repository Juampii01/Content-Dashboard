/**
 * GET /api/instagram/comments?mediaId=<instagramMediaId>
 *
 * Syncs top-level comments + their replies for a given media from the
 * Instagram Graph API, upserts into InstagramComment, and returns them.
 *
 * Returns:
 *   200 { comments: InstagramComment[] }
 *   400 MISSING_MEDIA_ID
 *   401 UNAUTHORIZED | TOKEN_EXPIRED
 *   403 FORBIDDEN
 *   404 NOT_CONNECTED
 *   422 INSUFFICIENT_FOLLOWERS
 *   429 RATE_LIMITED
 *   502 FETCH_FAILED
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { decryptToken } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/utils/ratelimit'

const GRAPH = 'https://graph.instagram.com'
const GRAPH_VERSION = 'v23.0'

interface IGError {
  error: { message: string; type: string; code: number; error_subcode?: number }
}

async function igGet<T>(url: string): Promise<
  { ok: true; data: T } | { ok: false; code: number; subcode: number | null; message: string; status: number }
> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
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

interface IGComment {
  id: string
  text: string
  username: string
  timestamp: string
  like_count?: number
  hidden?: boolean
  replies?: { data: Array<{ id: string; text: string; username: string; timestamp: string; like_count?: number }> }
}
interface IGCommentsResponse {
  data: IGComment[]
  paging?: { cursors?: { after?: string }; next?: string }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const mediaId = req.nextUrl.searchParams.get('mediaId')
  if (!mediaId) return NextResponse.json({ error: 'MISSING_MEDIA_ID' }, { status: 400 })

  // Rate limit: 20/min
  const rl = await checkRateLimit(clientId, `instagram:comments:${clientId}`, 20, '60 s')
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
  const t = encodeURIComponent(token)

  // Fetch comments (up to 100) with nested replies
  const url = `${GRAPH}/${GRAPH_VERSION}/${mediaId}/comments?fields=id,text,username,timestamp,like_count,hidden,replies{id,text,username,timestamp,like_count}&limit=100&access_token=${t}`
  const res = await igGet<IGCommentsResponse>(url)

  if (!res.ok) {
    const { code, subcode, status, message } = res
    console.error('[instagram/comments] fetch failed', { code, subcode, status, message })
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
    if (message.toLowerCase().includes('minimum') || message.toLowerCase().includes('100 follow')) {
      return NextResponse.json({ error: 'INSUFFICIENT_FOLLOWERS', detail: message }, { status: 422 })
    }
    return NextResponse.json({ error: 'FETCH_FAILED', detail: message }, { status: 502 })
  }

  const now = new Date()

  // Upsert top-level comments + replies
  for (const c of res.data.data) {
    await db.instagramComment.upsert({
      where: { clientId_commentId: { clientId, commentId: c.id } },
      create: {
        clientId,
        mediaId,
        commentId: c.id,
        username: c.username ?? '',
        text: c.text,
        timestamp: new Date(c.timestamp),
        likeCount: c.like_count ?? 0,
        hidden: c.hidden ?? false,
        parentId: null,
        updatedAt: now,
      },
      update: {
        text: c.text,
        likeCount: c.like_count ?? 0,
        hidden: c.hidden ?? false,
        updatedAt: now,
      },
    })

    for (const r of c.replies?.data ?? []) {
      await db.instagramComment.upsert({
        where: { clientId_commentId: { clientId, commentId: r.id } },
        create: {
          clientId,
          mediaId,
          commentId: r.id,
          username: r.username ?? '',
          text: r.text,
          timestamp: new Date(r.timestamp),
          likeCount: r.like_count ?? 0,
          hidden: false,
          parentId: c.id,
          updatedAt: now,
        },
        update: {
          text: r.text,
          likeCount: r.like_count ?? 0,
          updatedAt: now,
        },
      })
    }
  }

  // Return all stored comments for this media
  const comments = await db.instagramComment.findMany({
    where: { clientId, mediaId },
    orderBy: { timestamp: 'asc' },
  })

  return NextResponse.json({ comments })
}
