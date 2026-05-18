/**
 * POST /api/admin/view-as — set or clear the admin "view as" client override.
 * Body: { clientId: string } to set, { clientId: null } to clear.
 * SUPER_ADMIN only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { adminAuthOr401 } from '@/lib/admin/guard'

const Schema = z.object({ clientId: z.string().nullable() })

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

  const { clientId } = parsed.data
  const res = NextResponse.json({ ok: true })

  if (!clientId) {
    res.cookies.delete('admin_view_as')
    return res
  }

  // Verify the client exists
  const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } })
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  res.cookies.set('admin_view_as', clientId, {
    httpOnly: false,  // readable by client JS for display purposes
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return NextResponse.json({ ok: true, clientId: client.id, clientName: client.name })
}
