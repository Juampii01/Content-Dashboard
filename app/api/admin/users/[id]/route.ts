/**
 * PATCH /api/admin/users/[id] — update a user's globalRole / displayName.
 * SUPER_ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminAuthOr401, getClientIp } from '@/lib/admin/guard'
import { UpdateUserSchema } from '@/lib/schemas/admin'
import { checkRateLimit } from '@/lib/utils/ratelimit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const rl = await checkRateLimit(getClientIp(req), 'admin-user-update', 30, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: parsed.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 },
    )
  }

  // Guard: cannot demote the last SUPER_ADMIN.
  if (parsed.data.globalRole && parsed.data.globalRole !== 'SUPER_ADMIN') {
    const current = await db.profile.findUnique({ where: { id } })
    if (current?.globalRole === 'SUPER_ADMIN') {
      const admins = await db.profile.count({
        where: { globalRole: 'SUPER_ADMIN' },
      })
      if (admins <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last SUPER_ADMIN' },
          { status: 400 },
        )
      }
    }
  }

  try {
    const updated = await db.profile.update({
      where: { id },
      data: parsed.data,
    })
    return NextResponse.json({ user: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/users/PATCH] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
