import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import type {
  ConversationDTO,
  ListConversationsResponse,
} from '@/lib/types/ai'

async function authOr401(): Promise<{ userId: string; clientId: string } | NextResponse> {
  try { return await requireActiveClient() } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }
}

function toDTO(c: {
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

export async function GET() {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth
  try {
    const conversations = await db.conversation.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })
    const response: ListConversationsResponse = {
      conversations: conversations.map(toDTO),
    }
    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai/conversations/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await authOr401()
  if (auth instanceof NextResponse) return auth
  const { userId, clientId } = auth
  try {
    const body = await req.json().catch(() => ({}))
    const rawTitle = typeof body.title === 'string' ? body.title.trim() : ''
    const title = rawTitle.length > 0 ? rawTitle.slice(0, 120) : 'Nueva conversación'
    const c = await db.conversation.create({ data: { clientId, createdBy: userId, updatedBy: userId, title } })
    return NextResponse.json({ conversation: toDTO(c) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai/conversations/POST] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
