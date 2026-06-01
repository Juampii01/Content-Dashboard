'use client'

import { PlayCircle, BarChart3, PlaySquare, Users, TrendingUp } from 'lucide-react'
import { useSocialConnection } from '@/hooks/useSocialConnection'
import { YT_GRADIENT_CSS, YT_RED } from './yt-theme'

const features = [
  {
    icon: BarChart3,
    title: 'Analytics del canal',
    desc: 'Suscriptores, vistas y crecimiento en tiempo real.',
  },
  {
    icon: PlaySquare,
    title: 'Videos con métricas',
    desc: 'Biblioteca completa con vistas, likes y comentarios.',
  },
  {
    icon: Users,
    title: 'Audiencia',
    desc: 'Conoce quién mira tu contenido y cómo crece.',
  },
  {
    icon: TrendingUp,
    title: 'Crecimiento',
    desc: 'Tendencias de suscriptores y vistas a lo largo del tiempo.',
  },
]

export function YTNotConnected() {
  const { connect, loading } = useSocialConnection('youtube')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16">
      {/* YouTube icon box */}
      <div className="relative mb-8">
        <div
          className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl ${YT_GRADIENT_CSS}`}
        >
          <PlayCircle className="w-12 h-12 text-white" />
        </div>
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-3xl blur-xl opacity-40 -z-10"
          style={{ background: YT_RED }}
        />
      </div>

      <h2 className="text-3xl font-bold text-foreground mb-2 text-center">
        Conectá tu canal de YouTube
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-10 text-sm leading-relaxed">
        Vinculá tu canal de YouTube para acceder a analytics del canal, biblioteca de videos con
        métricas detalladas y tendencias de crecimiento.
      </p>

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3 mb-10 w-full max-w-2xl">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 border border-border/50 text-center"
          >
            <Icon className="w-5 h-5" style={{ color: YT_RED }} />
            <span className="text-xs font-semibold text-foreground">{title}</span>
            <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
          </div>
        ))}
      </div>

      {/* Connect button */}
      <button
        onClick={connect}
        disabled={loading}
        className={`
          flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold text-sm
          shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl
          disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
          ${YT_GRADIENT_CSS}
        `}
      >
        <PlayCircle className="w-4 h-4" />
        {loading ? 'Conectando…' : 'Conectar YouTube'}
      </button>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Solo lectura — nunca publicamos en tu nombre sin permiso.
      </p>
    </div>
  )
}
