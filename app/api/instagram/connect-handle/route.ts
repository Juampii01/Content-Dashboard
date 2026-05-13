/**
 * POST /api/instagram/connect-handle
 *
 * Connects an Instagram account by **public handle** (no OAuth).  The handle
 * (e.g. "nike" — no leading `@`) is persisted as a SocialConnection row with
 * an empty `accessToken`.  Subsequent syncs read this row and fetch data
 * through Apify instead of Meta's Graph API.
 *
 * Rationale: the dashboard is an internal tool for ~10 known clients. Going
 * through Meta App Review just to read public account data is bureaucratic
 * overhead for zero functional gain — Apify covers the same public surface.
 *
 *   POST { handle: "nike" }
 *
 *   200 { ok: true, accountName }
 *   400 { error: 'INVALID_HANDLE' | 'INVALID_BODY' }
 *   401 { error: 'UNAUTHORIZED' }
 *   403 { error: 'FORBIDDEN' }
 *   429 { error: 'RATE_LIMIT' }
 *   500 { error: 'CONNECT_FAILED', detail }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requireActiveClient,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Accept handles 1-30 chars, alphanumeric + dots + underscores.  Matches
 * Instagram's documented username rules. Strips a leading `@` if present.
 */
const HandleSchema = z
  .string()
  .trim()
  .min(1)
  .max(31) // 30 + optional leading @
  .transform((v) => v.replace(/^@/, '').toLowerCase())
  .refine((v) => /^[a-z0-9._]{1,30}$/.test(v), {
    message: 'Handle inválido — solo letras, números, puntos y guiones bajos',
  })

const BodySchema = z.object({ handle: HandleSchema })

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string
  let clientId: string
  try {
    ({ userId, clientId } = await requireActiveClient())
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  const rl = await checkRateLimit(getIp(req), 'instagram-connect-handle', 10, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_HANDLE', detail: parsed.error.issues[0]?.message ?? 'malformed' },
      { status: 400 },
    )
  }

  const handle = parsed.data.handle

  try {
    // Upsert the connection. We don't try to validate against Apify here:
    // doing so would cost ~$0.05 just to click "Conectar", which is wasteful
    // if the user typoed. The first /api/instagram/sync run validates it for
    // free (a non-existent handle returns zero items and the user can fix it
    // in the same UI).
    await db.socialConnection.upsert({
      where: { clientId_platform: { clientId, platform: 'instagram' } },
      create: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        platform: 'instagram',
        accountId: handle,
        accountName: handle,
        accountPic: null,
        accessToken: '', // empty = "no OAuth, use Apify"
        refreshToken: null,
        expiresAt: null,
        scopes: 'apify-public',
      },
      update: {
        updatedBy: userId,
        accountId: handle,
        accountName: handle,
        accessToken: '',
        refreshToken: null,
        expiresAt: null,
        scopes: 'apify-public',
      },
    })

    return NextResponse.json({ ok: true, accountName: handle })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[instagram/connect-handle] upsert failed:', message)
    return NextResponse.json(
      { error: 'CONNECT_FAILED', detail: message },
      { status: 500 },
    )
  }
}
