'use client'

import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Camera } from 'lucide-react'
import type { Period } from '@/lib/types'
import { GreetingBlock } from './GreetingBlock'
import { StatGrid } from './StatGrid'
import { PerformanceCharts } from './PerformanceCharts'
import { QuickSummarySidebar } from './QuickSummarySidebar'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { getDashboardStats } from '@/lib/mock-data/dashboard'
import Link from 'next/link'

const PERIODS: { label: string; value: Period }[] = [
  { label: '7d',  value: 7  },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

export function HomeContent() {
  const [period, setPeriod] = useState<Period>(30)
  const prefersReduced = useReducedMotion()
  const { hasRealData } = useInstagramDataContext()

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

  useEffect(() => {
    fetch('/api/bases/icp')
      .then((r) => r.ok ? r.json() : null)
      .then((row) => {
        if (row?.nombre && typeof row.nombre === 'string') {
          setIcpName(row.nombre.trim())
        }
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

  // Sección de rendimiento: solo muestra datos reales o estado vacío
  const s = hasRealData ? getDashboardStats(period) : null

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

      <motion.div {...fadeUp(1)} className="flex items-center justify-between">
        <p className="text-eyebrow">Rendimiento Instagram</p>
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

      {s ? (
        <>
          <motion.div {...fadeUp(2)}>
            <StatGrid stats={s} />
          </motion.div>
          <motion.div {...fadeUp(3)} className="flex flex-col xl:flex-row gap-6" style={{ alignItems: 'stretch' }}>
            <PerformanceCharts stats={s} />
            <QuickSummarySidebar stats={s} />
          </motion.div>
        </>
      ) : (
        <motion.div {...fadeUp(2)}>
          <div
            className="rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <Camera size={22} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                Sin datos de Instagram
              </p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Conectá tu cuenta y sincronizá para ver tu rendimiento aquí.
              </p>
            </div>
            <Link
              href="/instagram"
              className="text-xs font-semibold px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              Ir a Instagram →
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  )
}
