'use client'

import { useContext } from 'react'
import { Eye, Users, TrendingUp, Menu } from 'lucide-react'
import { formatM, formatPercent } from '@/lib/utils/formatters'
import { usePeriod } from '@/hooks/usePeriod'
import { getGlobalStats } from '@/lib/mock-data/global'
import { ThemeToggle } from './ThemeToggle'
import { MobileSidebarContext } from './LayoutShell'
import { ClientSwitcher } from './ClientSwitcher'

export function TopBar() {
  const [period] = usePeriod()
  const stats = getGlobalStats(period)
  const { open: openMobileSidebar } = useContext(MobileSidebarContext)

  return (
    <header
      className="sticky top-0 z-sticky h-14 flex items-center justify-between px-6"
      style={{
        backgroundColor: 'var(--background)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Profile */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Open menu"
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:opacity-70 transition-opacity cursor-pointer"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Menu size={18} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-shadow duration-200 hover:shadow-[0_0_0_2px_var(--accent),0_0_0_4px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
          style={{ backgroundColor: 'var(--accent)' }}>TU</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Tu Cuenta</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide animate-glow-pulse"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}>PRO</span>
        </div>
      </div>

      {/* Global metrics — stagger slide-up on load */}
      <div className="hidden md:flex items-center gap-6">
        {[
          { Icon: Eye,        label: 'VIEWS',    value: formatM(stats.views),              color: '#B08A4A', delay: '0ms'   },
          { Icon: Users,      label: 'FOLLOWERS', value: formatM(stats.followers),          color: '#B08A4A', delay: '60ms'  },
          { Icon: TrendingUp, label: 'ENG. RATE', value: formatPercent(stats.engagementRate), color: '#8A7A4A', delay: '120ms' },
        ].map(({ Icon, label, value, color, delay }) => (
          <div
            key={label}
            className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ animationDelay: delay, animationFillMode: 'both' }}
          >
            <Icon size={14} style={{ color }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <ClientSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
