/**
 * /api/discovery — strategic questionnaire submissions.
 *
 * Endpoints:
 *   POST → persist the current user's answers. Snapshots the active client
 *          cookie (if any) and the Profile.email at submission time so admin
 *          views don't need extra joins later.
 *   GET  → SUPER_ADMIN only — last 100 submissions across all users.
 *
 * Auth:
 *   Only `requireUserId()` for POST — the form is the onboarding entry point
 *   and must work for users who do NOT have ClientAccess yet (e.g. a partner
 *   who just signed up). `clientId` is captured opportunistically from the
 *   cookie, never trusted from the body.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireUserId,
  requireSuperAdmin,
  getActiveClientId,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { DiscoverySubmitSchema } from '@/lib/schemas/discovery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authError(err: unknown): NextResponse | null {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
  return null
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string
  try {
    userId = await requireUserId()
  } catch (err) {
    const e = authError(err)
    if (e) return e
    throw err
  }

  const rl = await checkRateLimit(getIp(req), 'discovery-submit', 5, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }
  const parsed = DiscoverySubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const [clientId, profile] = await Promise.all([
    getActiveClientId(),
    db.profile.findUnique({ where: { id: userId }, select: { email: true } }),
  ])

  const a = parsed.data.answers
  try {
    const row = await db.discoveryResponse.create({
      data: {
        userId,
        clientId: clientId ?? null,
        email: profile?.email ?? null,
        q1: a.q1 ?? null,
        q2: a.q2 ?? null,
        q3: a.q3 ?? null,
        q4: a.q4 ?? null,
        q5: a.q5 ?? null,
        q6: a.q6 ?? null,
        q7: a.q7 ?? null,
        q8: a.q8 ?? null,
        q9: a.q9 ?? null,
        q10: a.q10 ?? null,
        q11: a.q11 ?? null,
        q12: a.q12 ?? null,
        q13: a.q13 ?? null,
        q14: a.q14 ?? null,
        q15: a.q15 ?? null,
        q16: a.q16 ?? null,
        q17: a.q17 ?? null,
        q18: a.q18 ?? null,
        q19: a.q19 ?? null,
        q20: a.q20 ?? null,
        q21: a.q21 ?? null,
        q22: a.q22 ?? null,
        q23: a.q23 ?? null,
        q24: a.q24 ?? null,
        q25: a.q25 ?? null,
        q26: a.q26 ?? null,
        q27: a.q27 ?? null,
        q28: a.q28 ?? null,
        q29: a.q29 ?? null,
        q30: a.q30 ?? null,
        q31: a.q31 ?? null,
        q32: a.q32 ?? null,
        q33: a.q33 ?? null,
        q34: a.q34 ?? null,
        q35: a.q35 ?? null,
        q36: a.q36 ?? null,
        q37: a.q37 ?? null,
        q38: a.q38 ?? null,
        q39: a.q39 ?? null,
        q40: a.q40 ?? null,
      },
      select: { id: true, createdAt: true },
    })
    return NextResponse.json({ ok: true, id: row.id, createdAt: row.createdAt })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/discovery] persist failed:', message)
    return NextResponse.json(
      { error: 'DB_WRITE_FAILED', detail: message },
      { status: 500 },
    )
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    await requireSuperAdmin()
  } catch (err) {
    const e = authError(err)
    if (e) return e
    throw err
  }

  const items = await db.discoveryResponse.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ items })
}
