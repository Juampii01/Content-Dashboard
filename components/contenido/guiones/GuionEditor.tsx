'use client'

import { Trash2, FileText } from 'lucide-react'
import type { GuionItem } from '@/lib/types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface GuionEditorProps {
  activeItem: GuionItem | null
  hasTabs: boolean
  label: string
  onUpdate: (patch: Partial<GuionItem>) => void
  onDelete: (id: string) => void
  saveStatus?: SaveStatus
}

function statusLabel(status: SaveStatus): string {
  switch (status) {
    case 'saving': return 'Guardando…'
    case 'saved':  return 'Guardado'
    case 'error':  return '⚠ No se pudo guardar — revisá tu conexión'
    default:       return 'Guardado automáticamente'
  }
}

export function GuionEditor({ activeItem, hasTabs, label, onUpdate, onDelete, saveStatus = 'idle' }: GuionEditorProps) {
  if (!activeItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <FileText size={32} style={{ color: 'var(--muted-foreground)', opacity: 0.15 }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
          {hasTabs ? 'Selecciona o crea un guión' : 'Crea una pestaña para empezar'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between px-6 py-3 border-b gap-3" style={{ borderColor: 'var(--border)' }}>
        <input
          value={activeItem.title}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="Título del guión"
          className="flex-1 text-sm font-semibold bg-transparent outline-none"
          style={{ color: 'var(--foreground)' }}
        />
        <button
          onClick={() => onDelete(activeItem.id)}
          className="flex-shrink-0 p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--accent)' }}
          title="Eliminar guión"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex-1 px-6 py-5">
        <textarea
          value={activeItem.content}
          onChange={e => onUpdate({ content: e.target.value })}
          placeholder={`Escribe el guión de tu ${label} aquí...\n\nEstructura sugerida:\n🎣 HOOK (0-3 seg)\n...\n📖 DESARROLLO\n...\n📣 CTA`}
          className="w-full resize-none text-sm leading-relaxed outline-none bg-transparent"
          style={{ color: 'var(--foreground)', minHeight: '420px', height: '100%' }}
          spellCheck={false}
        />
      </div>

      <div className="px-6 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <p
          className="text-[10px]"
          style={{
            color: saveStatus === 'error' ? 'var(--accent)' : 'var(--muted-foreground)',
            opacity: saveStatus === 'error' ? 1 : 0.6,
          }}
        >
          {statusLabel(saveStatus)} · {activeItem.content.split(/\s+/).filter(Boolean).length} palabras
        </p>
      </div>
    </div>
  )
}
