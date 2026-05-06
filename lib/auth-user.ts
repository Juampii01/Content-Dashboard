/**
 * Auth helpers — resolve the current Supabase auth user on the server and
 * determine access to the multi-tenant client workspace.
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

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import type { Profile, GlobalRole } from '@prisma/client'

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

export const ACTIVE_CLIENT_COOKIE = 'activeClientId'

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
 * Returns the authenticated user plus their Profile record and globalRole.
 * Throws `UnauthorizedError` if no session. The caller decides what to do
 * with a PENDING role (middleware normally redirects to /pending-approval).
 */
export async function requireProfile(): Promise<{
  userId: string
  globalRole: GlobalRole
  profile: Profile
}> {
  const userId = await requireUserId()
  const profile = await db.profile.findUnique({ where: { id: userId } })
  if (!profile) {
    // middleware should have created one, but fall back gracefully
    throw new UnauthorizedError()
  }
  return { userId, globalRole: profile.globalRole, profile }
}

/**
 * Throws `ForbiddenError` if the current user is not SUPER_ADMIN.
 */
export async function requireSuperAdmin(): Promise<{
  userId: string
  profile: Profile
}> {
  const { userId, globalRole, profile } = await requireProfile()
  if (globalRole !== 'SUPER_ADMIN') {
    throw new ForbiddenError()
  }
  return { userId, profile }
}

/**
 * Reads the active client id from the `activeClientId` cookie.
 * Does NOT validate access — use `requireActiveClient()` for that.
 */
export async function getActiveClientId(): Promise<string | null> {
  const store = await cookies()
  return store.get(ACTIVE_CLIENT_COOKIE)?.value ?? null
}

/**
 * Resolves the authenticated user and their active client, validating the
 * ClientAccess row exists. Throws:
 *  - UnauthorizedError (401) if no session
 *  - ForbiddenError (403) if no active client cookie or no access row
 */
export async function requireActiveClient(): Promise<{
  userId: string
  clientId: string
}> {
  const userId = await requireUserId()
  const clientId = await getActiveClientId()
  if (!clientId) {
    throw new ForbiddenError('NO_ACTIVE_CLIENT')
  }

  // Fetch profile globalRole + the user's access row for this client in one
  // parallel batch (lib-004). Previously did serial profile → access lookups,
  // doubling auth latency on every API call. Non-admin common path is now a
  // single round-trip window.
  const [profile, access] = await Promise.all([
    db.profile.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    }),
    db.clientAccess.findUnique({
      where: { userId_clientId: { userId, clientId } },
      select: { userId: true },
    }),
  ])

  if (!profile) {
    // middleware should have created one; fall back to unauthorized
    throw new UnauthorizedError()
  }

  if (profile.globalRole === 'SUPER_ADMIN') {
    // SUPER_ADMIN bypass: any existing client they selected is accessible.
    // If they already have an access row we're done; otherwise verify the
    // client exists (rare extra roundtrip, only for admin + no-access case).
    if (access) return { userId, clientId }
    const exists = await db.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!exists) throw new ForbiddenError('CLIENT_NOT_FOUND')
    return { userId, clientId }
  }

  if (!access) {
    throw new ForbiddenError('NO_CLIENT_ACCESS')
  }
  return { userId, clientId }
}
