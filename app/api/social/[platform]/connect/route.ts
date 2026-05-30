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
import { META_GRAPH_VERSION } from '@/lib/meta'

// ─── Validation ──────────────────────────────────────────────────────────────

const PlatformSchema = z.enum(['instagram', 'tiktok', 'youtube', 'meta-ads'])
type Platform = z.infer<typeof PlatformSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAppOrigin(req: NextRequest): string {
  // NEXT_PUBLIC_APP_URL is the most reliable source — always use it if set
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/+$/, '')
  // Vercel Lambda receives HTTP internally; x-forwarded-proto carries the real scheme
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(/:$/, '')
  const host = req.headers.get('x-forwarded-host') ?? req.nextUrl.host
  return `${proto}://${host}`
}

function callbackUrl(platform: Platform, req: NextRequest): string {
  // INSTAGRAM_REDIRECT_URI lets you pin the exact URI registered in Meta Developer,
  // avoiding any runtime-header calculation mismatch (http vs https, etc.)
  if (platform === 'instagram' && process.env.INSTAGRAM_REDIRECT_URI) {
    return process.env.INSTAGRAM_REDIRECT_URI
  }
  return `${getAppOrigin(req)}/api/social/${platform}/callback`
}

function buildOAuthUrl(platform: Platform, state: string, req: NextRequest): string | null {
  const redirect = callbackUrl(platform, req)
  console.log(`[${platform}/connect] redirect_uri=${redirect}`)

  if (platform === 'instagram') {
    // Instagram Business Login (API setup with Instagram login).
    // Uses www.instagram.com/oauth/authorize — App ID is the Instagram-specific
    // one from Meta's "API setup with Instagram login" section (not the FB app ID).
    const clientId = process.env.INSTAGRAM_APP_ID
    if (!clientId) return null
    // scope must be literal commas — URLSearchParams encodes them as %2C which
    // Instagram OAuth does not accept. Append scope as a raw string.
    const params = new URLSearchParams({
      force_reauth: 'true',
      client_id: clientId,
      redirect_uri: redirect,
      state,
      response_type: 'code',
    })
    const scope = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
    ].join(',')
    return `https://www.instagram.com/oauth/authorize?${params.toString()}&scope=${scope}`
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

  if (platform === 'meta-ads') {
    const clientId = process.env.FACEBOOK_APP_ID ?? process.env.INSTAGRAM_APP_ID
    if (!clientId) return null
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      scope: 'ads_read',
      state,
      response_type: 'code',
    })
    return `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`
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
    // DB unreachable (Prisma connection error, Supabase pooler down, wrong credentials, etc.)
    // Return 503 instead of letting the error propagate as an unhandled 500.
    console.error('[social/connect] DB error in requireActiveClient:', err)
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE', detail: 'Database temporarily unavailable' }, { status: 503 })
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
  const rawReturn = req.nextUrl.searchParams.get('returnTo') ?? req.headers.get('referer') ?? '/'
  const returnTo = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/'

  // Persist state
  await db.oAuthState.create({ data: { userId, clientId, state, platform, returnTo, expiresAt } })

  // Build OAuth URL
  const oauthUrl = buildOAuthUrl(platform, state, req)
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
