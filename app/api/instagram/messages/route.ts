/**
 * GET /api/instagram/messages?conversationId=<id>
 *
 * Without conversationId: returns the list of conversations for the active
 * client (most recent first, up to 30).
 *
 * With conversationId: returns all stored messages for that conversation
 * (oldest first) plus the conversation record (for 24h window state).
 *
 * Returns:
 *   200 { conversations: IGConversation[] }
 *   200 { conversation: IGConversation; messages: IGMessage[] }
 *   401 UNAUTHORIZED
 *   403 FORBIDDEN
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export async function GET(req: NextRequest): Promise<NextResponse> {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const conversationId = req.nextUrl.searchParams.get('conversationId')

  if (conversationId) {
    const [conversation, messages] = await Promise.all([
      db.iGConversation.findFirst({
        where: { clientId, conversationId },
      }),
      db.iGMessage.findMany({
        where: { clientId, conversationId },
        orderBy: { timestamp: 'asc' },
      }),
    ])
    if (conversationId && !conversation) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ conversation, messages })
  }

  const conversations = await db.iGConversation.findMany({
    where: { clientId },
    orderBy: { lastMessageAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({ conversations })
}
