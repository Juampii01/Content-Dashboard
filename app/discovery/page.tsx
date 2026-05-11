import { notFound, redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { db } from '@/lib/db'
import { requireProfile, UnauthorizedError } from '@/lib/auth-user'
import { PageHeader } from '@/components/ui/PageHeader'
import { DiscoveryForm } from '@/components/discovery/DiscoveryForm'
import {
  DISCOVERY_BLOCKS,
  DISCOVERY_TITLE,
  DISCOVERY_DESCRIPTION,
} from '@/lib/discovery/questions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Discovery | Eternity Dashboard' }

/**
 * /discovery — Cristián's strategic discovery cuestionario.
 *
 * Access is gated to SUPER_ADMIN only (Cristián per seed). Anyone else gets
 * a 404 so the route's existence isn't leaked.
 */
export default async function DiscoveryPage() {
  let isSuperAdmin = false
  try {
    const { globalRole } = await requireProfile()
    isSuperAdmin = globalRole === 'SUPER_ADMIN'
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect('/login?next=/discovery')
    }
    throw err
  }
  if (!isSuperAdmin) notFound()

  const existing = await db.discoveryAnswers.findFirst()
  const row =
    existing ?? (await db.discoveryAnswers.create({ data: {} }))
  const answers = (row.answers as Record<string, string> | null) ?? {}

  return (
    <div className="page-shell" style={{ maxWidth: '52rem' }}>
      <PageHeader
        eyebrow="Discovery"
        title={DISCOVERY_TITLE}
        description={DISCOVERY_DESCRIPTION}
        icon={ClipboardList}
      />
      <DiscoveryForm blocks={DISCOVERY_BLOCKS} initialAnswers={answers} />
    </div>
  )
}
