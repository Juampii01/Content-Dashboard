'use client'

import {
  Target,
  TriangleAlert,
  HeartCrack,
  Sparkles,
  Gem,
  KeyRound,
  Lightbulb,
  Search,
  type LucideIcon,
} from 'lucide-react'

interface Section {
  id: string
  label: string
  Icon: LucideIcon
}

export const BASES_SECTIONS: Section[] = [
  { id: 'cliente-ideal', label: 'Cliente ideal', Icon: Target },
  { id: 'problemas', label: 'Problemas', Icon: TriangleAlert },
  { id: 'dolores', label: 'Dolores', Icon: HeartCrack },
  { id: 'deseos', label: 'Deseos', Icon: Sparkles },
  { id: 'oferta', label: 'Oferta', Icon: Gem },
  { id: 'keywords', label: 'Keywords', Icon: KeyRound },
  { id: 'insights', label: 'Insights', Icon: Lightbulb },
  { id: 'competencia', label: 'Competencia', Icon: Search },
]

interface BasesTabNavProps {
  activeId: string
  onChange: (id: string) => void
}

export function BasesTabNav({ activeId, onChange }: BasesTabNavProps) {
  return (
    <nav className="flex flex-col gap-0.5">
      {BASES_SECTIONS.map((section) => {
        const active = activeId === section.id
        const Icon = section.Icon
        return (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all cursor-pointer"
            style={{
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
              fontWeight: active ? 600 : 400,
            }}
          >
            <Icon className="h-4 w-4" />
            {section.label}
          </button>
        )
      })}
    </nav>
  )
}
