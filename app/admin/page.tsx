import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Shield, Users, UserCog, UserCheck, Building2, ChevronRight } from 'lucide-react'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireProfile } from '@/lib/auth-user'
import { isAdmin } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ROLE_META: Record<string, { label: string; bg: string; fg: string }> = {
  ADMIN:  { label: 'Admin',  bg: 'color-mix(in srgb, var(--accent) 15%, transparent)', fg: 'var(--accent)' },
  TEAM:   { label: 'Team',   bg: 'color-mix(in srgb, #5C6BC0 15%, transparent)',       fg: '#5C6BC0' },
  SETTER: { label: 'Setter', bg: 'color-mix(in srgb, #26A69A 15%, transparent)',       fg: '#26A69A' },
  CLIENT: { label: 'Client', bg: 'color-mix(in srgb, #B08A4A 15%, transparent)',       fg: '#B08A4A' },
}

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? { label: role, bg: 'var(--muted)', fg: 'var(--muted-foreground)' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  )
}

function Avatar({ name, email }: { name: string | null; email: string | null }) {
  const initials = (name ?? email ?? '?').slice(0, 2).toUpperCase()
  return (
    <span
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
        color: 'var(--accent)',
        border: '1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
      }}
    >
      {initials}
    </span>
  )
}

function formatDate(iso: Date): string {
  return iso.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminOverviewPage() {
  try {
    const { role } = await requireProfile()
    if (!isAdmin(role)) notFound()
  } catch {
    notFound()
  }

  // Fetch profiles with client info
  const profiles = await db.profile.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { id: true, name: true } } },
  })

  // Try to enrich with Supabase auth emails
  let authEmailById = new Map<string, string>()
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (data) {
      authEmailById = new Map(
        data.users
          .filter((u) => u.email)
          .map((u): [string, string] => [u.id, u.email!])
      )
    }
  } catch { /* ignore — fall back to profile.email */ }

  const users = profiles.map((p) => ({
    id: p.id,
    email: authEmailById.get(p.id) ?? p.email ?? null,
    displayName: p.displayName,
    role: p.role,
    clientName: p.client?.name ?? null,
    createdAt: p.createdAt,
  }))

  const totalUsers  = users.length
  const adminCount  = users.filter((u) => u.role === 'ADMIN').length
  const clientCount = users.filter((u) => u.role === 'CLIENT').length

  return (
    <div className="page-shell" style={{ maxWidth: '72rem' }}>
      <PageHeader
        eyebrow="Admin"
        title="Panel de administración"
        description="Usuarios, roles y accesos del sistema."
        icon={Shield}
      />

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Usuarios totales', value: totalUsers, icon: Users },
          { label: 'Admins',           value: adminCount,  icon: UserCheck },
          { label: 'Clientes',         value: clientCount, icon: UserCog },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: 'color-mix(in srgb, var(--accent) 11%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border))',
              }}
            >
              <Icon size={15} />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--foreground)' }}>
                {value}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Users table ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Table header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Usuarios
            </span>
            <span
              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {totalUsers}
            </span>
          </div>
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            Gestionar
            <ChevronRight size={13} />
          </Link>
        </div>

        {/* Column headers */}
        <div
          className="grid grid-cols-12 gap-3 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)', opacity: 0.7 }}
        >
          <div className="col-span-4">Usuario</div>
          <div className="col-span-2">Rol</div>
          <div className="col-span-3">Organización</div>
          <div className="col-span-3">Desde</div>
        </div>

        {/* Rows */}
        {users.map((u, i) => (
          <div
            key={u.id}
            className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-colors"
            style={{
              borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            {/* Avatar + name/email */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <Avatar name={u.displayName} email={u.email} />
              <div className="min-w-0">
                {u.displayName && (
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {u.displayName}
                  </p>
                )}
                <p
                  className="text-xs truncate"
                  style={{ color: u.displayName ? 'var(--muted-foreground)' : 'var(--foreground)' }}
                >
                  {u.email ?? '—'}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="col-span-2">
              <RoleBadge role={u.role} />
            </div>

            {/* Client */}
            <div className="col-span-3 flex items-center gap-1.5 min-w-0">
              {u.clientName ? (
                <>
                  <Building2 size={11} style={{ color: 'var(--muted-foreground)', flexShrink: 0, opacity: 0.6 }} />
                  <span className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                    {u.clientName}
                  </span>
                </>
              ) : (
                <span className="text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.35 }}>
                  Sin asignar
                </span>
              )}
            </div>

            {/* Date */}
            <div className="col-span-3">
              <span className="text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                {formatDate(u.createdAt)}
              </span>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No hay usuarios registrados.
          </div>
        )}
      </div>
    </div>
  )
}
