/**
 * POST /api/tiktok/connect-handle
 *
 * Connects a TikTok account by **public handle** (no OAuth). Same model as
 * /api/instagram/connect-handle: persist a SocialConnection row, sync goes
 * through Apify.
 *
 *   POST { handle: "username" }
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

const HandleSchema = z
  .string()
  .trim()
  .min(1)
  .max(25) // TikTok max + leading @
  .transform((v) => v.replace(/^@/, '').toLowerCase())
  .refine((v) => /^[a-z0-9._]{1,24}$/.test(v), {
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

  const rl = await checkRateLimit(getIp(req), 'tiktok-connect-handle', 10, '60 s')
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
    await db.socialConnection.upsert({
      where: { clientId_platform: { clientId, platform: 'tiktok' } },
      create: {
        clientId,
        createdBy: userId,
        updatedBy: userId,
        platform: 'tiktok',
        accountId: handle,
        accountName: handle,
        accountPic: null,
        accessToken: '',
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
    console.error('[tiktok/connect-handle] upsert failed:', message)
    return NextResponse.json(
      { error: 'CONNECT_FAILED', detail: message },
      { status: 500 },
    )
  }
}
