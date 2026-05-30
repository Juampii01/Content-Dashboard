/**
 * POST /api/ai/chat  — streams Claude grounded on the full workspace.
 *
 * Flow:
 *  1. Validate body with AIChatSchema → { conversationId?, content, model, context? }
 *  2. Create a new Conversation if conversationId missing (title = first 120 chars of content)
 *  3. Load conversation history from Prisma (oldest first)
 *  4. Load competitors context from Prisma
 *  5. Persist the USER message
 *  6. Stream Claude response via streamWorkspaceChat()
 *  7. On stream completion, persist ASSISTANT message with full text + tokens/cost
 *
 * Client receives an `x-conversation-id` header so it can update the URL / history.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AIChatSchema } from '@/lib/schemas/ai'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { streamWorkspaceChat } from '@/lib/claude/chat-workspace'
import { loadCompetitorsContext } from '@/lib/ai/load-competitors-context'

export const maxDuration = 180

export async function POST(req: NextRequest) {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Rate limit
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = rawIp ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'ai-chat', 20, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'IA no configurada' }, { status: 500 })
  }

  // Parse body
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = AIChatSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Solicitud inválida', issues: parsed.error.flatten() }
        : { error: 'Solicitud inválida' },
      { status: 400 },
    )
  }

  const { content, model, context } = parsed.data
  let { conversationId } = parsed.data

  // Resolve or create conversation (ownership-scoped)
  if (conversationId) {
    const existing = await db.conversation.findUnique({ where: { id: conversationId } })
    if (!existing || existing.clientId !== clientId) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }
  } else {
    const title = content.slice(0, 120).trim() || 'Nueva conversación'
    const created = await db.conversation.create({ data: { clientId, createdBy: userId, updatedBy: userId, title } })
    conversationId = created.id
  }

  // At this point conversationId is guaranteed to exist
  const cid: string = conversationId

  // Load history (oldest first)
  const history = await db.aIMessage.findMany({
    where: { conversationId: cid, clientId },
    orderBy: { createdAt: 'asc' },
  })

  // Load competitors context from DB
  let competitorsContext: Awaited<ReturnType<typeof loadCompetitorsContext>> = []
  try {
    competitorsContext = await loadCompetitorsContext(clientId)
  } catch (err) {
    console.warn('[ai/chat] could not load competitors context:', err)
  }

  // Persist user message
  const userMessage = await db.aIMessage.create({
    data: {
      clientId,
      createdBy: userId,
      updatedBy: userId,
      conversationId: cid,
      role: 'user',
      content,
    },
  })
  const userMessageId = userMessage.id

  // Build stream
  const stream = streamWorkspaceChat({
    workspace: context ?? {},
    competitors: competitorsContext,
    history,
    userMessage: content,
    model,
    onError: async () => {
      // Clean up orphaned user message if stream never completed
      await db.aIMessage.delete({ where: { id: userMessageId } }).catch(() => {})
    },
    onComplete: async ({ text, inputTokens, outputTokens, costUsd }) => {
      await db.aIMessage.create({
        data: {
          clientId,
          createdBy: userId,
          updatedBy: userId,
          conversationId: cid,
          role: 'assistant',
          content: text,
          model,
          inputTokens,
          outputTokens,
          costUsd,
        },
      })
      // Bump updatedAt so the sidebar reorders
      await db.conversation.update({
        where: { id: cid },
        data: { updatedAt: new Date() },
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'x-conversation-id': cid,
      'Access-Control-Expose-Headers': 'x-conversation-id',
    },
  })
}
