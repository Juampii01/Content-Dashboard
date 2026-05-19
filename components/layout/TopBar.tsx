'use client'

import { useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Eye, Users, TrendingUp, Menu, UserCircle2, ChevronDown } from 'lucide-react'
import { formatM, formatPercent } from '@/lib/utils/formatters'
import { ThemeToggle } from './ThemeToggle'
import { ThemePicker } from './ThemePicker'
import { ViewAsPicker } from './ViewAsPicker'
import { SettingsModal } from './SettingsModal'
import { MobileSidebarContext } from './LayoutShell'
import { useAuth } from './AuthProvider'

interface GlobalStats {
  followers: number
  views: number
  engagementRate: number
}

const EMPTY = '—'

export function TopBar() {
  const { open: openMobileSidebar } = useContext(MobileSidebarContext)
  const pathname = usePathname()
  const { profile } = useAuth()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const initials = profile?.displayName
    ? profile.displayName.slice(0, 2).toUpperCase()
    : profile?.email
    ? profile.email.slice(0, 2).toUpperCase()
    : 'TU'
  const displayName = profile?.displayName ?? profile?.email ?? 'Tu Cuenta'

  // Map route → platform param so the TopBar shows platform-specific stats
  const platformParam = pathname.startsWith('/instagram')
    ? 'instagram'
    : pathname.startsWith('/youtube')
    ? 'youtube'
    : pathname.startsWith('/tiktok')
    ? 'tiktok'
    : pathname.startsWith('/ads')
    ? 'meta-ads'
    : null

  useEffect(() => {
    let cancelled = false
    const url = platformParam
      ? `/api/me/global-stats?platform=${platformParam}`
      : '/api/me/global-stats'
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<GlobalStats | null>) : null))
      .then((data) => {
        if (cancelled) return
        setStats(data)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [pathname, platformParam])

  // Until the fetch resolves we show the same dash placeholders so the
  // pills don't flash mock numbers during hydration.
  const metrics = [
    { Icon: Eye,        label: 'VIEWS',     value: stats ? formatM(stats.views)               : EMPTY, color: 'var(--stat-icon)',           delay: '0ms'   },
    { Icon: Users,      label: 'FOLLOWERS', value: stats ? formatM(stats.followers)           : EMPTY, color: 'var(--stat-icon)',           delay: '60ms'  },
    { Icon: TrendingUp, label: 'ENG. RATE', value: stats ? formatPercent(stats.engagementRate) : EMPTY, color: 'var(--stat-icon-secondary)', delay: '120ms' },
  ]

  return (
    <header
      className="sticky top-0 z-sticky h-16 flex items-center justify-between gap-4 px-4 md:px-6 backdrop-blur-xl"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--background) 80%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Mobile menu + identity pill */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Abrir menú"
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl transition-colors cursor-pointer hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Menu size={18} />
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full transition-colors cursor-pointer"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--card) 80%, var(--foreground) 4%)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card)'
          }}
        >
          <span
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
              border: '1.5px solid color-mix(in srgb, var(--accent) 40%, transparent)',
              color: 'var(--accent)',
            }}
          >
            <UserCircle2 size={14} />
          </span>
          <span className="hidden sm:block text-sm font-medium leading-none truncate max-w-[120px]">
            {displayName}
          </span>
          <ChevronDown size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
        </button>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        role={profile?.role ?? null}
        email={profile?.email ?? null}
        displayName={profile?.displayName ?? null}
        avatarUrl={profile?.avatarUrl ?? null}
      />

      {/* Center metric pills */}
      <div
        className="hidden lg:flex items-center gap-1 rounded-xl border px-1 py-1"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--card) 60%, transparent)',
          borderColor: 'var(--border)',
        }}
        aria-busy={!loaded || undefined}
        aria-label="Métricas globales"
      >
        {metrics.map(({ Icon, label, value, color, delay }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ animationDelay: delay, animationFillMode: 'both' }}
          >
            <Icon size={13} style={{ color }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {label}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: 'var(--foreground)' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <ViewAsPicker />
        <ThemePicker />
        <ThemeToggle />
      </div>
    </header>
  )
}
