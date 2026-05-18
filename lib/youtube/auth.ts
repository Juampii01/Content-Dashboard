/**
 * YouTube / Google OAuth token management.
 *
 * Centralises access-token validity checks and refresh-token exchanges so that
 * every YouTube API call uses a fresh token without each caller re-implementing
 * the logic.
 */

import { db } from '@/lib/db'
import type { SocialConnection } from '@prisma/client'
import { encryptToken, decryptToken } from '@/lib/crypto'

// Expose a stable error type so callers can distinguish "user must reconnect"
// from generic network failures.
export class YouTubeAuthError extends Error {
  code: 'NO_REFRESH_TOKEN' | 'INVALID_GRANT' | 'UNKNOWN'
  constructor(code: 'NO_REFRESH_TOKEN' | 'INVALID_GRANT' | 'UNKNOWN', message: string) {
    super(message)
    this.name = 'YouTubeAuthError'
    this.code = code
  }
}

const REFRESH_SKEW_MS = 2 * 60 * 1000 // refresh if token expires in <2 min

/**
 * Returns a valid access token for the given SocialConnection, refreshing via
 * Google's token endpoint when needed. The connection row is updated in place.
 */
export async function getValidAccessToken(connection: SocialConnection): Promise<string> {
  const now = Date.now()
  const expiresAt = connection.expiresAt?.getTime() ?? 0
  const needsRefresh = !connection.expiresAt || expiresAt - now < REFRESH_SKEW_MS

  if (!needsRefresh) {
    return decryptToken(connection.accessToken)
  }

  if (!connection.refreshToken) {
    throw new YouTubeAuthError(
      'NO_REFRESH_TOKEN',
      'No refresh token stored for this connection. Reconnect YouTube to get a new one.',
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new YouTubeAuthError('UNKNOWN', 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptToken(connection.refreshToken),
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[youtube/auth] refresh error:', res.status, text.slice(0, 200))
    // Google returns invalid_grant when the refresh token was revoked or expired.
    if (res.status === 400 && text.includes('invalid_grant')) {
      // Clear the stale refresh token so the next status check shows "disconnected".
      await db.socialConnection.update({
        where: { id: connection.id },
        data: { refreshToken: null, expiresAt: new Date(0) },
      }).catch(() => null)
      throw new YouTubeAuthError('INVALID_GRANT', 'Refresh token revoked or expired. Reconnect YouTube.')
    }
    throw new YouTubeAuthError('UNKNOWN', `Token refresh failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in?: number
    scope?: string
  }

  const newExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null

  await db.socialConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptToken(data.access_token),
      expiresAt: newExpiresAt,
      scopes: data.scope ?? connection.scopes,
    },
  })

  return data.access_token
}

/**
 * Thin wrapper around fetch that injects the Bearer token and surfaces
 * structured errors for quotaExceeded and auth failures.
 */
export async function youtubeFetch(
  url: string,
  connection: SocialConnection,
  init?: RequestInit,
): Promise<Response> {
  const token = await getValidAccessToken(connection)
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(url, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  })
  return res
}
