'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logClientError } from '@/lib/client-errors'

type UserRole = 'ADMIN' | 'TEAM' | 'SETTER' | 'CLIENT'

type ThemeKey = 'eternity' | 'govbidder'

type User = {
  id: string
  email: string | null
  displayName: string | null
  role: UserRole
  clientId: string | null
  themeKey: string | null
  createdAt: string
}

const THEME_OPTIONS: { value: ThemeKey; label: string; description: string }[] = [
  { value: 'eternity',  label: 'Eternity',  description: 'Dark · Brand rojo' },
  { value: 'govbidder', label: 'GovBidder', description: 'Light · Azul gobierno' },
]

const ROLE_FILTERS: { key: 'ALL' | UserRole; label: string }[] = [
  { key: 'ALL',    label: 'Todos'   },
  { key: 'ADMIN',  label: 'Admin'   },
  { key: 'TEAM',   label: 'Team'    },
  { key: 'SETTER', label: 'Setter'  },
  { key: 'CLIENT', label: 'Client'  },
]

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN',  label: 'Admin'  },
  { value: 'TEAM',   label: 'Team'   },
  { value: 'SETTER', label: 'Setter' },
  { value: 'CLIENT', label: 'Client' },
]

function roleChipStyle(role: UserRole): { bg: string; fg: string } {
  switch (role) {
    case 'ADMIN':  return { bg: 'var(--accent)',  fg: 'var(--accent-foreground)' }
    case 'TEAM':   return { bg: 'var(--muted)',   fg: 'var(--foreground)' }
    case 'SETTER': return { bg: 'var(--muted)',   fg: 'var(--foreground)' }
    case 'CLIENT': return { bg: 'var(--muted)',   fg: 'var(--muted-foreground)' }
  }
}

export function UsersAdminClient() {
  const [users, setUsers]   = useState<User[] | null>(null)
  const [filter, setFilter] = useState<'ALL' | UserRole>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setUsers(data.users)
    } catch (err) {
      logClientError(err, 'UsersAdminClient:loadUsers')
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function patchUser(userId: string, body: Record<string, unknown>, successMsg: string) {
    if (busyId) return
    setBusyId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `Error ${res.status}`)
      }
      toast.success(successMsg)
      await loadUsers()
    } catch (err) {
      logClientError(err, 'UsersAdminClient:patch')
    } finally {
      setBusyId(null)
    }
  }

  const filtered = useMemo(() => {
    if (!users) return []
    if (filter === 'ALL') return users
    return users.filter((u) => u.role === filter)
  }, [users, filter])

  return (
    <>
      {/* Filter bar */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {ROLE_FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 text-xs rounded-xl transition-opacity"
              style={{
                backgroundColor: active ? 'var(--accent)' : 'var(--muted)',
                color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div
          className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Nombre</div>
          <div className="col-span-2">Rol</div>
          <div className="col-span-3">Tema</div>
          <div className="col-span-2"></div>
        </div>

        {users === null && (
          <div className="px-4 py-8 text-xs text-center flex items-center justify-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <Loader2 size={13} className="animate-spin" /> Cargando…
          </div>
        )}

        {users !== null && filtered.length === 0 && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
            Sin resultados
          </div>
        )}

        {filtered.map((u) => {
          const chip = roleChipStyle(u.role)
          const isBusy = busyId === u.id
          return (
            <div
              key={u.id}
              className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-xs"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="col-span-3 truncate" style={{ color: 'var(--foreground)' }}>
                {u.email ?? '—'}
              </div>
              <div className="col-span-2 truncate" style={{ color: 'var(--muted-foreground)' }}>
                {u.displayName ?? '—'}
              </div>
              <div className="col-span-2">
                <select
                  value={u.role}
                  onChange={(e) => patchUser(u.id, { role: e.target.value }, 'Rol actualizado')}
                  disabled={isBusy}
                  className="text-[11px] font-medium px-2 py-1 rounded-lg outline-none"
                  style={{
                    backgroundColor: chip.bg,
                    color: chip.fg,
                    border: '1px solid var(--border)',
                  }}
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <select
                  value={u.themeKey ?? 'eternity'}
                  onChange={(e) => patchUser(u.id, { themeKey: e.target.value }, 'Tema actualizado')}
                  disabled={isBusy}
                  className="text-[11px] px-2 py-1 rounded-lg outline-none"
                  style={{
                    backgroundColor: 'var(--muted)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex items-center justify-end">
                {isBusy && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />}
              </div>
            </div>
          )
        })}
      </div>

    </>
  )
}
