/**
 * GET /api/me/active-client/auto?id=...&next=...
 *
 * Sets the activeClientId cookie to a validated client and bounces back to
 * `next`. Used by `lib/auth-bootstrap.ts` because Next 15+ forbids mutating
 * cookies from a Server Component (the root layout).
 */
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  ACTIVE_CLIENT_COOKIE,
  requireProfile,
  UnauthorizedError,
} from '@/lib/auth-user'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const rawNext = url.searchParams.get('next')
  // Same-origin only — guard against open redirect.
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'
  const id = url.searchParams.get('id') ?? ''

  let userId: string
  let globalRole: 'PENDING' | 'MEMBER' | 'SUPER_ADMIN'
  try {
    const profile = await requireProfile()
    userId = profile.userId
    globalRole = profile.globalRole
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    throw err
  }

  if (globalRole === 'PENDING') {
    return NextResponse.redirect(new URL('/pending-approval', req.url))
  }

  let valid = false
  if (id) {
    if (globalRole === 'SUPER_ADMIN') {
      valid = !!(await db.client.findUnique({ where: { id }, select: { id: true } }))
    } else {
      valid = !!(await db.clientAccess.findUnique({
        where: { userId_clientId: { userId, clientId: id } },
        select: { userId: true },
      }))
    }
  }

  const res = NextResponse.redirect(new URL(next, req.url))
  if (valid) {
    res.cookies.set(ACTIVE_CLIENT_COOKIE, id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return res
}
