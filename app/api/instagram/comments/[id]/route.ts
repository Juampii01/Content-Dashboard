/**
 * DELETE /api/instagram/comments/[id]
 *
 * [id] = our internal InstagramComment.id (cuid)
 *
 * Calls Instagram Graph API to hide the comment (is_hidden=true), then
 * marks it hidden in DB. Hides rather than deletes to preserve thread context.
 *
 * Returns:
 *   200 { ok: true }
 *   401 UNAUTHORIZED | TOKEN_EXPIRED
 *   403 FORBIDDEN
 *   404 NOT_CONNECTED | COMMENT_NOT_FOUND
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const { id } = await params

  // Rate limit: 20/min
  const rl = await checkRateLimit(clientId, `instagram:comments:delete:${clientId}`, 20, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  // Load comment (tenant-scoped)
  const comment = await db.instagramComment.findFirst({
    where: { id, clientId },
  })
  if (!comment) return NextResponse.json({ error: 'COMMENT_NOT_FOUND' }, { status: 404 })

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
  if (conn.expiresAt && conn.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })
  }

  const token = decryptToken(conn.accessToken)

  // Hide via Instagram API (POST /{comment-id}?hide=true)
  let igRes: Response
  try {
    const body = new URLSearchParams({ hide: 'true', access_token: token })
    igRes = await fetch(`${GRAPH}/${GRAPH_VERSION}/${comment.commentId}`, {
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
    console.error('[instagram/comments/delete] hide failed', { code, subcode, msg })
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

  // Mark hidden in DB
  await db.instagramComment.update({
    where: { id },
    data: { hidden: true, updatedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
