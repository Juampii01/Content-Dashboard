import { notFound, redirect } from 'next/navigation'
import { requireProfile, UnauthorizedError } from '@/lib/auth-user'
import { isAdmin } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

/**
 * Admin layout gate.
 *
 *   Unauthenticated → redirect to /login
 *   Authenticated, not ADMIN → 404 (hides existence of admin routes)
 *   ADMIN → render children
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const { role } = await requireProfile()
    if (!isAdmin(role)) {
      notFound()
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect('/login?next=/admin')
    }
    throw err
  }
  return <>{children}</>
}
