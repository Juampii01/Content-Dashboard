'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Period, DashboardStats } from '@/lib/types'
import { GreetingBlock } from './GreetingBlock'
import { StatGrid } from './StatGrid'
import { PerformanceCharts } from './PerformanceCharts'
import { QuickSummarySidebar } from './QuickSummarySidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { Users, Eye, Heart } from 'lucide-react'

const PERIODS: { label: string; value: Period }[] = [
  { label: '7d',  value: 7  },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

interface GlobalStats {
  followers: number
  views: number
  engagementRate: number
}

// Empty DashboardStats used as placeholder while loading
const EMPTY_STATS: DashboardStats = {
  impressions: 0, avgDailyReach: 0, impressionsChange: 0,
  profileConversionRate: 0, profileVisits: 0, newFollowers: 0,
  conversionChange: 0, profileGrowth: 0, growthLast30: 0,
  trafficOrganic: 100, trafficPaid: 0,
  likes: 0, saves: 0, comments: 0,
  engagementRate: 0, bestReelViews: 0,
  chartData: [], interactionsData: [],
  viewsGoalPct: 0, followersGoalPct: 0,
}

export function HomeContent() {
  const [period, setPeriod]       = useState<Period>(30)
  const [dashStats, setDashStats] = useState<DashboardStats>(EMPTY_STATS)
  const [dashLoaded, setDashLoaded] = useState(false)
  const prefersReduced = useReducedMotion()

  const fadeUp = (i: number) => ({
    initial:    prefersReduced ? {} : { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0 },
    transition: prefersReduced ? {} : {
      delay: i * 0.08,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  })

  const [icpName, setIcpName] = useState<string>('')
  const [clientData, setClientData] = useState<{
    produccion: number; programado: number; ideasCount: number; loaded: boolean
  }>({ produccion: 0, programado: 0, ideasCount: 0, loaded: false })
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [globalLoaded, setGlobalLoaded] = useState(false)

  // Fetch dashboard stats (real UserReel + AccountSnapshot data)
  // Note: setDashLoaded(false) is called by the period change handler, not inside
  // the effect, to avoid the setState-in-effect lint rule.
  const fetchDashStats = useCallback((p: Period) => {
    fetch(`/api/me/dashboard-stats?period=${p}`)
      .then((r) => r.ok ? r.json() as Promise<DashboardStats> : null)
      .then((data) => { if (data) setDashStats(data) })
      .catch(() => {})
      .finally(() => setDashLoaded(true))
  }, [])

  useEffect(() => {
    fetch('/api/bases/icp')
      .then((r) => r.ok ? r.json() : null)
      .then((row) => {
        if (row?.nombre && typeof row.nombre === 'string') setIcpName(row.nombre.trim())
      })
      .catch(() => {})

    fetch('/api/me/global-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => {
        if (row && typeof row === 'object' && 'followers' in row) setGlobalStats(row as GlobalStats)
      })
      .catch(() => {})
      .finally(() => setGlobalLoaded(true))

    const loadContentStats = async () => {
      let produccion = 0, programado = 0, ideasCount = 0
      try {
        const res = await fetch('/api/content')
        if (res.ok) {
          const data = await res.json() as { items: { status: string }[] }
          produccion = data.items.filter((i) => i.status === 'en-proceso').length
          programado = data.items.filter((i) => i.status === 'programado').length
        }
      } catch {}
      try {
        const res = await fetch('/api/ideas')
        if (res.ok) {
          const data = await res.json() as { ideas: unknown[] }
          ideasCount = data.ideas?.length ?? 0
        }
      } catch {}
      setClientData({ produccion, programado, ideasCount, loaded: true })
    }

    loadContentStats()
  }, [])

  useEffect(() => {
    fetchDashStats(period)
  }, [period, fetchDashStats])

  const hasRealData = dashLoaded && (dashStats.impressions > 0 || dashStats.likes > 0)

  return (
    <div className="page-shell flex flex-col gap-7" style={{ minHeight: '100%' }}>
      <motion.div {...fadeUp(0)}>
        <GreetingBlock
          pipelineProduccion={clientData.produccion}
          pipelineProgramado={clientData.programado}
          ideasCount={clientData.ideasCount}
          loaded={clientData.loaded}
          name={icpName || undefined}
        />
      </motion.div>

      {/* Real global stats (aggregated from AccountSnapshot) */}
      {!globalLoaded ? (
        <motion.div {...fadeUp(1)}>
          <p className="text-eyebrow mb-3">Tus métricas reales</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="rounded-xl" style={{ height: 86, animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </motion.div>
      ) : globalStats ? (
        <motion.div {...fadeUp(1)}>
          <p className="text-eyebrow mb-3">Tus métricas reales</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RealStatTile icon={<Users size={14} />}  label="Seguidores"          value={formatK(globalStats.followers)} />
            <RealStatTile icon={<Eye size={14} />}    label="Vistas (período)"    value={formatK(globalStats.views)} />
            <RealStatTile icon={<Heart size={14} />}  label="Engagement rate"     value={formatPercent(globalStats.engagementRate)} />
          </div>
        </motion.div>
      ) : null}

      {/* Period selector */}
      <motion.div {...fadeUp(2)} className="flex items-center justify-between">
        <p className="text-eyebrow">Rendimiento Instagram</p>
        <div className="relative flex items-center gap-1 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setDashLoaded(false); setPeriod(value) }}
              className="relative text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer z-10"
              style={{
                color: period === value ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                transition: 'color 150ms ease',
              }}
            >
              {period === value && (
                <motion.div
                  layoutId="period-tab-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: 'var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats grid */}
      {!dashLoaded ? (
        <motion.div {...fadeUp(3)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="rounded-2xl h-28" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div {...fadeUp(3)}>
          {hasRealData
            ? <StatGrid stats={dashStats} />
            : <NoDataState />}
        </motion.div>
      )}

      {/* Charts + sidebar */}
      {hasRealData && (
        <motion.div {...fadeUp(4)} className="flex flex-col xl:flex-row gap-6" style={{ alignItems: 'stretch' }}>
          <PerformanceCharts stats={dashStats} />
          <QuickSummarySidebar stats={dashStats} />
        </motion.div>
      )}
    </div>
  )
}

function RealStatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--muted-foreground)' }}>
        {icon}
        <p className="text-xs tracking-wide uppercase">{label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
    </div>
  )
}

function NoDataState() {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Sin datos para este período</p>
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        Conectá tu cuenta de Instagram y hacé sync para ver el rendimiento real aquí.
      </p>
    </div>
  )
}
