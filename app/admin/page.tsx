import Link from 'next/link'
import { Users, Clock, Building2 } from 'lucide-react'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const [userCount, pendingCount, clientCount] = await Promise.all([
    db.profile.count(),
    db.profile.count({ where: { globalRole: 'PENDING' } }),
    db.client.count(),
  ])

  const cards = [
    {
      label: 'Usuarios totales',
      value: userCount,
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Aprobaciones pendientes',
      value: pendingCount,
      icon: Clock,
      href: '/admin/users?filter=PENDING',
      highlight: pendingCount > 0,
    },
    {
      label: 'Clientes',
      value: clientCount,
      icon: Building2,
      href: '/admin/clients',
    },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          Panel de administración
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Gestión de usuarios, roles y clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, href, highlight }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl p-5 transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--card)',
              border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {label}
              </span>
              <Icon size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color: 'var(--foreground)' }}
            >
              {value}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
