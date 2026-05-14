/**
 * GET /api/me/clients — returns the user's single assigned client.
 * Kept for backwards-compat; new architecture has one client per user (profile.clientId).
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireProfile, UnauthorizedError } from '@/lib/auth-user'

export async function GET(): Promise<NextResponse> {
  try {
    const { profile } = await requireProfile()
    if (!profile.clientId) {
      return NextResponse.json({ clients: [] })
    }
    const client = await db.client.findUnique({
      where: { id: profile.clientId },
      select: { id: true, name: true, slug: true },
    })
    return NextResponse.json({ clients: client ? [client] : [] })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/clients/GET] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
