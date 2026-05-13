/**
 * Refresh a Meta long-lived access token before it expires.
 *
 * Meta long-lived tokens last ~60 days. We refresh when fewer than 7 days
 * remain so there's always a buffer. On failure we return the existing token
 * and log the error — the sync continues with the current token.
 */

import { db } from '@/lib/db'

const GRAPH = 'https://graph.facebook.com/v19.0'
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function maybeRefreshToken(
  conn: { accessToken: string; expiresAt: Date | null; clientId: string },
  userId: string,
): Promise<string> {
  if (!conn.expiresAt) return conn.accessToken

  const msUntilExpiry = conn.expiresAt.getTime() - Date.now()
  if (msUntilExpiry > REFRESH_THRESHOLD_MS) return conn.accessToken

  const appId     = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return conn.accessToken

  try {
    const params = new URLSearchParams({
      grant_type:       'fb_exchange_token',
      client_id:        appId,
      client_secret:    appSecret,
      fb_exchange_token: conn.accessToken,
    })
    const res = await fetch(`${GRAPH}/oauth/access_token?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.warn('[instagram/refresh-token] refresh failed:', res.status)
      return conn.accessToken
    }
    const data = (await res.json()) as { access_token: string; expires_in?: number }
    const newToken   = data.access_token
    const newExpiry  = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null

    await db.socialConnection.update({
      where: { clientId_platform: { clientId: conn.clientId, platform: 'instagram' } },
      data:  { accessToken: newToken, expiresAt: newExpiry, updatedBy: userId },
    })
    console.info('[instagram/refresh-token] token refreshed, new expiry:', newExpiry)
    return newToken
  } catch (e) {
    console.error('[instagram/refresh-token] error:', e)
    return conn.accessToken
  }
}
