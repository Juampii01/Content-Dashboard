/**
 * POST /api/me/active-client — validate access and set the activeClientId cookie.
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  requireProfile,
  ACTIVE_CLIENT_COOKIE,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'
import { SetActiveClientSchema } from '@/lib/schemas/admin'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId, globalRole } = await requireProfile()
    if (globalRole === 'PENDING') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = SetActiveClientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { clientId } = parsed.data

    // Validate access — SUPER_ADMIN bypass (any existing client is ok).
    if (globalRole === 'SUPER_ADMIN') {
      const exists = await db.client.findUnique({ where: { id: clientId } })
      if (!exists) {
        return NextResponse.json({ error: 'CLIENT_NOT_FOUND' }, { status: 404 })
      }
    } else {
      const access = await db.clientAccess.findUnique({
        where: { userId_clientId: { userId, clientId } },
      })
      if (!access) {
        return NextResponse.json({ error: 'NO_CLIENT_ACCESS' }, { status: 403 })
      }
    }

    const store = await cookies()
    store.set(ACTIVE_CLIENT_COOKIE, clientId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    })
    return NextResponse.json({ ok: true, clientId })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/active-client/POST] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
