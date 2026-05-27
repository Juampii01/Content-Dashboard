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

import 'server-only'

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

  // Admin "view as" override — lets admins preview another user's workspace.
  // Cookie stores the target userId; we resolve their clientId here so the
  // frontend never needs to know about the organisation/clientId concept.
  if (isAdmin(profile.role ?? '')) {
    const jar = await cookies()
    const viewAsUserId = jar.get('admin_view_as_user')?.value
    if (viewAsUserId) {
      const targetProfile = await db.profile.findUnique({
        where: { id: viewAsUserId },
        select: { clientId: true, displayName: true, email: true },
      })
      if (targetProfile) {
        // If the target user already has a workspace, use it directly.
        if (targetProfile.clientId) {
          return { userId, clientId: targetProfile.clientId }
        }
        // Otherwise auto-create their personal workspace so we see their data,
        // not the admin's. Same logic as the bottom of this function.
        const slug = `personal-${viewAsUserId.slice(0, 8)}`
        const name = targetProfile.displayName ?? targetProfile.email?.split('@')[0] ?? 'Personal'
        const client = await db.client.upsert({
          where: { slug },
          create: { name, slug },
          update: {},
        })
        await db.profile.update({ where: { id: viewAsUserId }, data: { clientId: client.id } })
        return { userId, clientId: client.id }
      }
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
 * Returns the active clientId, respecting the admin view-as override.
 * Delegates to requireActiveClient() so the admin_view_as_user cookie
 * is always honoured. Returns null if no session or no client assigned.
 */
export async function getActiveClientId(): Promise<string | null> {
  try {
    const { clientId } = await requireActiveClient()
    return clientId
  } catch {
    return null
  }
}
