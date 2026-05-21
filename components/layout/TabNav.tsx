'use client'

import { LayoutDashboard, Film, Grid3X3, Swords, BookMarked, Send, MessageSquare, Inbox, Users } from 'lucide-react'
import { useTab } from '@/hooks/useTab'
import type { Tab } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',             label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'reels',                 label: 'Reels',               icon: Film },
  { id: 'publicaciones',         label: 'Publicaciones',       icon: Grid3X3 },
  { id: 'competencia',           label: 'Competencia',         icon: Swords },
  { id: 'referencias',           label: 'Referencias',         icon: BookMarked },
  { id: 'publicar',              label: 'Publicar',            icon: Send },
  { id: 'comentarios',           label: 'Comentarios',         icon: MessageSquare },
  { id: 'mensajes',              label: 'Mensajes',            icon: Inbox },
  { id: 'audiencia',             label: 'Audiencia',           icon: Users },
]

export function TabNav() {
  const [tab, setTab] = useTab()

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', scrollbarWidth: 'none' }}>
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = tab === id
        return (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
              active ? '' : 'hover:opacity-80'
            )}
            style={{
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
              border: '1px solid transparent',
            }}>
            <Icon size={14} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
