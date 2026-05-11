import { notFound } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { db } from '@/lib/db'
import {
  requireSuperAdmin,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth-user'
import { PageHeader } from '@/components/ui/PageHeader'
import { DiscoveryAdminList } from '@/components/admin/DiscoveryAdminList'

export const dynamic = 'force-dynamic'

export default async function AdminDiscoveryPage() {
  try {
    await requireSuperAdmin()
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      notFound()
    }
    throw err
  }

  const rows = await db.discoveryResponse.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Serialize Dates for the client component.
  const items = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    clientId: r.clientId,
    email: r.email,
    createdAt: r.createdAt.toISOString(),
    answers: {
      q1: r.q1, q2: r.q2, q3: r.q3, q4: r.q4, q5: r.q5,
      q6: r.q6, q7: r.q7, q8: r.q8, q9: r.q9, q10: r.q10,
      q11: r.q11, q12: r.q12, q13: r.q13, q14: r.q14, q15: r.q15,
      q16: r.q16, q17: r.q17, q18: r.q18, q19: r.q19, q20: r.q20,
      q21: r.q21, q22: r.q22, q23: r.q23, q24: r.q24, q25: r.q25,
      q26: r.q26, q27: r.q27, q28: r.q28, q29: r.q29, q30: r.q30,
      q31: r.q31, q32: r.q32, q33: r.q33, q34: r.q34, q35: r.q35,
      q36: r.q36, q37: r.q37, q38: r.q38, q39: r.q39, q40: r.q40,
    } as Record<string, string | null>,
  }))

  return (
    <div className="page-shell" style={{ maxWidth: '64rem' }}>
      <PageHeader
        eyebrow="Admin"
        title="Discovery"
        description="Respuestas del cuestionario estratégico (últimas 100)."
        icon={ClipboardList}
      />
      <DiscoveryAdminList items={items} />
    </div>
  )
}
