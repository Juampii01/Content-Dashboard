/**
 * GET /api/instagram/debug
 *
 * Diagnostic endpoint — calls several Instagram Graph API endpoints with the
 * stored token and returns the raw responses so we can see exactly what
 * Instagram reports about the account type and token permissions.
 *
 * TEMPORARY: Remove once sync issues are diagnosed.
 *
 * Returns 200 { token_info, account_info, media_test }
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { decryptToken } from '@/lib/crypto'

const GRAPH = 'https://graph.instagram.com/v21.0'

async function safeGet(url: string): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  } catch (e) {
    return { status: -1, body: String(e) }
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const { clientId } = await requireActiveClient()

    const conn = await db.socialConnection.findUnique({
      where: { clientId_platform: { clientId, platform: 'instagram' } },
    })
    if (!conn) {
      return NextResponse.json({ error: 'NOT_CONNECTED' }, { status: 404 })
    }

    const accessToken = decryptToken(conn.accessToken)
    const tokenPreview = accessToken.slice(0, 12) + '...' + accessToken.slice(-6)

    // Test 1: Basic account info with account_type
    const accountInfo = await safeGet(
      `${GRAPH}/me?fields=id,username,name,account_type,profile_picture_url,followers_count,media_count&access_token=${encodeURIComponent(accessToken)}`,
    )

    // Test 2: Media endpoint (the one that fails)
    const mediaTest = await safeGet(
      `${GRAPH}/me/media?fields=id,caption,media_type,timestamp&limit=1&access_token=${encodeURIComponent(accessToken)}`,
    )

    // Test 3: Token debug — what scopes were actually granted
    const tokenDebug = await safeGet(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(accessToken)}`,
    )

    // Test 4: Stories endpoint (Business/Creator accounts)
    const storiesTest = await safeGet(
      `${GRAPH}/me/stories?fields=id,media_type,timestamp&limit=1&access_token=${encodeURIComponent(accessToken)}`,
    )

    return NextResponse.json({
      token_preview: tokenPreview,
      connection: {
        accountId: conn.accountId,
        accountName: conn.accountName,
        expiresAt: conn.expiresAt,
        scopes: conn.scopes,
      },
      account_info: accountInfo,
      media_test: mediaTest,
      token_debug: tokenDebug,
      stories_test: storiesTest,
    })
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }
}
