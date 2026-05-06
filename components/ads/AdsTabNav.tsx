'use client'

import { LayoutDashboard, BarChart2, Music, Image } from 'lucide-react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export type AdsTab = 'resumen' | 'meta-ads' | 'tiktok-ads' | 'creativos'

const TABS: { id: AdsTab; label: string; icon: React.ElementType }[] = [
  { id: 'resumen',     label: 'Resumen',      icon: LayoutDashboard },
  { id: 'meta-ads',   label: 'Meta Ads',     icon: BarChart2 },
  { id: 'tiktok-ads', label: 'TikTok Ads',   icon: Music },
  { id: 'creativos',  label: 'Creativos',    icon: Image },
]

const VALID: AdsTab[] = ['resumen', 'meta-ads', 'tiktok-ads', 'creativos']

export function useAdsTab(): [AdsTab, (t: AdsTab) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const raw = searchParams.get('tab') as AdsTab
  const tab: AdsTab = VALID.includes(raw) ? raw : 'resumen'

  function setTab(t: AdsTab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', t)
    router.push(`${pathname}?${params.toString()}`)
  }

  return [tab, setTab]
}

export function AdsTabNav() {
  const [tab, setTab] = useAdsTab()

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        scrollbarWidth: 'none',
      }}
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
