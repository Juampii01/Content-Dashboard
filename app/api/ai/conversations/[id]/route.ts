import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CLAUDE_MODELS } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import type {
  AIMessageDTO,
  ConversationDTO,
  GetConversationResponse,
} from '@/lib/types/ai'

async function authOr401(): Promise<{ userId: string; clientId: string } | NextResponse> {
  try { return await requireActiveClient() } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }
}

const VALID_MODEL_IDS: Set<string> = new Set(CLAUDE_MODELS.map((m) => m.id))
function validateModel(raw: string | null): ClaudeModelId | null {
  return raw && VALID_MODEL_IDS.has(raw) ? (raw as ClaudeModelId) : null
}

function toConversationDTO(c: {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}): ConversationDTO {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

function toMessageDTO(m: {
  id: string
  conversationId: string
  role: string
  content: string
  model: string | null
  createdAt: Date
}): AIMessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    model: validateModel(m.model),
    createdAt: m.createdAt.toISOString(),
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  try {
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!conversation || conversation.clientId !== clientId) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }
    const response: GetConversationResponse = {
      conversation: toConversationDTO(conversation),
      messages: conversation.messages.map(toMessageDTO),
    }
    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai/conversations/[id]/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  try {
    // Scope delete to client: deleteMany returns a count, avoids leaking existence.
    const result = await db.conversation.deleteMany({ where: { id, clientId } })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai/conversations/[id]/DELETE] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
