'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface KeyboardShortcutsDialogProps {
  onClose: () => void
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['/'], label: 'Enfocar buscador' },
  { keys: ['n'], label: 'Nuevo item (día visible)' },
  { keys: ['t'], label: 'Ir a hoy' },
  { keys: ['←'], label: 'Mes / semana anterior' },
  { keys: ['→'], label: 'Mes / semana siguiente' },
  { keys: ['Esc'], label: 'Cerrar modal / popover' },
  { keys: ['Enter'], label: 'Abrir item seleccionado' },
  { keys: ['←', '→'], label: 'Mover item un día (sobre barra)' },
]

export function KeyboardShortcutsDialog({ onClose }: KeyboardShortcutsDialogProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center animate-in fade-in duration-150"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-label="Atajos de teclado"
    >
      <div
        className="rounded-xl shadow-2xl animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          width: 'min(420px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h3 className="text-[14px] font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Atajos de teclado
          </h3>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--muted)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
          >
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {SHORTCUTS.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
              style={{ minHeight: 40 }}
            >
              <span className="text-[13px]" style={{ color: 'var(--foreground)' }}>
                {sc.label}
              </span>
              <div className="flex items-center gap-1">
                {sc.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums"
                    style={{
                      backgroundColor: 'var(--muted)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                      minWidth: 22,
                      textAlign: 'center',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
