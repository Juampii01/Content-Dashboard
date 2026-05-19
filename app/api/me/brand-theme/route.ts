/**
 * POST /api/me/brand-theme — no-op stub.
 *
 * Brand theme persistence moved to localStorage ('admin_theme') on the client.
 * Kept to avoid 404s from any in-flight requests during deploy.
 */
import { NextResponse } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/auth-user'

export async function POST(): Promise<NextResponse> {
  try {
    await requireUserId()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    throw err
  }
  return NextResponse.json({ ok: true })
}
