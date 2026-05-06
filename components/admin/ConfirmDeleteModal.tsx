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
      className="fixed inset-0 z-modal-overlay flex items-center justify-center p-4 glass-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div
        className="w-full max-w-md rounded-xl shadow-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
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
              style={{ backgroundColor: '#E0525222', color: '#E05252' }}
            >
              <AlertTriangle size={14} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {title}
            </h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:opacity-70 transition-opacity">
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
            onClick={onCancel}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm()}
            disabled={busy}
            className="text-xs px-4 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
            style={{ backgroundColor: '#E05252', color: '#fff' }}
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
