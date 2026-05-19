/**
 * POST /api/admin/users/[id]/client-access — assign a client to a user.
 * Replaces the old M:N grant; now sets profile.clientId directly.
 * ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminAuthOr401, getClientIp } from '@/lib/admin/guard'
import { checkRateLimit } from '@/lib/utils/ratelimit'

const BodySchema = z.object({ clientId: z.string().min(1) })

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
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const clientExists = await db.client.findUnique({ where: { id: parsed.data.clientId }, select: { id: true } })
  if (!clientExists) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  try {
    const updated = await db.profile.update({
      where: { id },
      data: { clientId: parsed.data.clientId },
      select: { id: true, clientId: true },
    })
    return NextResponse.json({ ok: true, profile: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/client-access/POST] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
