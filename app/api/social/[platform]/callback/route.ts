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

  // 1. Short-lived token (valid ~1 hour)
  const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', redirect_uri: redirectUri, code }),
    signal: AbortSignal.timeout(10_000),
  })
  const shortRawText = await shortRes.text()
  if (!shortRes.ok) {
    console.error('[instagram/callback] short-lived token error:', shortRes.status, shortRawText.slice(0, 400))
    throw new Error(`IG400 redirectUri=${redirectUri} body=${shortRawText.slice(0, 150)}`)
  }
  let shortData: { access_token: string; user_id: number; expires_in?: number }
  try {
    shortData = JSON.parse(shortRawText)
  } catch {
    console.error('[instagram/callback] step1 JSON parse failed, raw:', shortRawText.slice(0, 400))
    throw new Error(`IG_PARSE_FAILED body=${shortRawText.slice(0, 150)}`)
  }
  let accessToken = shortData.access_token
  let expiresAt: Date | undefined = shortData.expires_in
    ? new Date(Date.now() + shortData.expires_in * 1000)
    : undefined

  // 2. Exchange short-lived → long-lived token (60 days).
  // Required for both Instagram Business Login and Basic Display API.
  // Without this step, the token only lasts 1 hour and the Graph API may reject it.
  const llRes = await fetch(
    `https://graph.instagram.com/access_token?` +
      new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: clientSecret,
        access_token: accessToken,
      }).toString(),
    { signal: AbortSignal.timeout(10_000) },
  )
  const longRawText = await llRes.text()
  if (!llRes.ok) {
    console.error('[instagram/callback] long-lived exchange failed:', llRes.status, longRawText.slice(0, 200))
    throw new Error('IG_TOKEN_EXCHANGE_FAILED: ' + llRes.status)
  }
  let longData: { access_token?: string; token_type?: string; expires_in?: number } = {}
  try { longData = JSON.parse(longRawText) } catch { /* non-JSON */ }
  if (longData.access_token) {
    accessToken = longData.access_token
    expiresAt = longData.expires_in
      ? new Date(Date.now() + longData.expires_in * 1000)
      : expiresAt
    console.log('[instagram/callback] long-lived token obtained, expires_in:', longData.expires_in)
  }

  // 3. Profile — /v23.0/me is the correct endpoint for Instagram Login tokens.
  // Returns user_id + username + account_type. The `name` field does NOT exist
  // in the Instagram Login flow (only in Facebook Login). Do NOT use /{user_id}.
  const igUserId = String(shortData.user_id)
  let accountName = igUserId
  let accountPic: string | undefined

  const profileRes = await fetch(
    `https://graph.instagram.com/v23.0/me?fields=user_id,username,account_type,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  if (profileRes.ok) {
    const profileData = (await profileRes.json()) as { user_id?: string; username?: string; account_type?: string; profile_picture_url?: string }
    accountName = profileData.username ?? igUserId
    accountPic = profileData.profile_picture_url
    console.log('[instagram/callback] profile fetched:', { username: profileData.username, account_type: profileData.account_type })
  } else {
    const body = await profileRes.text()
    let parsed: { error?: { code?: number; error_subcode?: number; message?: string; type?: string } } = {}
    try { parsed = JSON.parse(body) } catch { /* non-JSON response */ }
    console.error('[instagram/callback] profile fetch failed:', {
      status: profileRes.status,
      code: parsed.error?.code,
      error_subcode: parsed.error?.error_subcode,
      message: parsed.error?.message,
      type: parsed.error?.type,
      raw: body.slice(0, 300),
    })
  }

  return {
    token: {
      accessToken,
      expiresAt,
      scopes: (longData as { scopes?: string }).scopes ?? '',
    },
    profile: {
      accountId: igUserId,
      accountName,
      accountPic,
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

  // Resolve returnTo from state before using it in error redirects
  let errorReturnTo = '/'
  if (state) {
    const s = await db.oAuthState.findUnique({ where: { state }, select: { returnTo: true } }).catch(() => null)
    if (s?.returnTo) errorReturnTo = s.returnTo
  }

  // User denied access or provider returned an error
  if (oauthError) {
    console.error(`[${platform}/callback] provider error:`, oauthError)
    const errorUrl = new URL(`${errorReturnTo}?connect_error=${platform}`, req.url)
    // Always expose the raw OAuth error code so it's visible in the redirect URL for debugging
    errorUrl.searchParams.set('connect_error_reason', oauthError)
    return NextResponse.redirect(errorUrl.toString())
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${errorReturnTo}?connect_error=${platform}`, req.url),
    )
  }

  // Validate CSRF state — atomic delete so concurrent callbacks both fail after the first
  let stateRow: { userId: string; clientId: string; returnTo: string; expiresAt: Date; platform: string } | null = null
  try {
    stateRow = await db.oAuthState.delete({ where: { state } }).catch(() => null)
  } catch (e: unknown) {
    console.error(`[${platform}/callback] state delete error:`, e)
    return NextResponse.redirect(new URL(`/?connect_error=${platform}`, req.url))
  }

  if (!stateRow) {
    console.error(`[${platform}/callback] unknown or already-used state`)
    return NextResponse.redirect(new URL(`/?connect_error=${platform}`, req.url))
  }

  returnTo = stateRow.returnTo
  const userId = stateRow.userId
  const clientId = stateRow.clientId

  // Bug fix H-4: reject state tokens issued for a different platform
  if (stateRow.platform !== platform) {
    console.error(`[${platform}/callback] platform mismatch: state was for ${stateRow.platform}`)
    return NextResponse.json({ error: 'STATE_PLATFORM_MISMATCH' }, { status: 400 })
  }

  if (stateRow.expiresAt < new Date()) {
    console.error(`[${platform}/callback] state expired`)
    return NextResponse.redirect(
      new URL(`${returnTo}?connect_error=${platform}`, req.url),
    )
  }

  // Exchange code for tokens.
  // INSTAGRAM_REDIRECT_URI pins the exact URI registered in Meta Developer so there
  // is no runtime-header calculation that could differ between connect and callback.
  // Falls back to NEXT_PUBLIC_APP_URL, then x-forwarded-proto header derivation.
  const redirectUri = (() => {
    if (platform === 'instagram' && process.env.INSTAGRAM_REDIRECT_URI) {
      return process.env.INSTAGRAM_REDIRECT_URI
    }
    const envUrl = process.env.NEXT_PUBLIC_APP_URL
    if (envUrl) return `${envUrl.replace(/\/+$/, '')}/api/social/${platform}/callback`
    const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(/:$/, '')
    const host = req.headers.get('x-forwarded-host') ?? req.nextUrl.host
    return `${proto}://${host}/api/social/${platform}/callback`
  })()

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
    console.error('[social/callback] token exchange error:', e)
    const errUrl = new URL(`${returnTo}?connect_error=${platform}`, req.url)
    errUrl.searchParams.set('connect_error_reason', 'exchange_failed')
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
        ...(tokenResult.refreshToken !== undefined && tokenResult.refreshToken !== null
          ? { refreshToken: encryptToken(tokenResult.refreshToken) }
          : {}),
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
