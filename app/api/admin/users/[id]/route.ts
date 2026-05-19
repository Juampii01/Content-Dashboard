/**
 * PATCH /api/admin/users/[id] — update role / clientId / displayName.
 * ADMIN only.
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

  // Guard: cannot demote the last admin
  if (parsed.data.role && parsed.data.role !== 'admin') {
    const current = await db.profile.findUnique({ where: { id }, select: { role: true } })
    if (current?.role === 'ADMIN') {
      const adminCount = await db.profile.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin' },
          { status: 400 },
        )
      }
    }
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role.toUpperCase()
  if (parsed.data.clientId !== undefined) updateData.clientId = parsed.data.clientId
  if (parsed.data.displayName !== undefined) updateData.displayName = parsed.data.displayName
  if (parsed.data.themeKey !== undefined) updateData.themeKey = parsed.data.themeKey

  if (updateData.clientId) {
    const clientExists = await db.client.findUnique({ where: { id: updateData.clientId as string }, select: { id: true } })
    if (!clientExists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
  }

  try {
    const updated = await db.profile.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, displayName: true, role: true, clientId: true },
    })
    return NextResponse.json({ user: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/users/PATCH] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
