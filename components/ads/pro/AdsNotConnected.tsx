'use client'

import { BarChart2, TrendingUp, Target, Zap, Eye } from 'lucide-react'
import { META_BLUE, META_GRADIENT_CSS } from './ads-theme'

interface AdsNotConnectedProps {
  onConnect: () => void
}

const FEATURES = [
  {
    icon: Target,
    title: 'Campañas',
    desc: 'Visualiza todas tus campañas con métricas detalladas en tiempo real.',
  },
  {
    icon: TrendingUp,
    title: 'Performance',
    desc: 'Analiza CTR, CPC y ROAS para optimizar tu inversión publicitaria.',
  },
  {
    icon: Zap,
    title: 'ROAS',
    desc: 'Mide el retorno de tu inversión publicitaria por campaña y cuenta.',
  },
  {
    icon: Eye,
    title: 'Insights',
    desc: 'Descubre qué campañas funcionan mejor y dónde mejorar el rendimiento.',
  },
]

export function AdsNotConnected({ onConnect }: AdsNotConnectedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Hero section */}
      <div className="flex flex-col items-center text-center max-w-lg mb-10">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
          style={{ background: META_BLUE, boxShadow: `0 8px 24px ${META_BLUE}40` }}
        >
          <BarChart2 size={36} color="#fff" />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
          Meta Ads Manager
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          Conecta tu cuenta de Meta Ads para ver campañas, métricas de rendimiento y insights
          en un panel profesional al estilo Meta Business Suite.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-8">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${META_BLUE}15` }}
            >
              <Icon size={16} style={{ color: META_BLUE }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
              {title}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* Connect button */}
      <button
        type="button"
        onClick={onConnect}
        className={`${META_GRADIENT_CSS} px-8 py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 shadow-lg`}
        style={{ boxShadow: `0 4px 16px ${META_BLUE}40` }}
      >
        Conectar Meta Ads
      </button>
      <p className="text-xs mt-3" style={{ color: 'var(--muted-foreground)' }}>
        Necesitas permisos <code className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--muted)' }}>ads_read</code> en tu cuenta de Meta.
      </p>
    </div>
  )
}
