/**
 * GET  /api/reels/[id]/chat  — returns full chat history (oldest-first)
 * POST /api/reels/[id]/chat  — streams Claude response grounded in reel context
 *
 * POST flow:
 *  1. Validate body with ChatSchema → { content, model }
 *  2. Load reel + Transcription + latest Analysis + existing ChatMessages
 *  3. Persist the USER message immediately
 *  4. Stream Claude response via streamChat()
 *  5. On stream completion, persist ASSISTANT message with full text + model
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ChatSchema } from '@/lib/schemas/competidores'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { streamChat } from '@/lib/claude/chat-reel'
import type { GetChatResponse, ChatMessageDTO } from '@/lib/types/competidores'
import { CLAUDE_MODELS } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'

export const maxDuration = 120

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Validate a raw model string against known ClaudeModelId literals (B4b — closes ticket OLA3)
// Typed as Set<string> so .has() accepts arbitrary strings safely
const VALID_MODEL_IDS: Set<string> = new Set(CLAUDE_MODELS.map((m) => m.id))
function validateModel(raw: string | null): ClaudeModelId | null {
  return raw && VALID_MODEL_IDS.has(raw) ? (raw as ClaudeModelId) : null
}

function toChatMessageDTO(msg: {
  id: string
  reelId: string
  role: string
  content: string
  model: string | null
  createdAt: Date
}): ChatMessageDTO {
  return {
    id: msg.id,
    reelId: msg.reelId,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    // Use validateModel to ensure we only emit known ClaudeModelId values (B4b)
    model: validateModel(msg.model),
    createdAt: msg.createdAt.toISOString(),
  }
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    throw err
  }

  const { id } = await params

  // B9: wrap Prisma calls in try/catch
  try {
    const reel = await db.reel.findFirst({ where: { id, clientId } })
    if (!reel) {
      return NextResponse.json({ error: 'Reel no encontrado' }, { status: 404 })
    }

    const messages = await db.chatMessage.findMany({
      where: { reelId: id, clientId },
      orderBy: { createdAt: 'asc' },
    })

    const response: GetChatResponse = {
      messages: messages.map(toChatMessageDTO),
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[chat/GET] DB error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    throw err
  }

  // Rate limiting
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!rawIp && process.env.NODE_ENV === 'production') {
    console.warn('[ratelimit] missing x-forwarded-for header — all anonymous requests share the 127.0.0.1 bucket')
  }
  const ip = rawIp ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'chat', 20, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  }

  // Check API key early
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'IA no configurada' }, { status: 500 })
  }

  // Resolve route param
  const { id } = await params

  // Parse + validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = ChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Solicitud inválida', issues: parsed.error.flatten() }
        : { error: 'Solicitud inválida' },
      { status: 400 },
    )
  }

  // ChatSchema's z.enum now uses [ClaudeModelId, ...ClaudeModelId[]] (B6),
  // so model is inferred as ClaudeModelId — no cast needed.
  const content = parsed.data.content
  const model = parsed.data.model

  // Load reel (scoped to active client)
  const reel = await db.reel.findFirst({
    where: { id, clientId },
    include: {
      transcription: true,
      analyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      chatMessages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!reel) {
    return NextResponse.json({ error: 'Reel no encontrado' }, { status: 404 })
  }

  const transcription = reel.transcription ?? null
  const latestAnalysis = reel.analyses[0] ?? null
  const history = reel.chatMessages

  // Persist the user message immediately (before streaming starts)
  // NOTE(B4a): if streamChat throws before onComplete is called, this user message
  // will be orphaned in the DB. We intentionally keep it so the user can retry
  // manually without losing context. A future improvement could delete it on
  // confirmed stream failure if a retry-UI is added.
  await db.chatMessage.create({
    data: {
      clientId,
      createdBy: userId,
      updatedBy: userId,
      reelId: id,
      role: 'user',
      content,
      model: null,
    },
  })

  // Build stream — onComplete persists the assistant message
  const stream = streamChat({
    reel: {
      caption: reel.caption,
      viewsCount: reel.viewsCount,
      likesCount: reel.likesCount,
      commentsCount: reel.commentsCount,
      sharesCount: reel.sharesCount,
    },
    transcription: transcription
      ? { text: transcription.text, language: transcription.language }
      : null,
    analysis: latestAnalysis
      ? {
          painPoints: latestAnalysis.painPoints,
          desires: latestAnalysis.desires,
          problems: latestAnalysis.problems,
          insights: latestAnalysis.insights,
          keywords: latestAnalysis.keywords,
        }
      : null,
    history,
    userMessage: content,
    model,
    onComplete: async ({ text, inputTokens, outputTokens, costUsd }) => {
      await db.chatMessage.create({
        data: {
          clientId,
          createdBy: userId,
          updatedBy: userId,
          reelId: id,
          role: 'assistant',
          content: text,
          model,
          inputTokens,
          outputTokens,
          costUsd,
        },
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
