/**
 * PATCH  /api/admin/clients/[id] — update name/slug.
 * DELETE /api/admin/clients/[id] — hard delete (cascades via Prisma relations).
 * SUPER_ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { adminAuthOr401, getClientIp } from '@/lib/admin/guard'
import { UpdateClientSchema } from '@/lib/schemas/admin'
import { checkRateLimit } from '@/lib/utils/ratelimit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth
  const rl = await checkRateLimit(getClientIp(req), 'admin-client-update', 30, '60 s')
  if (rl && !rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = UpdateClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const client = await db.client.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ client })
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/clients/PATCH] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await adminAuthOr401()
  if (auth instanceof NextResponse) return auth
  const rl = await checkRateLimit(getClientIp(req), 'admin-client-delete', 10, '60 s')
  if (rl && !rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const { id } = await params
  try {
    await db.client.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/clients/DELETE] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
