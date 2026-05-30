import 'server-only'

import { headers } from 'next/headers'
import { db as prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

const PUBLIC_PATHS = ['/login', '/pending-approval', '/auth/reset-password']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Called from the root layout (server component). Runs on Node.js, so Prisma
 * is safe here. Handles:
 *   - Profile upsert on first login (role defaults to CLIENT via schema)
 *   - Backfill of email from Supabase auth.users on every login
 *
 * Silently no-ops on public paths and for unauthenticated users (middleware
 * already handled the redirect for them). All Prisma errors are swallowed so
 * DB issues never blank the page.
 *
 * Note: no PENDING gate, no cookie assignment — clientId lives on Profile and
 * is assigned by an admin via /api/admin/users/[id].
 */
export async function bootstrapAuth(): Promise<void> {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''

  if (isPublicPath(pathname)) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  if (!user) return

  try {
    const supabaseEmail = user.email ?? null
    await prisma.profile.upsert({
      where: { id: user.id },
      update: supabaseEmail ? { email: supabaseEmail } : {},
      create: {
        id: user.id,
        email: supabaseEmail,
        role: 'CLIENT',
      },
    })
  } catch (err) {
    console.error('[bootstrapAuth] profile upsert failed:', err)
  }
}
