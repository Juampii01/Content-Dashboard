/**
 * Shared helper for admin API routes.
 * Wraps requireSuperAdmin() + translates auth errors into NextResponse.
 */
import { NextResponse } from 'next/server'
import {
  requireSuperAdmin,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'

export async function adminAuthOr401(): Promise<
  { userId: string } | NextResponse
> {
  try {
    const { userId } = await requireSuperAdmin()
    return { userId }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    throw err
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
