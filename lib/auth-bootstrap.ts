import 'server-only'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db as prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_CLIENT_COOKIE } from '@/lib/auth-user'

const PUBLIC_PATHS = ['/login', '/pending-approval']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Called from the root layout (server component). Runs on Node.js, so Prisma
 * is safe here. Handles:
 *   - Profile upsert on first login
 *   - PENDING redirect to /pending-approval (only from non-public routes)
 *   - activeClientId cookie auto-assignment
 *
 * Silently no-ops on public paths and for unauthenticated users (middleware
 * already handled the redirect for them). All Prisma errors are swallowed so
 * DB issues never blank the page.
 */
export async function bootstrapAuth(): Promise<void> {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''

  // Fast exit for public paths: don't run any DB logic, don't risk blanking.
  if (isPublicPath(pathname)) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  if (!user) return

  let profile
  try {
    // Backfill email on every login: older profiles may have email=null if
    // the row was created before Supabase populated user.email. Conditional
    // so we never overwrite an existing value with null.
    const supabaseEmail = user.email ?? null
    profile = await prisma.profile.upsert({
      where: { id: user.id },
      update: supabaseEmail ? { email: supabaseEmail } : {},
      create: {
        id: user.id,
        email: supabaseEmail,
        globalRole: 'PENDING',
      },
    })
  } catch (err) {
    console.error('[bootstrapAuth] profile upsert failed:', err)
    return
  }

  if (profile.globalRole === 'PENDING') {
    redirect('/pending-approval')
  }

  const cookieStore = await cookies()
  const activeClientId = cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value
  if (activeClientId) return

  let firstClientId: string | null = null
  try {
    if (profile.globalRole === 'SUPER_ADMIN') {
      const client = await prisma.client.findFirst({ orderBy: { createdAt: 'asc' } })
      firstClientId = client?.id ?? null
    } else {
      const access = await prisma.clientAccess.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      })
      firstClientId = access?.clientId ?? null
    }
  } catch (err) {
    console.error('[bootstrapAuth] client lookup failed:', err)
    return
  }

  // Cookies can only be set from a Route Handler / Server Action in Next 15+,
  // not a Server Component. Bounce through a tiny GET handler that sets the
  // cookie and redirects back to the original path.
  if (firstClientId) {
    const next = encodeURIComponent(pathname || '/')
    redirect(`/api/me/active-client/auto?id=${firstClientId}&next=${next}`)
  }
}
