/**
 * GET /api/social/[platform]/callback
 *
 * Receives the OAuth authorization code, validates the CSRF state, exchanges
 * the code for tokens, fetches the account profile, and upserts a
 * SocialConnection row.  Redirects back to the returnTo URL on both success
 * and failure.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { cleanupExpiredStates } from '@/lib/utils/cleanup-oauth-states'
import { encryptToken } from '@/lib/crypto'
import { META_GRAPH_BASE } from '@/lib/meta'

// ─── Validation ──────────────────────────────────────────────────────────────

const PlatformSchema = z.enum(['instagram', 'tiktok', 'youtube', 'meta-ads'])

// ─── Types ───────────────────────────────────────────────────────────────────

interface TokenResult {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scopes?: string
}

interface ProfileResult {
  accountId: string
  accountName: string
  accountPic?: string
}

// ─── Instagram (Business Login — www.instagram.com/oauth/authorize) ──────────
// Uses INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET (Instagram-specific, not FB app).
// Flow: code → api.instagram.com short-lived token → graph.instagram.com
// long-lived token → graph.instagram.com profile.

async function exchangeInstagram(
  code: string,
  redirectUri: string,
): Promise<{ token: TokenResult; profile: ProfileResult }> {
  const clientId = process.env.INSTAGRAM_APP_ID!
  const clientSecret = process.env.INSTAGRAM_APP_SECRET!

  // 1. Short-lived token
  const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', redirect_uri: redirectUri, code }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!shortRes.ok) {
    const text = await shortRes.text()
    console.error('[instagram/callback] short-lived token error:', shortRes.status, text.slice(0, 200))
    throw new Error(`Instagram token exchange failed: ${shortRes.status} | clientId=${clientId} | redirectUri=${redirectUri} | ${text.slice(0, 150)}`)
  }
  const shortData = (await shortRes.json()) as { access_token: string; user_id: number }

  // 2. Long-lived token (60-day expiry)
  const longRes = await fetch(
    `https://graph.instagram.com/access_token?` +
    new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: clientSecret, access_token: shortData.access_token }).toString(),
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!longRes.ok) {
    const text = await longRes.text()
    console.error('[instagram/callback] long-lived token error:', longRes.status, text.slice(0, 200))
    throw new Error(`Instagram long-lived token exchange failed: ${longRes.status}`)
  }
  const longData = (await longRes.json()) as { access_token: string; expires_in?: number }
  const accessToken = longData.access_token

  // 3. Profile
  const profileRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url&access_token=${accessToken}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!profileRes.ok) {
    const text = await profileRes.text()
    console.error('[instagram/callback] profile error:', profileRes.status, text.slice(0, 200))
    throw new Error(`Instagram profile fetch failed: ${profileRes.status}`)
  }
  const profileData = (await profileRes.json()) as { id?: string; username?: string; name?: string; profile_picture_url?: string }
  const igUserId = String(shortData.user_id)

  return {
    token: {
      accessToken,
      expiresAt: longData.expires_in ? new Date(Date.now() + longData.expires_in * 1000) : undefined,
    },
    profile: {
      accountId: igUserId,
      accountName: profileData.username ?? profileData.name ?? igUserId,
      accountPic: profileData.profile_picture_url,
    },
  }
}

// ─── YouTube (Google OAuth2) ──────────────────────────────────────────────────

async function exchangeYouTube(
  code: string,
  redirectUri: string,
): Promise<{ token: TokenResult; profile: ProfileResult }> {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

  // 1. Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    console.error('[youtube/callback] token exchange error:', tokenRes.status, text.slice(0, 200))
    throw new Error(`YouTube token exchange failed: ${tokenRes.status}`)
  }
  const tokenData = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }
  const accessToken = tokenData.access_token
  const refreshToken = tokenData.refresh_token
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : undefined

  // 2. Fetch channel info
  const channelRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    },
  )
  if (!channelRes.ok) {
    const text = await channelRes.text()
    console.error('[youtube/callback] channel fetch error:', channelRes.status, text.slice(0, 200))
    throw new Error(`YouTube channel fetch failed: ${channelRes.status}`)
  }
  const channelData = (await channelRes.json()) as {
    items?: Array<{
      id: string
      snippet?: { title?: string; thumbnails?: { default?: { url?: string } } }
    }>
  }

  const channel = channelData.items?.[0]
  if (!channel) throw new Error('No YouTube channel found for this account')

  return {
    token: { accessToken, refreshToken, expiresAt, scopes: tokenData.scope },
    profile: {
      accountId: channel.id,
      accountName: channel.snippet?.title ?? channel.id,
      accountPic: channel.snippet?.thumbnails?.default?.url,
    },
  }
}

// ─── Meta Ads (Facebook Marketing API) ───────────────────────────────────────
// Uses FACEBOOK_APP_ID / FACEBOOK_APP_SECRET (falls back to INSTAGRAM_APP_ID/SECRET).
// Fetches the first accessible ad account name for display purposes.

async function exchangeMetaAds(
  code: string,
  redirectUri: string,
): Promise<{ token: TokenResult; profile: ProfileResult }> {
  const clientId = process.env.FACEBOOK_APP_ID ?? process.env.INSTAGRAM_APP_ID ?? ''
  const clientSecret = process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET ?? ''

  // 1. Exchange code for long-lived token
  const tokenRes = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?` +
    new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }).toString(),
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    console.error('[meta-ads/callback] token exchange error:', tokenRes.status, text.slice(0, 200))
    throw new Error(`Meta Ads token exchange failed: ${tokenRes.status}`)
  }
  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in?: number }
  const accessToken = tokenData.access_token

  // 2. Fetch the user's ad accounts to get the first account name
  const meRes = await fetch(
    `${META_GRAPH_BASE}/me?fields=id,name&access_token=${accessToken}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  const meData = meRes.ok
    ? ((await meRes.json()) as { id?: string; name?: string })
    : { id: 'unknown', name: 'Meta Ads' }

  return {
    token: {
      accessToken,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
    },
    profile: {
      accountId: meData.id ?? 'unknown',
      accountName: meData.name ?? 'Meta Ads',
    },
  }
}

// ─── TikTok (TikTok for Developers v2) ───────────────────────────────────────

async function exchangeTikTok(
  code: string,
  redirectUri: string,
): Promise<{ token: TokenResult; profile: ProfileResult }> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!

  // 1. Exchange code for tokens
  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    console.error('[tiktok/callback] token exchange error:', tokenRes.status, text.slice(0, 200))
    throw new Error(`TikTok token exchange failed: ${tokenRes.status}`)
  }
  const tokenData = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }
  const accessToken = tokenData.access_token
  const refreshToken = tokenData.refresh_token
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : undefined

  // 2. Fetch user profile
  const profileRes = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    },
  )
  if (!profileRes.ok) {
    const text = await profileRes.text()
    console.error('[tiktok/callback] profile fetch error:', profileRes.status, text.slice(0, 200))
    throw new Error(`TikTok profile fetch failed: ${profileRes.status}`)
  }
  const profileData = (await profileRes.json()) as {
    data?: {
      user?: { open_id?: string; display_name?: string; avatar_url?: string }
    }
  }
  const user = profileData.data?.user
  if (!user) throw new Error('TikTok user info unavailable')

  return {
    token: { accessToken, refreshToken, expiresAt, scopes: tokenData.scope },
    profile: {
      accountId: user.open_id ?? 'unknown',
      accountName: user.display_name ?? 'TikTok User',
      accountPic: user.avatar_url,
    },
  }
}

// ─── GET /api/social/[platform]/callback ──────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
): Promise<NextResponse> {
  const { platform: rawPlatform } = await params
  const parsed = PlatformSchema.safeParse(rawPlatform)

  // Default returnTo fallback — we may not have state yet
  let returnTo = '/'

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/?connect_error=unknown`, req.url))
  }
  const platform = parsed.data

  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  // Clean up expired states opportunistically
  try {
    await cleanupExpiredStates()
  } catch (e: unknown) {
    console.error('[oauth/callback] cleanupExpiredStates error:', e)
  }

  // User denied access or provider returned an error
  if (oauthError) {
    console.error(`[${platform}/callback] provider error:`, oauthError)
    const errorUrl = new URL(`${returnTo}?connect_error=${platform}`, req.url)
    // Always expose the raw OAuth error code so it's visible in the redirect URL for debugging
    errorUrl.searchParams.set('connect_error_reason', oauthError)
    return NextResponse.redirect(errorUrl.toString())
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${returnTo}?connect_error=${platform}`, req.url),
    )
  }

  // Validate CSRF state
  let stateRow: { userId: string; clientId: string; returnTo: string; expiresAt: Date } | null = null
  try {
    stateRow = await db.oAuthState.findUnique({ where: { state } })
  } catch (e: unknown) {
    console.error(`[${platform}/callback] state lookup error:`, e)
    return NextResponse.redirect(new URL(`/?connect_error=${platform}`, req.url))
  }

  if (!stateRow) {
    console.error(`[${platform}/callback] unknown or already-used state`)
    return NextResponse.redirect(new URL(`/?connect_error=${platform}`, req.url))
  }

  returnTo = stateRow.returnTo
  const userId = stateRow.userId
  const clientId = stateRow.clientId

  if (stateRow.expiresAt < new Date()) {
    // One-time delete even if expired
    await db.oAuthState.delete({ where: { state } }).catch(() => null)
    console.error(`[${platform}/callback] state expired`)
    return NextResponse.redirect(
      new URL(`${returnTo}?connect_error=${platform}`, req.url),
    )
  }

  // Consume the state (one-time use)
  await db.oAuthState.delete({ where: { state } }).catch((e: unknown) =>
    console.error(`[${platform}/callback] failed to delete state:`, e),
  )

  // Exchange code for tokens
  // Use NEXT_PUBLIC_APP_URL when available; fall back to x-forwarded-proto to avoid
  // http:// vs https:// mismatches caused by Vercel's internal HTTP routing
  const appOrigin = (() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL
    if (envUrl) return envUrl.replace(/\/+$/, '')
    const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(/:$/, '')
    const host = req.headers.get('x-forwarded-host') ?? req.nextUrl.host
    return `${proto}://${host}`
  })()
  const redirectUri = `${appOrigin}/api/social/${platform}/callback`

  let tokenResult: TokenResult
  let profileResult: ProfileResult

  try {
    let exchange: { token: TokenResult; profile: ProfileResult }

    if (platform === 'instagram') {
      exchange = await exchangeInstagram(code, redirectUri)
    } else if (platform === 'youtube') {
      exchange = await exchangeYouTube(code, redirectUri)
    } else if (platform === 'meta-ads') {
      exchange = await exchangeMetaAds(code, redirectUri)
    } else {
      exchange = await exchangeTikTok(code, redirectUri)
    }

    tokenResult = exchange.token
    profileResult = exchange.profile
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[${platform}/callback] token/profile exchange error:`, message)
    const errUrl = new URL(`${returnTo}?connect_error=${platform}`, req.url)
    errUrl.searchParams.set('connect_error_reason', message.slice(0, 400))
    return NextResponse.redirect(errUrl.toString())
  }

  // Upsert SocialConnection
  try {
    await db.socialConnection.upsert({
      where: { clientId_platform: { clientId, platform } },
      create: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        platform,
        accountId: profileResult.accountId,
        accountName: profileResult.accountName,
        accountPic: profileResult.accountPic,
        accessToken: encryptToken(tokenResult.accessToken),
        refreshToken: tokenResult.refreshToken ? encryptToken(tokenResult.refreshToken) : tokenResult.refreshToken,
        expiresAt: tokenResult.expiresAt,
        scopes: tokenResult.scopes ?? '',
      },
      update: {
        updatedBy: userId,
        accountId: profileResult.accountId,
        accountName: profileResult.accountName,
        accountPic: profileResult.accountPic,
        accessToken: encryptToken(tokenResult.accessToken),
        refreshToken: tokenResult.refreshToken ? encryptToken(tokenResult.refreshToken) : null,
        expiresAt: tokenResult.expiresAt ?? null,
        scopes: tokenResult.scopes ?? '',
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[${platform}/callback] DB upsert error:`, message)
    return NextResponse.redirect(
      new URL(`${returnTo}?connect_error=${platform}`, req.url),
    )
  }

  return NextResponse.redirect(
    new URL(`${returnTo}?connect_success=${platform}`, req.url),
  )
}
