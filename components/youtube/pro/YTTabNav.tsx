'use client'

import { Home, PlaySquare, Users } from 'lucide-react'
import { YT_RED } from './yt-theme'

export type YTTab = 'inicio' | 'videos' | 'audiencia'

const TABS: { id: YTTab; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'videos', label: 'Videos', icon: PlaySquare },
  { id: 'audiencia', label: 'Audiencia', icon: Users },
]

interface YTTabNavProps {
  active: YTTab
  onChange: (tab: YTTab) => void
}

export function YTTabNav({ active, onChange }: YTTabNavProps) {
  return (
    <div className="border-b border-border/60">
      <div className="max-w-4xl mx-auto flex items-center px-4">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors
                ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ background: YT_RED }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
