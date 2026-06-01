/**
 * POST /api/instagram/messages/send
 *
 * Body: { conversationId: string, text: string }
 *
 * Validates the 24-hour messaging window, sends the message via the
 * Instagram Graph API, and persists it to IGMessage.
 *
 * Returns:
 *   200 { message: IGMessage }
 *   400 MISSING_FIELDS | TEXT_TOO_LONG
 *   401 UNAUTHORIZED | TOKEN_EXPIRED
 *   403 FORBIDDEN | MESSAGING_WINDOW_CLOSED
 *   404 NOT_CONNECTED | CONVERSATION_NOT_FOUND
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

const WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

const BodySchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1).max(1000),
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
  const { conversationId, text } = parsed.data

  // Rate limit: 30/min
  const rl = await checkRateLimit(clientId, `instagram:messages:send:${clientId}`, 30, '60 s')
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

  // Load conversation (tenant-scoped)
  const conversation = await db.iGConversation.findFirst({
    where: { clientId, conversationId },
  })
  if (!conversation) return NextResponse.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 })

  // ── 24-hour window check ───────────────────────────────────────────────────
  if (!conversation.lastUserMessageAt) {
    return NextResponse.json(
      { error: 'MESSAGING_WINDOW_CLOSED', detail: 'No hay mensajes del usuario en esta conversación' },
      { status: 403 },
    )
  }
  const windowAge = Date.now() - conversation.lastUserMessageAt.getTime()
  if (windowAge > WINDOW_MS) {
    return NextResponse.json(
      { error: 'MESSAGING_WINDOW_CLOSED', detail: 'Han pasado más de 24 horas desde el último mensaje del usuario' },
      { status: 403 },
    )
  }

  const token = decryptToken(conn.accessToken)

  // ── Send via Instagram API ─────────────────────────────────────────────────
  const igUserId = conn.accountId

  let igRes: Response
  try {
    igRes = await fetch(`${GRAPH}/${GRAPH_VERSION}/${igUserId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        recipient: { id: conversation.participantId },
        message: { text },
      }),
      signal: AbortSignal.timeout(12_000),
    })
  } catch (e) {
    return NextResponse.json({ error: 'FETCH_FAILED', detail: String(e) }, { status: 502 })
  }

  const igJson = await igRes.json().catch(() => null)

  if (!igRes.ok) {
    const e = (igJson as IGError | null)?.error
    const code = e?.code ?? 0
    const subcode = e?.error_subcode ?? null
    const msg = e?.message ?? `HTTP ${igRes.status}`
    console.error('[instagram/messages/send] failed', { code, subcode, msg })
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

  const newMsgId = (igJson as { message_id?: string })?.message_id ?? `local-${Date.now()}`
  const now = new Date()

  // Persist sent message
  const message = await db.iGMessage.upsert({
    where: { clientId_messageId: { clientId, messageId: newMsgId } },
    create: {
      clientId,
      conversationId,
      messageId: newMsgId,
      fromId: conn.accountId,
      fromUsername: conn.accountName,
      text,
      isFromBusiness: true,
      timestamp: now,
    },
    update: { text },
  })

  // Update conversation lastMessageAt
  await db.iGConversation.update({
    where: { clientId_conversationId: { clientId, conversationId } },
    data: { lastMessageAt: now, updatedAt: now },
  })

  return NextResponse.json({ message })
}
