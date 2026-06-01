'use client'

import { Music2, BarChart3, Video, TrendingUp, RefreshCw, Zap } from 'lucide-react'
import { TT_GRADIENT_CSS, TT_TEAL, TT_PINK } from './tt-theme'

interface TTNotConnectedProps {
  onConnect: () => void
  loading?: boolean
}

const features = [
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Seguidores, vistas y engagement en tiempo real.',
  },
  {
    icon: Video,
    title: 'Videos',
    desc: 'Biblioteca completa con métricas por video.',
  },
  {
    icon: TrendingUp,
    title: 'Engagement',
    desc: 'Tasa de interacción y tendencias de crecimiento.',
  },
  {
    icon: RefreshCw,
    title: 'Sync',
    desc: 'Sincronización automática de los últimos 60 videos.',
  },
]

export function TTNotConnected({ onConnect, loading = false }: TTNotConnectedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16">
      {/* TikTok icon box */}
      <div className="relative mb-8">
        <div
          className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl ${TT_GRADIENT_CSS}`}
        >
          <Music2 className="w-12 h-12 text-white" />
        </div>
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-3xl blur-xl opacity-40 -z-10"
          style={{ background: `linear-gradient(135deg, ${TT_TEAL}, ${TT_PINK})` }}
        />
      </div>

      <h2 className="text-3xl font-bold text-foreground mb-2 text-center">
        Conecta tu TikTok
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-10 text-sm leading-relaxed">
        Vincula tu cuenta de TikTok para acceder a analytics avanzados, biblioteca de videos y
        métricas de engagement actualizadas.
      </p>

      {/* Feature cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 w-full max-w-2xl">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 border border-border/50 text-center"
          >
            <Icon className="w-5 h-5" style={{ color: TT_TEAL }} />
            <span className="text-xs font-semibold text-foreground">{title}</span>
            <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
          </div>
        ))}
      </div>

      {/* Connect button */}
      <button
        onClick={onConnect}
        disabled={loading}
        className={`
          flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold text-sm
          shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl
          disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
          ${TT_GRADIENT_CSS}
        `}
      >
        <Zap className="w-4 h-4" />
        {loading ? 'Conectando…' : 'Conectar TikTok'}
      </button>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Solo lectura — nunca publicamos en tu nombre sin permiso.
      </p>
    </div>
  )
}
