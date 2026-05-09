import { UserCog } from 'lucide-react'
import { UsersAdminClient } from '@/components/admin/UsersAdminClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default function AdminUsersPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Admin"
        title="Usuarios"
        description="Aprobá, promové y gestioná acceso a clientes."
        icon={UserCog}
      />
      <UsersAdminClient />
    </div>
  )
}
