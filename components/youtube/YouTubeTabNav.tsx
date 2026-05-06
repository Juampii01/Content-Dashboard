'use client'

import { LayoutDashboard, Film, Users } from 'lucide-react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export type YouTubeTab = 'dashboard' | 'videos' | 'audiencia'

const TABS: { id: YouTubeTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'videos',    label: 'Videos',    icon: Film },
  { id: 'audiencia', label: 'Audiencia', icon: Users },
]

const VALID: YouTubeTab[] = ['dashboard', 'videos', 'audiencia']

export function useYouTubeTab(): [YouTubeTab, (t: YouTubeTab) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const raw = searchParams.get('tab') as YouTubeTab
  const tab: YouTubeTab = VALID.includes(raw) ? raw : 'dashboard'

  function setTab(t: YouTubeTab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', t)
    router.push(`${pathname}?${params.toString()}`)
  }

  return [tab, setTab]
}

export function YouTubeTabNav() {
  const [tab, setTab] = useYouTubeTab()

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', scrollbarWidth: 'none' }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
              !active && 'hover:opacity-80'
            )}
            style={{
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
              border: '1px solid transparent',
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
