'use client'

import { TT_TEAL } from './tt-theme'

export type TTTab = 'inicio' | 'videos' | 'publicar'

const TABS: { id: TTTab; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'videos', label: 'Videos' },
  { id: 'publicar', label: 'Publicar' },
]

interface TTTabNavProps {
  active: TTTab
  onChange: (tab: TTTab) => void
}

export function TTTabNav({ active, onChange }: TTTabNavProps) {
  return (
    <div className="flex items-center border-b border-border/60">
      {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative px-6 py-3 text-sm font-medium transition-colors
              ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
            `}
          >
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                style={{ background: TT_TEAL }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
