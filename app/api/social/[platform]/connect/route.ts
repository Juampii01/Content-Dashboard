/**
 * GET /api/social/[platform]/connect
 *
 * Builds the OAuth authorization URL for the given platform and redirects
 * the user to it.  A random CSRF state is persisted in OAuthState (TTL 10 min).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

// ─── Validation ──────────────────────────────────────────────────────────────

const PlatformSchema = z.enum(['instagram', 'tiktok', 'youtube'])
type Platform = z.infer<typeof PlatformSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function callbackUrl(platform: Platform): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base}/api/social/${platform}/callback`
}

function buildOAuthUrl(platform: Platform, state: string): string | null {
  const redirect = callbackUrl(platform)

  if (platform === 'instagram') {
    // New Instagram API (api.instagram.com) — uses INSTAGRAM_APP_ID (separate from
    // the Facebook App ID). Scopes use the instagram_business_* prefix.
    // instagram_business_manage_insights requires App Review for production; works
    // immediately for testers in Development mode.
    const clientId = process.env.INSTAGRAM_APP_ID
    if (!clientId) return null
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      scope: 'instagram_business_basic,instagram_business_manage_insights',
      state,
      response_type: 'code',
    })
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`
  }

  if (platform === 'youtube') {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) return null
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      response_type: 'code',
      // Only youtube.readonly — yt-analytics requires a separate API to be
      // enabled in Google Cloud + will 400 here if missing. Add back when we
      // wire up watch-time / CTR analytics.
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  if (platform === 'tiktok') {
    const clientKey = process.env.TIKTOK_CLIENT_KEY
    if (!clientKey) return null
    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: 'code',
      scope: 'user.info.basic,video.list,user.info.stats',
      redirect_uri: redirect,
      state,
    })
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  }

  return null
}

// ─── GET /api/social/[platform]/connect ──────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }
  const { platform: rawPlatform } = await params
  const parsed = PlatformSchema.safeParse(rawPlatform)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Plataforma no válida' }, { status: 400 })
  }
  const platform = parsed.data

  // Generate CSRF state token
  const state = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // +10 min
  const returnTo = req.nextUrl.searchParams.get('returnTo')
    ?? req.headers.get('referer')
    ?? '/'

  // Persist state
  await db.oAuthState.create({ data: { userId, clientId, state, platform, returnTo, expiresAt } })

  // Build OAuth URL
  const oauthUrl = buildOAuthUrl(platform, state)
  if (!oauthUrl) {
    // Credentials not configured — clean up the state record and redirect back with error
    await db.oAuthState.delete({ where: { state } }).catch(() => {})
    const errorUrl = new URL(returnTo, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001')
    errorUrl.searchParams.set('connect_error', platform)
    errorUrl.searchParams.set('connect_error_reason', 'not_configured')
    return NextResponse.redirect(errorUrl.toString())
  }

  return NextResponse.redirect(oauthUrl)
}
