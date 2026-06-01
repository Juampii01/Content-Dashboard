/**
 * POST /api/instagram/messages/sync
 *
 * Syncs Instagram DM conversations and their last 20 messages for every
 * connected client. Called by Vercel Cron every 5 minutes AND manually
 * from the UI.
 *
 * When called by cron, Vercel sets:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * When called from the UI (logged-in user), it only syncs the active client.
 *
 * Returns:
 *   200 { synced: number }  (number of conversations updated)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { decryptToken } from '@/lib/crypto'

const GRAPH = 'https://graph.instagram.com'
const GRAPH_VERSION = 'v23.0'

interface IGError {
  error: { message: string; type: string; code: number; error_subcode?: number }
}

async function igGet<T>(url: string, token?: string): Promise<
  { ok: true; data: T } | { ok: false; code: number; message: string; status: number }
> {
  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(12_000) })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const e = (json as IGError | null)?.error
      return { ok: false, status: res.status, code: e?.code ?? 0, message: e?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, data: json as T }
  } catch (e) {
    return { ok: false, status: 0, code: 0, message: String(e) }
  }
}

interface IGParticipant { id: string; username?: string; profile_picture_url?: string; name?: string }
interface IGConversationRaw {
  id: string
  updated_time: string
  unread_count?: number
  participants?: { data: IGParticipant[] }
}
interface IGConversationsResponse { data: IGConversationRaw[]; paging?: unknown }

interface IGMessageRaw {
  id: string
  message?: string
  created_time: string
  from?: { id: string; username?: string; name?: string }
  attachments?: unknown
}
interface IGMessagesResponse { data: IGMessageRaw[]; paging?: { next?: string } }

async function syncClient(clientId: string, accountId: string, token: string): Promise<number> {
  // Fetch conversations with pagination (up to 10 pages of 20)
  const allConvs: IGConversationRaw[] = []
  let convsUrl: string | undefined =
    `${GRAPH}/${GRAPH_VERSION}/${accountId}/conversations?platform=instagram&fields=id,updated_time,unread_count,participants&limit=20`
  let convsPage = 0
  while (convsUrl && convsPage < 10) {
    const convsRes: Awaited<ReturnType<typeof igGet<IGConversationsResponse>>> = await igGet<IGConversationsResponse>(convsUrl, token)
    if (!convsRes.ok) {
      console.warn(`[messages/sync] conversations fetch failed for ${clientId}:`, convsRes.message)
      break
    }
    allConvs.push(...convsRes.data.data)
    const nextPage: string | undefined = (convsRes.data.paging as { next?: string } | undefined)?.next
    convsUrl = nextPage
    convsPage++
  }

  if (allConvs.length === 0) return 0

  let synced = 0

  for (const conv of allConvs) {
    // Find the non-business participant
    const participants = conv.participants?.data ?? []
    const other = participants.find(p => p.id !== accountId) ?? participants[0]

    const lastMessageAt = conv.updated_time ? new Date(conv.updated_time) : null

    // Upsert conversation
    await db.iGConversation.upsert({
      where: { clientId_conversationId: { clientId, conversationId: conv.id } },
      create: {
        clientId,
        conversationId: conv.id,
        participantId: other?.id ?? '',
        participantUsername: other?.username ?? other?.name ?? '',
        participantPic: other?.profile_picture_url ?? '',
        lastMessageAt,
        unreadCount: conv.unread_count ?? 0,
        updatedAt: new Date(),
      },
      update: {
        participantUsername: other?.username ?? other?.name ?? '',
        participantPic: other?.profile_picture_url ?? '',
        lastMessageAt,
        unreadCount: conv.unread_count ?? 0,
        updatedAt: new Date(),
      },
    })

    // Fetch last 20 messages for this conversation
    const msgsRes = await igGet<IGMessagesResponse>(
      `${GRAPH}/${GRAPH_VERSION}/${conv.id}/messages?fields=id,message,created_time,from,attachments&limit=20`,
      token,
    )
    if (!msgsRes.ok) {
      console.warn(`[messages/sync] messages fetch failed for conv ${conv.id}:`, msgsRes.message)
      continue
    }

    let lastUserMsgAt: Date | null = null

    for (const msg of msgsRes.data.data) {
      const isFromBusiness = msg.from?.id === accountId
      const ts = new Date(msg.created_time)

      await db.iGMessage.upsert({
        where: { clientId_messageId: { clientId, messageId: msg.id } },
        create: {
          clientId,
          conversationId: conv.id,
          messageId: msg.id,
          fromId: msg.from?.id ?? '',
          fromUsername: msg.from?.username ?? msg.from?.name ?? '',
          text: msg.message ?? '',
          isFromBusiness,
          timestamp: ts,
        },
        update: {
          text: msg.message ?? '',
        },
      })

      if (!isFromBusiness) {
        if (!lastUserMsgAt || ts > lastUserMsgAt) lastUserMsgAt = ts
      }
    }

    // Update 24h window timestamp
    if (lastUserMsgAt) {
      await db.iGConversation.update({
        where: { clientId_conversationId: { clientId, conversationId: conv.id } },
        data: { lastUserMessageAt: lastUserMsgAt, updatedAt: new Date() },
      })
    }

    synced++
  }

  return synced
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (isCron) {
    // Cron path: sync ALL connected clients
    const connections = await db.socialConnection.findMany({
      where: {
        platform: 'instagram',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    let total = 0
    for (const conn of connections) {
      try {
        const token = decryptToken(conn.accessToken)
        const count = await syncClient(conn.clientId, conn.accountId, token)
        total += count
      } catch (e) {
        console.error(`[messages/sync] error syncing client ${conn.clientId}:`, e)
      }
    }

    return NextResponse.json({ synced: total })
  }

  // UI path: sync active client only
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
    void userId
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError)    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
  if (conn.expiresAt && conn.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 })
  }

  const token = decryptToken(conn.accessToken)
  const synced = await syncClient(clientId, conn.accountId, token)

  return NextResponse.json({ synced })
}
