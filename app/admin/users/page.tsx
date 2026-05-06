import { UsersAdminClient } from '@/components/admin/UsersAdminClient'

export const dynamic = 'force-dynamic'

export default function AdminUsersPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Usuarios
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Aprobar, promover y gestionar acceso a clientes.
        </p>
      </div>
      <UsersAdminClient />
    </div>
  )
}
