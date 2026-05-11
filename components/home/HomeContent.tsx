'use client'

import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { getDashboardStats } from '@/lib/mock-data/dashboard'
import type { Period } from '@/lib/types'
import { GreetingBlock } from './GreetingBlock'
import { StatGrid } from './StatGrid'
import { PerformanceCharts } from './PerformanceCharts'
import { QuickSummarySidebar } from './QuickSummarySidebar'
import { DemoDataPill } from '@/components/instagram/InstagramSyncBanner'
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

export function HomeContent() {
  const [period, setPeriod] = useState<Period>(30)
  const s = getDashboardStats(period)
  const prefersReduced = useReducedMotion()

  const fadeUp = (i: number) => ({
    initial: prefersReduced ? {} : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
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

  useEffect(() => {
    // Try to read creator name from ICP API
    fetch('/api/bases/icp')
      .then((r) => r.ok ? r.json() : null)
      .then((row) => {
        if (row?.nombre && typeof row.nombre === 'string') {
          setIcpName(row.nombre.trim())
        }
      })
      .catch(() => {})

    // Real aggregated stats across connected platforms.
    fetch('/api/me/global-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => {
        if (row && typeof row === 'object' && 'followers' in row) {
          setGlobalStats(row as GlobalStats)
        }
      })
      .catch(() => {})
      .finally(() => setGlobalLoaded(true))

    const loadContentStats = async () => {
      let produccion = 0, programado = 0, ideasCount = 0
      try {
        const res = await fetch('/api/content')
        if (res.ok) {
          const data = await res.json() as { items: { status: string }[] }
          produccion = data.items.filter(i => i.status === 'en-proceso').length
          programado = data.items.filter(i => i.status === 'programado').length
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

      {globalLoaded && globalStats && (
        <motion.div {...fadeUp(1)}>
          <p className="text-eyebrow mb-3">Tus métricas reales</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RealStatTile
              icon={<Users size={14} />}
              label="Seguidores"
              value={formatK(globalStats.followers)}
            />
            <RealStatTile
              icon={<Eye size={14} />}
              label="Vistas (últimas snapshots)"
              value={formatK(globalStats.views)}
            />
            <RealStatTile
              icon={<Heart size={14} />}
              label="Engagement rate"
              value={formatPercent(globalStats.engagementRate)}
            />
          </div>
        </motion.div>
      )}

      <motion.div {...fadeUp(2)} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-eyebrow">Rendimiento Instagram</p>
          <DemoDataPill />
        </div>
        <div className="relative flex items-center gap-1 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
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

      <motion.div {...fadeUp(3)}>
        <StatGrid stats={s} />
      </motion.div>

      <motion.div {...fadeUp(4)} className="flex flex-col xl:flex-row gap-6" style={{ alignItems: 'stretch' }}>
        <PerformanceCharts stats={s} />
        <QuickSummarySidebar stats={s} />
      </motion.div>
    </div>
  )
}

function RealStatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--muted-foreground)' }}>
        {icon}
        <p className="text-xs tracking-wide uppercase">{label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
        {value}
      </p>
    </div>
  )
}
