/**
 * POST /api/admin/view-as — set or clear the admin "view as" user override.
 * Body: { userId: string } to set, { userId: null } to clear.
 * ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminAuthOr401 } from '@/lib/admin/guard'

const Schema = z.object({ userId: z.string().nullable() })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { userId } = parsed.data
  const res = NextResponse.json({ ok: true })

  if (!userId) {
    res.cookies.delete('admin_view_as_user')
    return res
  }

  // Verify the user exists
  const profile = await db.profile.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  res.cookies.set('admin_view_as_user', userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
    secure: true,
  })
  return res
}
