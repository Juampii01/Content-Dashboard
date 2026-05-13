'use client'

/**
 * ShortcutsHelp — global "?" overlay listing keyboard shortcuts.
 *
 * Trigger: press `?` (Shift + /) while no input / textarea / contentEditable
 * is focused. Close: Escape, click outside, or press `?` again. Mounted
 * once from GlobalOverlays so any page can surface the same list without
 * duplicating handlers.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Command as CommandIcon, X } from 'lucide-react'

type Group = {
  title: string
  items: { keys: string[]; label: string }[]
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPad|iPhone/.test(navigator.platform)
const CMD = isMac ? '⌘' : 'Ctrl'

const GROUPS: Group[] = [
  {
    title: 'Globales',
    items: [
      { keys: [CMD, 'K'], label: 'Abrir command palette' },
      { keys: ['?'], label: 'Mostrar esta ayuda' },
      { keys: ['Esc'], label: 'Cerrar diálogos / overlays' },
    ],
  },
  {
    title: 'Navegación',
    items: [
      { keys: [CMD, 'K'], label: 'Buscar rutas, clientes y acciones' },
      { keys: ['G', 'D'], label: 'Ir a Dashboard' },
      { keys: ['G', 'I'], label: 'Ir a Instagram' },
      { keys: ['G', 'C'], label: 'Ir a Contenido' },
      { keys: ['G', 'B'], label: 'Ir a Bases' },
    ],
  },
  {
    title: 'Tareas',
    items: [
      { keys: ['N'], label: 'Nueva tarea (en /contenido?tab=tareas)' },
      { keys: ['M'], label: 'Filtrar solo las mías' },
    ],
  },
]

function shouldIgnoreKey(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key === '?' && !shouldIgnoreKey(e.target)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-overlay"
          className="fixed inset-0 z-modal flex items-end justify-end p-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <CommandIcon size={14} style={{ color: 'var(--muted-foreground)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Atajos de teclado
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar atajos"
                className="opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {GROUPS.map((g) => (
                <section key={g.title}>
                  <p
                    className="text-[10px] font-semibold tracking-wider uppercase mb-2"
                    style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}
                  >
                    {g.title}
                  </p>
                  <ul className="space-y-1.5">
                    {g.items.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-3 text-xs">
                        <span style={{ color: 'var(--foreground)' }}>{item.label}</span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          {item.keys.map((k, ki) => (
                            <kbd
                              key={ki}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                              style={{
                                backgroundColor: 'var(--muted)',
                                border: '1px solid var(--border)',
                                color: 'var(--muted-foreground)',
                                minWidth: '18px',
                                textAlign: 'center',
                              }}
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div
              className="px-5 py-3 text-[10px]"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
            >
              Presioná <kbd className="px-1 rounded" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>?</kbd> en cualquier momento para volver a abrir.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
