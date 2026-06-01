'use client'

import { LayoutDashboard, Target, TrendingUp } from 'lucide-react'
import { META_BLUE } from './ads-theme'

export type AdsTab = 'resumen' | 'campañas' | 'rendimiento'

const TABS: { id: AdsTab; label: string; icon: React.ElementType }[] = [
  { id: 'resumen',      label: 'Resumen',     icon: LayoutDashboard },
  { id: 'campañas',    label: 'Campañas',    icon: Target },
  { id: 'rendimiento', label: 'Rendimiento', icon: TrendingUp },
]

interface AdsTabNavProps {
  activeTab: AdsTab
  onChange: (tab: AdsTab) => void
}

export function AdsTabNav({ activeTab, onChange }: AdsTabNavProps) {
  return (
    <div
      className="flex items-center gap-0 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors"
            style={{
              color: active ? META_BLUE : 'var(--muted-foreground)',
              borderBottom: active ? `2px solid ${META_BLUE}` : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
