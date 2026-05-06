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

// ─── Validation ──────────────────────────────────────────────────────────────

const PlatformSchema = z.enum(['instagram', 'tiktok', 'youtube'])

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

// ─── Instagram (Meta Graph API) ───────────────────────────────────────────────

async function exchangeInstagram(
  code: string,
  redirectUri: string,
): Promise<{ token: TokenResult; profile: ProfileResult }> {
  const clientId = process.env.META_APP_ID!
  const clientSecret = process.env.META_APP_SECRET!

  // 1. Short-lived token
  const shortRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!shortRes.ok) {
    const text = await shortRes.text()
    console.error('[instagram/callback] short-lived token error:', shortRes.status, text.slice(0, 200))
    throw new Error(`Instagram token exchange failed: ${shortRes.status}`)
  }
  const shortData = (await shortRes.json()) as { access_token: string }

  // 2. Long-lived token
  const longParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortData.access_token,
  })
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${longParams.toString()}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!longRes.ok) {
    const text = await longRes.text()
    console.error('[instagram/callback] long-lived token error:', longRes.status, text.slice(0, 200))
    throw new Error(`Instagram long-lived token exchange failed: ${longRes.status}`)
  }
  const longData = (await longRes.json()) as { access_token: string; expires_in?: number }
  const accessToken = longData.access_token
  const expiresAt = longData.expires_in
    ? new Date(Date.now() + longData.expires_in * 1000)
    : undefined

  // 3. Fetch pages to find Instagram business account
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!pagesRes.ok) {
    const text = await pagesRes.text()
    console.error('[instagram/callback] pages fetch error:', pagesRes.status, text.slice(0, 200))
    throw new Error(`Instagram pages fetch failed: ${pagesRes.status}`)
  }
  const pagesData = (await pagesRes.json()) as {
    data: Array<{ id: string; access_token: string }>
  }

  if (!pagesData.data?.length) {
    throw new Error('No Facebook Pages found — connect a Page with a linked Instagram Business account')
  }

  // Probe all pages in parallel for a linked IG business account.
  // Previously: serial `for (await fetch)` loop — O(N) latency growing with
  // the number of FB pages on the user's account. Now: Promise.all (safe
  // since `/${pageId}?fields=instagram_business_account` is idempotent) +
  // take the first page that returns a linked IG id.
  const pageProbes = await Promise.all(
    pagesData.data.map(async (page) => {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
          { signal: AbortSignal.timeout(10_000) },
        )
        if (!res.ok) return null
        const data = (await res.json()) as {
          instagram_business_account?: { id: string }
        }
        if (data.instagram_business_account?.id) {
          return { igId: data.instagram_business_account.id, pageToken: page.access_token }
        }
        return null
      } catch {
        return null
      }
    }),
  )

  const match = pageProbes.find((r): r is { igId: string; pageToken: string } => r !== null)
  if (!match) {
    throw new Error('No Instagram Business Account linked to any Facebook Page')
  }
  const { igId, pageToken } = match

  // 4. Fetch IG profile (followers_count omitted — requires instagram_manage_insights scope)
  const profileRes = await fetch(
    `https://graph.facebook.com/v19.0/${igId}?fields=name,username,profile_picture_url&access_token=${pageToken}`,
    { signal: AbortSignal.timeout(10_000) },
  )
  if (!profileRes.ok) {
    const text = await profileRes.text()
    console.error('[instagram/callback] profile fetch error:', profileRes.status, text.slice(0, 200))
    throw new Error(`Instagram profile fetch failed: ${profileRes.status}`)
  }
  const profileData = (await profileRes.json()) as {
    id: string
    name?: string
    username?: string
    profile_picture_url?: string
  }

  // Store the PAGE access token as the primary accessToken (needed for IG Graph calls
   // on the IG business account). The user long-lived token is kept in refreshToken so
   // we can re-derive page tokens later if needed. Schema has no dedicated page-token
   // column, so we reuse refreshToken (semantically: "parent" token).
  return {
    token: { accessToken: pageToken, refreshToken: accessToken, expiresAt },
    profile: {
      accountId: igId,
      accountName: profileData.username ?? profileData.name ?? igId,
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
    if (oauthError === 'access_denied') {
      errorUrl.searchParams.set('connect_error_reason', 'access_denied')
    }
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
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/${platform}/callback`

  let tokenResult: TokenResult
  let profileResult: ProfileResult

  try {
    let exchange: { token: TokenResult; profile: ProfileResult }

    if (platform === 'instagram') {
      exchange = await exchangeInstagram(code, redirectUri)
    } else if (platform === 'youtube') {
      exchange = await exchangeYouTube(code, redirectUri)
    } else {
      exchange = await exchangeTikTok(code, redirectUri)
    }

    tokenResult = exchange.token
    profileResult = exchange.profile
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[${platform}/callback] token/profile exchange error:`, message)
    return NextResponse.redirect(
      new URL(`${returnTo}?connect_error=${platform}`, req.url),
    )
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
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresAt,
        scopes: tokenResult.scopes ?? '',
      },
      update: {
        updatedBy: userId,
        accountId: profileResult.accountId,
        accountName: profileResult.accountName,
        accountPic: profileResult.accountPic,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken ?? null,
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
