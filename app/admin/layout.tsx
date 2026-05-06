import { notFound, redirect } from 'next/navigation'
import { requireProfile, UnauthorizedError } from '@/lib/auth-user'

export const dynamic = 'force-dynamic'

/**
 * Admin layout gate.
 *
 *   Unauthenticated  → redirect to /login (user can't know admin routes exist)
 *   Authenticated, not SUPER_ADMIN → 404 real via notFound() (hides existence)
 *   SUPER_ADMIN → render children
 *
 * Prior implementation rendered a fake <NotFoundShell /> with HTTP 200, which
 * leaked the URL to link checkers / search indexes.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const { globalRole } = await requireProfile()
    if (globalRole !== 'SUPER_ADMIN') {
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
