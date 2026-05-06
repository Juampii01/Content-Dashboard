/**
 * DELETE /api/admin/users/[id]/client-access/[clientId] — revoke access.
 * SUPER_ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminAuthOr401, getClientIp } from '@/lib/admin/guard'
import { checkRateLimit } from '@/lib/utils/ratelimit'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> },
): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const rl = await checkRateLimit(getClientIp(req), 'admin-access-revoke', 60, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { id, clientId } = await params
  try {
    await db.clientAccess.delete({
      where: { userId_clientId: { userId: id, clientId } },
    }).catch(() => null)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/client-access/DELETE] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
