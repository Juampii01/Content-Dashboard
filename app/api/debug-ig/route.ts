/**
 * GET /api/debug-ig
 * TEMPORARY — delete after diagnosis. SUPER_ADMIN only.
 *
 * Diagnoses the Instagram token stored for the active client.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth-user'
import { decryptToken } from '@/lib/crypto'

const CLIENT_ID = 'cmp5vftlr0000ju04v4iagnzm'

async function fetchIG(label: string, url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const text = await res.text()
    let body: unknown
    try { body = JSON.parse(text) } catch { body = text.slice(0, 500) }
    return { label, status: res.status, body }
  } catch (e) {
    return { label, status: 0, body: String(e) }
  }
}

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId: CLIENT_ID, platform: 'instagram' } },
  })

  if (!conn) {
    return NextResponse.json({ error: 'no connection found', clientId: CLIENT_ID })
  }

  const raw = conn.accessToken
  const isEncrypted = raw.startsWith('v1.')
  const token = decryptToken(raw)
  const decryptOk = !token.startsWith('v1.')  // if still v1. → decrypt failed

  const t = encodeURIComponent(token)
  const igUserId = conn.accountId

  const calls = await Promise.all([
    fetchIG('a) /v21.0/me (versioned)', `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type&access_token=${t}`),
    fetchIG('b) /me (unversioned)', `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${t}`),
    fetchIG('c) /v21.0/me/media', `https://graph.instagram.com/v21.0/me/media?fields=id,caption&limit=3&access_token=${t}`),
    fetchIG(`d) /${igUserId} (stored user_id)`, `https://graph.instagram.com/${igUserId}?fields=id,username,account_type&access_token=${t}`),
    fetchIG('e) graph.facebook.com/v21.0/me (token type check)', `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${t}`),
  ])

  return NextResponse.json({
    connection: {
      accountId: conn.accountId,
      accountName: conn.accountName,
      expiresAt: conn.expiresAt?.toISOString() ?? null,
      tokenStoredAs: isEncrypted ? 'encrypted(v1)' : 'plaintext',
      decryptOk,
      tokenPrefix: token.slice(0, 25) + '...',
      tokenLength: token.length,
    },
    calls,
  })
}
