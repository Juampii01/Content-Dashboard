'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X, Check, Loader2 } from 'lucide-react'

type User = {
  id: string
  email: string | null
  displayName: string | null
  clientId: string | null
  clientName: string | null
}
type ClientOpt = { id: string; name: string; slug: string }

interface Props {
  user: User
  allClients: ClientOpt[]
  onClose: () => void
  onChanged: () => void | Promise<void>
}

export function ClientAccessModal({ user, allClients, onClose, onChanged }: Props) {
  const [mounted, setMounted] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [selected, setSelected] = useState<string | null>(user.clientId)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function save() {
    if (busy) return
    setBusy(true)
    try {
      let res: Response
      if (selected) {
        res = await fetch(`/api/admin/users/${user.id}/client-access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: selected }),
        })
      } else {
        res = await fetch(`/api/admin/users/${user.id}/client-access/${user.clientId ?? '_'}`, {
          method: 'DELETE',
        })
      }
      if (res.ok) await onChanged()
    } finally {
      setBusy(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Asignar cliente"
      className="fixed inset-0 z-modal-overlay flex items-center justify-center p-4 glass-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="w-full max-w-md rounded-xl flex flex-col"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
        }}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Asignar cliente
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {user.email ?? user.displayName ?? user.id}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70 transition-opacity">
            <X size={16} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-1">
          {/* Sin cliente option */}
          <button
            onClick={() => setSelected(null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-opacity hover:opacity-90"
            style={{
              backgroundColor: selected === null ? 'var(--muted)' : 'transparent',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: selected === null ? 'var(--accent)' : 'transparent',
                border: `1px solid ${selected === null ? 'var(--accent)' : 'var(--border)'}`,
                color: 'var(--accent-foreground)',
              }}
            >
              {selected === null && <Check size={11} />}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Sin cliente
            </div>
          </button>

          {allClients.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--muted-foreground)' }}>
              No hay clientes creados.
            </p>
          )}

          {allClients.map((c) => {
            const isSelected = selected === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: isSelected ? 'var(--muted)' : 'transparent',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    color: 'var(--accent-foreground)',
                  }}
                >
                  {isSelected && <Check size={11} />}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                    {c.name}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                    {c.slug}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || selected === user.clientId}
            className="btn btn-sm flex items-center gap-1.5 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
