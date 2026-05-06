/**
 * POST /api/admin/users/[id]/client-access — grant access.
 * SUPER_ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminAuthOr401, getClientIp } from '@/lib/admin/guard'
import { GrantClientAccessSchema } from '@/lib/schemas/admin'
import { checkRateLimit } from '@/lib/utils/ratelimit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth

  const rl = await checkRateLimit(getClientIp(req), 'admin-access-grant', 60, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = GrantClientAccessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const access = await db.clientAccess.upsert({
      where: { userId_clientId: { userId: id, clientId: parsed.data.clientId } },
      create: { userId: id, clientId: parsed.data.clientId, roleInClient: 'ACCESS' },
      update: {},
    })
    return NextResponse.json({ access })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/client-access/POST] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
