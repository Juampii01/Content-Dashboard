/**
 * GET /api/instagram/debug
 * Temporary diagnostic — shows raw Instagram API responses to diagnose
 * why /me/media returns empty. Remove after issue is resolved.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

const GRAPH = 'https://graph.instagram.com'

export async function GET(): Promise<NextResponse> {
  let clientId: string
  try {
    ;({ clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const conn = await db.socialConnection.findUnique({
    where: { clientId_platform: { clientId, platform: 'instagram' } },
  })
  if (!conn) return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })

  const token = conn.accessToken
  const results: Record<string, unknown> = {}

  // 1. Token debug info
  const debugRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
  ).catch(() => null)
  results.token_debug = debugRes?.ok ? await debugRes.json() : { error: 'fetch failed' }

  // 2. /me profile
  const meRes = await fetch(
    `${GRAPH}/me?fields=id,username,name,followers_count,media_count,account_type&access_token=${encodeURIComponent(token)}`,
  ).catch(() => null)
  results.me = meRes?.ok ? await meRes.json() : { status: meRes?.status, error: 'fetch failed' }

  // 3. /me/media raw
  const mediaRes = await fetch(
    `${GRAPH}/me/media?fields=id,media_type,timestamp&limit=5&access_token=${encodeURIComponent(token)}`,
  ).catch(() => null)
  results.media_raw = mediaRes ? await mediaRes.json() : { error: 'fetch failed' }
  results.media_status = mediaRes?.status

  return NextResponse.json(results)
}
