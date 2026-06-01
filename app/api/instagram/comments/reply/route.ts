/**
 * POST /api/instagram/comments/reply
 *
 * Body: { commentId: string, message: string }
 *
 * Posts a reply to an Instagram comment via the Graph API, then upserts
 * the new reply into InstagramComment.
 *
 * Returns:
 *   200 { comment: InstagramComment }
 *   400 MISSING_FIELDS | MESSAGE_TOO_LONG
 *   401 UNAUTHORIZED | TOKEN_EXPIRED
 *   403 FORBIDDEN
 *   404 NOT_CONNECTED | COMMENT_NOT_FOUND
 *   429 RATE_LIMITED
 *   502 FETCH_FAILED
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { decryptToken } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/utils/ratelimit'

const GRAPH = 'https://graph.instagram.com'
const GRAPH_VERSION = 'v23.0'

const BodySchema = z.object({
  commentId: z.string().min(1),
  message: z.string().min(1).max(2200),
})

interface IGError {
  error: { message: string; type: string; code: number; error_subcode?: number }
}

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
  if (!parsed.success) return NextResponse.json({ error: 'MISSING_FIELDS', detail: parsed.error.flatten() }, { status: 400 })
  const { commentId, message } = parsed.data

  // Rate limit: 10/min (posting replies)
  const rl = await checkRateLimit(clientId, `instagram:comments:reply:${clientId}`, 10, '60 s')
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

  // Verify parent comment belongs to this client
  const parent = await db.instagramComment.findUnique({
    where: { clientId_commentId: { clientId, commentId } },
  })
  if (!parent) return NextResponse.json({ error: 'COMMENT_NOT_FOUND' }, { status: 404 })

  const token = decryptToken(conn.accessToken)

  // Post reply via Instagram API
  const body = new URLSearchParams({ message, access_token: token })
  let igRes: Response
  try {
    igRes = await fetch(`${GRAPH}/${GRAPH_VERSION}/${commentId}/replies`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(12_000),
    })
  } catch (e) {
    console.error('[instagram/comments] fetch error:', e)
    return NextResponse.json({
      error: 'FETCH_FAILED',
      ...(process.env.NODE_ENV !== 'production' ? { detail: String(e) } : {}),
    }, { status: 502 })
  }

  const igJson = await igRes.json().catch(() => null)

  if (!igRes.ok) {
    const e = (igJson as IGError | null)?.error
    const code = e?.code ?? 0
    const subcode = e?.error_subcode ?? null
    const msg = e?.message ?? `HTTP ${igRes.status}`
    console.error('[instagram/comments/reply] post failed', { code, subcode, msg })
    if (code === 190) {
      await db.socialConnection.update({
        where: { clientId_platform: { clientId, platform: 'instagram' } },
        data: { expiresAt: new Date(0), updatedBy: userId },
      })
      return NextResponse.json({ error: 'TOKEN_EXPIRED', detail: msg }, { status: 401 })
    }
    if (igRes.status === 429 || code === 4 || code === 17 || code === 32 || subcode === 2446079) {
      return NextResponse.json({ error: 'RATE_LIMITED', detail: msg }, { status: 429 })
    }
    return NextResponse.json({ error: 'FETCH_FAILED', detail: msg }, { status: 502 })
  }

  const newReplyId = (igJson as { id?: string })?.id
  if (!newReplyId) {
    return NextResponse.json({ error: 'FETCH_FAILED', detail: 'No reply ID returned' }, { status: 502 })
  }

  // Fetch authoritative timestamp from Meta
  let ts = new Date()
  try {
    const r = await fetch(
      `${GRAPH}/${GRAPH_VERSION}/${newReplyId}?fields=id,timestamp`,
      { headers: { Authorization: 'Bearer ' + token } },
    )
    if (r.ok) {
      const d = await r.json() as { timestamp?: string }
      if (d.timestamp) ts = new Date(d.timestamp)
    }
  } catch {}

  // Persist reply
  const comment = await db.instagramComment.upsert({
    where: { clientId_commentId: { clientId, commentId: newReplyId } },
    create: {
      clientId,
      mediaId: parent.mediaId,
      commentId: newReplyId,
      username: conn.accountName ?? '',
      text: message,
      timestamp: ts,
      likeCount: 0,
      hidden: false,
      parentId: commentId,
      updatedAt: new Date(),
    },
    update: { text: message, updatedAt: new Date() },
  })

  return NextResponse.json({ comment })
}
