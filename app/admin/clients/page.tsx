import { ClientsAdminClient } from '@/components/admin/ClientsAdminClient'

export const dynamic = 'force-dynamic'

export default function AdminClientsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Clientes
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Crear, editar y eliminar espacios de trabajo (tenants).
        </p>
      </div>
      <ClientsAdminClient />
    </div>
  )
}
