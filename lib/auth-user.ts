/**
 * Auth helpers — resolve the current Supabase auth user on the server and
 * determine access to the tenant workspace.
 *
 * Usage in API routes:
 *
 *   try {
 *     const { userId, clientId } = await requireActiveClient()
 *     // scoped Prisma queries using clientId
 *   } catch (err) {
 *     if (err instanceof UnauthorizedError) {
 *       return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
 *     }
 *     if (err instanceof ForbiddenError) {
 *       return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
 *     }
 *     throw err
 *   }
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import type { Profile, UserRole } from '@prisma/client'
import { isAdmin } from '@/lib/auth/permissions'

export class UnauthorizedError extends Error {
  constructor(message = 'UNAUTHORIZED') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'FORBIDDEN') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Returns the current Supabase auth user's UUID (as string).
 * Throws `UnauthorizedError` if no session.
 */
export async function requireUserId(): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) {
    throw new UnauthorizedError()
  }
  return data.user.id
}

/**
 * Returns the current user's id or null (does not throw).
 */
export async function getUserIdOrNull(): Promise<string | null> {
  try {
    return await requireUserId()
  } catch {
    return null
  }
}

/**
 * Returns the authenticated user plus their Profile record and role.
 * Throws `UnauthorizedError` if no session or no profile.
 */
export async function requireProfile(): Promise<{
  userId: string
  role: UserRole
  profile: Profile
}> {
  const userId = await requireUserId()
  const profile = await db.profile.findUnique({ where: { id: userId } })
  if (!profile) {
    throw new UnauthorizedError()
  }
  return { userId, role: profile.role, profile }
}

/**
 * Throws `ForbiddenError` if the current user is not ADMIN.
 */
export async function requireSuperAdmin(): Promise<{
  userId: string
  profile: Profile
}> {
  const { userId, role, profile } = await requireProfile()
  if (!isAdmin(role)) {
    throw new ForbiddenError()
  }
  return { userId, profile }
}

/**
 * Resolves the authenticated user and their assigned client workspace.
 * Reads clientId directly from profile — no cookie, no ClientAccess table.
 * If the user has no clientId yet, auto-creates a personal workspace and assigns it.
 * Throws UnauthorizedError (401) if no session or no profile.
 */
export async function requireActiveClient(): Promise<{
  userId: string
  clientId: string
}> {
  const userId = await requireUserId()

  const profile = await db.profile.findUnique({
    where: { id: userId },
    select: { role: true, clientId: true, email: true, displayName: true },
  })

  if (!profile) {
    throw new UnauthorizedError()
  }

  // Admin "view as" override — lets admins preview another client's workspace
  if (isAdmin(profile.role ?? '')) {
    const jar = await cookies()
    const viewAs = jar.get('admin_view_as')?.value
    if (viewAs) {
      const overrideClient = await db.client.findUnique({ where: { id: viewAs }, select: { id: true } })
      if (overrideClient) return { userId, clientId: viewAs }
    }
  }

  if (profile.clientId) {
    return { userId, clientId: profile.clientId }
  }

  // Auto-create a personal workspace so the user can use the app immediately.
  const slug = `personal-${userId.slice(0, 8)}`
  const name = profile.displayName ?? profile.email?.split('@')[0] ?? 'Personal'
  const client = await db.client.upsert({
    where: { slug },
    create: { name, slug },
    update: {},
  })
  await db.profile.update({ where: { id: userId }, data: { clientId: client.id } })

  return { userId, clientId: client.id }
}

/**
 * Returns the active clientId from the profile (no cookie needed).
 * Returns null if the user has no session or no client assigned.
 */
export async function getActiveClientId(): Promise<string | null> {
  try {
    const userId = await requireUserId()
    const profile = await db.profile.findUnique({
      where: { id: userId },
      select: { clientId: true },
    })
    return profile?.clientId ?? null
  } catch {
    return null
  }
}
