'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X, ChevronDown } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { isAdmin } from '@/lib/auth/permissions'

interface Client {
  id: string
  name: string
}

function readViewAsCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('admin_view_as='))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

export function ViewAsPicker() {
  const { profile } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [viewAsId, setViewAsId] = useState<string | null>(null)
  const [viewAsName, setViewAsName] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Only render for admins
  if (!profile || !isAdmin(profile.role)) return null

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const currentId = readViewAsCookie()
    setViewAsId(currentId)

    // Fetch all clients for the dropdown
    fetch('/api/admin/clients')
      .then((r) => (r.ok ? (r.json() as Promise<{ clients: Client[] } | Client[]>) : null))
      .then((data) => {
        if (!data) return
        const list: Client[] = Array.isArray(data) ? data : (data as { clients: Client[] }).clients ?? []
        setClients(list)
        if (currentId) {
          const found = list.find((c) => c.id === currentId)
          if (found) setViewAsName(found.name)
        }
      })
      .catch(() => {/* ignore */})
  }, [])

  // Close dropdown on outside click
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function selectClient(client: Client) {
    setLoading(true)
    setOpen(false)
    try {
      const res = await fetch('/api/admin/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      if (res.ok) {
        setViewAsId(client.id)
        setViewAsName(client.name)
        router.refresh()
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  async function clearViewAs() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: null }),
      })
      if (res.ok) {
        setViewAsId(null)
        setViewAsName(null)
        router.refresh()
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  const isActive = !!viewAsId

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {isActive ? (
        // Active state — showing as a specific client
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
          }}
        >
          <Eye size={12} />
          <span className="max-w-[120px] truncate">{viewAsName ?? viewAsId}</span>
          <button
            type="button"
            onClick={clearViewAs}
            disabled={loading}
            aria-label="Dejar de ver como este cliente"
            className="ml-0.5 flex items-center justify-center rounded-full transition-opacity hover:opacity-70 cursor-pointer disabled:opacity-50"
            style={{ color: 'var(--accent)' }}
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        // Inactive state — show dropdown trigger
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={loading}
          aria-label="Ver como cliente"
          aria-expanded={open}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80 cursor-pointer disabled:opacity-50"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            color: 'var(--muted-foreground)',
          }}
        >
          <Eye size={12} />
          Ver como...
          <ChevronDown
            size={11}
            style={{
              transition: 'transform 200ms',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      )}

      {open && !isActive && (
        <div
          className="absolute right-0 mt-2 rounded-xl shadow-lg overflow-hidden"
          style={{
            top: '100%',
            zIndex: 50,
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            minWidth: '200px',
            maxHeight: '256px',
            overflowY: 'auto',
          }}
        >
          {clients.length === 0 ? (
            <div
              className="px-4 py-3 text-xs"
              style={{ color: 'var(--muted-foreground)' }}
            >
              No hay clientes
            </div>
          ) : (
            clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => selectClient(client)}
                className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer"
                style={{
                  color: 'var(--foreground)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--foreground) 6%, transparent)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {client.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
