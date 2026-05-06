'use client'

import { motion } from 'motion/react'
import { ContentTemplate } from '@/lib/types'

interface TemplatePickerModalProps {
  type: 'reel' | 'historia'
  templates: ContentTemplate[]
  anchor: { x: number; y: number }
  onSelectBlank: () => void
  onSelectTemplate: (template: ContentTemplate) => void
  onDeleteTemplate: (id: string) => void
  onClose: () => void
}

export function TemplatePickerModal({
  type,
  templates,
  anchor,
  onSelectBlank,
  onSelectTemplate,
  onDeleteTemplate,
  onClose,
}: TemplatePickerModalProps) {

  const PICKER_W = 230
  const PICKER_H = templates.length > 0 ? 240 : 120
  const left = anchor.x + PICKER_W > window.innerWidth ? anchor.x - PICKER_W : anchor.x
  const top = anchor.y + PICKER_H > window.innerHeight ? anchor.y - PICKER_H : anchor.y

  const label = type === 'reel' ? 'Reel' : 'Historia'

  return (
    <>
      {/* Click-outside overlay */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Picker popover */}
      <motion.div
        className="fixed z-50 rounded-xl shadow-xl overflow-hidden"
        style={{
          left,
          top,
          width: PICKER_W,
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
        }}
        initial={{ opacity: 0, scale: 0.95, y: -6 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Blank option */}
        <button
          onClick={onSelectBlank}
          className="w-full text-left text-sm px-4 py-3 font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--foreground)' }}
        >
          Nuevo {label}
        </button>

        {templates.length > 0 && (
          <>
            <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 12px' }} />
            <div className="py-1 max-h-40 overflow-y-auto">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center group px-2">
                  <button
                    onClick={() => onSelectTemplate(t)}
                    className="flex-1 text-left text-xs px-2 py-2 rounded-lg transition-colors hover:opacity-80 flex items-center gap-2"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(t.id)}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-xs px-1 transition-opacity"
                    style={{ color: 'var(--muted-foreground)' }}
                    title="Eliminar plantilla"
                  >
                    {'\u00D7'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

      </motion.div>
    </>
  )
}
