'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Period, DashboardStats } from '@/lib/types'
import { GreetingBlock } from './GreetingBlock'
import { StatGrid } from './StatGrid'
import { PerformanceCharts } from './PerformanceCharts'
import { QuickSummarySidebar } from './QuickSummarySidebar'
import type { UserReelRow } from '@/hooks/useInstagramData'
import type { InstagramAccountSummary } from '@/hooks/useInstagramData'

const PERIODS: { label: string; value: Period }[] = [
  { label: '7d',  value: 7  },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

export function HomeContent() {
  const [period, setPeriod] = useState<Period>(30)
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

  const [fetchError, setFetchError] = useState(false)
  const [icpName, setIcpName] = useState<string>('')
  const [clientData, setClientData] = useState<{
    produccion: number; programado: number; ideasCount: number; loaded: boolean
  }>({ produccion: 0, programado: 0, ideasCount: 0, loaded: false })

  const [snapshotData, setSnapshotData] = useState<{
    chartData: { date: string; impressions: number; reach: number }[]
    latestFollowers: number
    latestEngagementRate: number
    latestProfileVisits: number
    latestNewFollowers: number
    latestAvgDailyReach: number
    hasData: boolean
  } | null>(null)

  // Raw Instagram data — recomputed per-period via useMemo below
  const [igReels, setIgReels] = useState<UserReelRow[]>([])
  const [igSummary, setIgSummary] = useState<InstagramAccountSummary | null>(null)

  useEffect(() => {
    fetch('/api/bases/icp')
      .then((r) => r.ok ? r.json() : null)
      .then((row) => {
        if (row?.nombre && typeof row.nombre === 'string') setIcpName(row.nombre.trim())
      })
      .catch(() => {})

    const loadContentStats = async () => {
      let produccion = 0, programado = 0, ideasCount = 0
      try {
        const res = await fetch('/api/content')
        if (res.ok) {
          const data = await res.json() as { items: { status: string }[] }
          produccion = data.items.filter(i => i.status === 'en-proceso').length
          programado = data.items.filter(i => i.status === 'programado').length
        }
      } catch { setFetchError(true) }
      try {
        const res = await fetch('/api/ideas')
        if (res.ok) {
          const data = await res.json() as { ideas: unknown[] }
          ideasCount = data.ideas?.length ?? 0
        }
      } catch { setFetchError(true) }
      setClientData({ produccion, programado, ideasCount, loaded: true })
    }

    const loadIgStats = async () => {
      try {
        const [reelsRes, sumRes] = await Promise.all([
          fetch('/api/instagram/reels'),
          fetch('/api/instagram/account-summary'),
        ])
        const reels: UserReelRow[] = reelsRes.ok ? ((await reelsRes.json()) as { reels: UserReelRow[] }).reels ?? [] : []
        const summary: InstagramAccountSummary | null = sumRes.ok ? (await sumRes.json()) as InstagramAccountSummary : null
        if (!summary?.connected || summary?.tokenExpired) return
        setIgReels(reels)
        setIgSummary(summary)
      } catch { setFetchError(true) }
    }

    loadContentStats()
    loadIgStats()
  }, [])

  // Fetch snapshot history whenever period changes
  useEffect(() => {
    const loadSnapshotHistory = async () => {
      try {
        const res = await fetch(`/api/me/snapshot-history?days=${period}`)
        if (!res.ok) return
        const data = await res.json() as {
          chartData: { date: string; impressions: number; reach: number }[]
          latestFollowers: number
          latestEngagementRate: number
          latestProfileVisits: number
          latestNewFollowers: number
          latestAvgDailyReach: number
          hasData: boolean
        }
        setSnapshotData(data)
      } catch { setFetchError(true) }
    }
    loadSnapshotHistory()
  }, [period])

  // Recompute stats whenever the period selector changes
  const igReal = useMemo(() => {
    if (!igSummary?.connected || igSummary?.tokenExpired || igReels.length === 0) return null
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - period)
    const inPeriod = igReels.filter(r => r.publishedAt ? new Date(r.publishedAt) >= cutoff : true)
    if (inPeriod.length === 0) return { likes: 0, comments: 0, followers: igSummary?.latestSnapshot?.followers ?? null, bestReelViews: 0, hasData: true }
    const likes = inPeriod.reduce((s, r) => s + r.likesCount, 0)
    const comments = inPeriod.reduce((s, r) => s + r.commentsCount, 0)
    const bestReelViews = Math.max(...inPeriod.map(r => r.viewsCount))
    const followers = igSummary?.latestSnapshot?.followers ?? null
    return { likes, comments, followers, bestReelViews, hasData: true }
  }, [igReels, igSummary, period])

  // Build stats from real data only — fields not available from the API stay at 0
  const hasPartialReal = igReal?.hasData ?? false
  const s: DashboardStats = {
    // Snapshot-based metrics (aggregated across platforms via /api/me/snapshot-history)
    impressions: snapshotData?.hasData
      ? snapshotData.chartData.reduce((sum, p) => sum + p.impressions, 0)
      : 0,
    avgDailyReach: snapshotData?.latestAvgDailyReach ?? 0,
    impressionsChange: 0,
    profileConversionRate: 0,
    profileVisits: snapshotData?.latestProfileVisits ?? 0,
    newFollowers: snapshotData?.latestNewFollowers ?? 0,
    conversionChange: 0,
    saves: 0,
    trafficOrganic: 0,
    trafficPaid: 0,
    viewsGoalPct: 0,
    followersGoalPct: 0,
    chartData: snapshotData?.chartData ?? [],
    interactionsData: [],
    // Real data from synced UserReel rows, filtered by selected period
    likes: igReal?.likes ?? 0,
    comments: igReal?.comments ?? 0,
    bestReelViews: igReal?.bestReelViews ?? 0,
    profileGrowth: snapshotData?.latestFollowers ?? igReal?.followers ?? 0,
    growthLast30: snapshotData?.latestFollowers ?? igReal?.followers ?? 0,
    engagementRate: snapshotData?.latestEngagementRate ?? 0,
  }

  return (
    <div className="page-shell flex flex-col gap-7" style={{ minHeight: '100%' }}>
      {fetchError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          <span>&#9888;</span>
          No se pudieron cargar algunos datos. Reintentá en unos momentos.
        </div>
      )}
      <motion.div {...fadeUp(0)}>
        <GreetingBlock
          pipelineProduccion={clientData.produccion}
          pipelineProgramado={clientData.programado}
          ideasCount={clientData.ideasCount}
          loaded={clientData.loaded}
          name={icpName || undefined}
        />
      </motion.div>

      <motion.div {...fadeUp(1)} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-eyebrow">Rendimiento Instagram</p>
          {!hasPartialReal && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)',
                border: '1px dashed var(--border)',
              }}
            >
              Demo
            </span>
          )}
          {hasPartialReal && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
                color: 'var(--success)',
                border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
              }}
            >
              Datos reales
            </span>
          )}
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

      <motion.div {...fadeUp(2)}>
        <StatGrid stats={s} />
      </motion.div>

      <motion.div {...fadeUp(3)} className="flex flex-col xl:flex-row gap-6" style={{ alignItems: 'stretch' }}>
        <PerformanceCharts stats={s} />
        <QuickSummarySidebar stats={s} />
      </motion.div>
    </div>
  )
}
