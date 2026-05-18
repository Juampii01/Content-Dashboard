'use client'

import { Flame, Target, Megaphone, Lightbulb, type LucideIcon } from 'lucide-react'

export type CopyType = 'reels-virales' | 'reels-nicho' | 'anuncios' | 'ideas'

interface CopyTypeSelectorProps {
  value: CopyType
  onChange: (t: CopyType) => void
}

const TYPES: { id: CopyType; Icon: LucideIcon; label: string; desc: string }[] = [
  { id: 'reels-virales', Icon: Flame,     label: 'Reels virales',  desc: 'Hooks y scripts para máximo alcance' },
  { id: 'reels-nicho',   Icon: Target,    label: 'Reels de nicho', desc: 'Contenido profundo para tu audiencia' },
  { id: 'anuncios',      Icon: Megaphone, label: 'Anuncios',        desc: 'Copy para campañas de Meta Ads' },
  { id: 'ideas',         Icon: Lightbulb, label: 'Ideas',           desc: 'Títulos e ideas listos para grabar' },
]

export function CopyTypeSelector({ value, onChange }: CopyTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TYPES.map(({ id, Icon, label, desc }) => {
        const active = value === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="text-left rounded-xl p-4 transition-all hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: active ? 'color-mix(in srgb, var(--accent) 8%, var(--card))' : 'var(--card)',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            <Icon className="h-6 w-6 mb-2" style={{ color: active ? 'var(--accent)' : 'var(--muted-foreground)' }} />
            <p className="text-sm font-semibold" style={{ color: active ? 'var(--accent)' : 'var(--foreground)' }}>
              {label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>
            {active && (
              <div className="mt-2 w-4 h-0.5 rounded" style={{ backgroundColor: 'var(--accent)' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
