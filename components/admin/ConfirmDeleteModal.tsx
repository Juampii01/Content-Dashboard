'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  title: string
  description: ReactNode
  confirmLabel: string
  busy?: boolean
  icon?: ReactNode
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmDeleteModal({
  title, description, confirmLabel, busy, icon, onCancel, onConfirm,
}: Props) {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  if (!mounted) return null

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-modal-overlay flex items-center justify-center p-4 glass-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div
        className="w-full max-w-md rounded-xl"
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
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--destructive) 15%, transparent)',
                color: 'var(--destructive)',
              }}
            >
              <AlertTriangle size={14} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {title}
            </h2>
          </div>
          <button onClick={onCancel} aria-label="Cerrar" className="p-1 rounded hover:opacity-70 transition-opacity">
            <X size={16} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            {description}
          </p>
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-ghost btn-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={busy}
            className="btn btn-sm"
            style={{
              backgroundColor: 'var(--destructive)',
              color: 'var(--destructive-foreground)',
              border: '1px solid color-mix(in srgb, var(--destructive) 60%, transparent)',
            }}
          >
            {icon}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
