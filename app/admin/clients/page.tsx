import { Building2 } from 'lucide-react'
import { ClientsAdminClient } from '@/components/admin/ClientsAdminClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default function AdminClientsPage() {
  return (
    <div className="page-shell" style={{ maxWidth: '64rem' }}>
      <PageHeader
        eyebrow="Admin"
        title="Clientes"
        description="Creá, editá y eliminá espacios de trabajo (tenants)."
        icon={Building2}
      />
      <ClientsAdminClient />
    </div>
  )
}
