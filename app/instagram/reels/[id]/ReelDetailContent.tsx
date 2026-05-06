'use client'

import Link from 'next/link'
import { ArrowLeft, ExternalLink, Clock } from 'lucide-react'
import type { ReelDetail } from '@/lib/types'
import { MetricBadge } from '@/components/shared/MetricBadge'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { AskEternityButton } from '@/components/shared/AskEternityButton'

interface Props { reel: ReelDetail }

export function ReelDetailContent({ reel }: Props) {
  const metrics = [
    { label: 'Likes', value: formatK(reel.likes), pct: `${((reel.likes / reel.views) * 100).toFixed(2)}% de views`, cmp: reel.likesVsAvg > 0 ? `${reel.likesVsAvg}% más alto` : `${Math.abs(reel.likesVsAvg)}% más bajo`, up: reel.likesVsAvg > 0 },
    { label: 'Saves', value: formatK(reel.saves), pct: `${((reel.saves / reel.views) * 100).toFixed(2)}% de views`, cmp: reel.savesVsAvg > 0 ? `${reel.savesVsAvg}% más alto` : `${Math.abs(reel.savesVsAvg)}% más bajo`, up: reel.savesVsAvg > 0 },
    { label: 'Shares', value: formatK(reel.shares), pct: `${((reel.shares / reel.views) * 100).toFixed(2)}% de views`, cmp: reel.sharesVsAvg > 0 ? `${reel.sharesVsAvg}% más alto` : `${Math.abs(reel.sharesVsAvg)}% más bajo`, up: reel.sharesVsAvg > 0 },
    { label: 'Comments', value: formatK(reel.comments), pct: `${((reel.comments / reel.views) * 100).toFixed(2)}% de views`, cmp: reel.commentsVsAvg > 0 ? `${reel.commentsVsAvg}% más alto` : `${Math.abs(reel.commentsVsAvg)}% más bajo`, up: reel.commentsVsAvg > 0 },
  ]

  const benchmarkData = [
    { label: 'Likes', reel: (reel.likes / reel.views) * 100, benchmark: reel.benchmarkLikes },
    { label: 'Saves', reel: (reel.saves / reel.views) * 100, benchmark: reel.benchmarkSaves },
    { label: 'Comments', reel: (reel.comments / reel.views) * 100, benchmark: reel.benchmarkComments },
    { label: 'Shares', reel: (reel.shares / reel.views) * 100, benchmark: reel.benchmarkShares },
  ]

  const interactionVsAvg = [
    { label: 'Likes', actual: (reel.likes / reel.views) * 100, avg: reel.benchmarkLikes, count: reel.likes, diff: reel.likesVsAvg },
    { label: 'Saves', actual: (reel.saves / reel.views) * 100, avg: reel.benchmarkSaves, count: reel.saves, diff: reel.savesVsAvg },
    { label: 'Comments', actual: (reel.comments / reel.views) * 100, avg: reel.benchmarkComments, count: reel.comments, diff: reel.commentsVsAvg },
    { label: 'Shares', actual: (reel.shares / reel.views) * 100, avg: reel.benchmarkShares, count: reel.shares, diff: reel.sharesVsAvg },
  ]
  const maxBar = Math.max(...interactionVsAvg.map(d => d.actual))

  return (
    <div className="px-8 py-6 relative">
      {/* Back */}
      <Link href="/instagram?tab=reels" className="flex items-center gap-2 text-sm mb-6 hover:opacity-80 w-fit"
        style={{ color: 'var(--muted-foreground)' }}>
        <ArrowLeft size={15} /> Volver a Reels
      </Link>

      {/* Layout: 30/70 */}
      <div className="flex gap-6 mb-8">
        {/* Left: thumbnail */}
        <div className="w-72 flex-shrink-0">
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="relative flex items-center justify-center" style={{ height: 360, backgroundColor: 'var(--muted)' }}>
              <span className="text-6xl">🎬</span>
              <div className="absolute top-3 left-3">
                <MetricBadge multiplier={reel.multiplier} isAd={reel.isAd} />
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs" style={{ color: 'var(--foreground)' }}>
                <Clock size={12} />{reel.duration}
              </div>
              <button className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 80%, transparent)' }}>
                  <span className="text-white text-2xl ml-1">▶</span>
                </div>
              </button>
            </div>
            <div className="p-3">
              <button className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm hover:opacity-80"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                <ExternalLink size={13} /> Abrir en Instagram
              </button>
            </div>
          </div>
        </div>

        {/* Right: meta + metrics */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Header */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              {reel.isAd
                ? <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent-foreground)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>Promocionado</span>
                : <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>Orgánico</span>
              }
            </div>
            <p className="text-lg font-semibold leading-snug mb-1" style={{ color: 'var(--foreground)' }}>{reel.caption}</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Publicado: {new Date(reel.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* 4 metric cards */}
          <div className="grid grid-cols-4 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--muted-foreground)' }}>{m.pct}</p>
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: m.up ? '#8A7A4A' : '#A63A4B' }}>{m.cmp}</p>
              </div>
            ))}
          </div>

          {/* Evolución de views */}
          <div className="rounded-xl p-5 flex-1" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: 'var(--foreground)' }}>
              👁 Evolución de Views
            </p>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reel.viewsEvolution} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradEvo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: unknown) => [formatK(v as number), 'Views']}
                  />
                  <Area type="monotone" dataKey="cumulative" stroke="var(--accent)" strokeWidth={2} fill="url(#gradEvo)" name="cumulative" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Extendidas */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--foreground)' }}>
            ↗ Métricas Extendidas
          </p>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {[
              { label: 'Views Org', value: formatK(reel.viewsOrg), color: 'var(--accent)' },
              { label: 'Views Total', value: formatK(reel.viewsTotal), color: 'var(--foreground)' },
              { label: 'Reach Org', value: formatK(reel.reachOrg), color: '#B08A4A' },
              { label: 'Reach Total', value: formatK(reel.reachTotal), color: 'var(--foreground)' },
              { label: 'Interacciones', value: formatK(reel.interactions), color: '#B08A4A' },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-2 text-center" style={{ backgroundColor: 'var(--muted)' }}>
                <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {[
              { label: 'Watch Total', value: reel.watchTotal, color: 'var(--accent)' },
              { label: 'Views Paid', value: formatK(reel.viewsPaidDetail), color: '#B08A4A' },
              { label: 'Reach Paid', value: formatK(reel.reachPaid), color: 'var(--foreground)' },
              { label: 'Impr Paid', value: formatK(reel.imprPaid), color: 'var(--foreground)' },
              { label: '', value: '', color: 'transparent' },
            ].map((m, i) => (
              <div key={i} className="rounded-lg p-2 text-center" style={{ backgroundColor: m.label ? 'var(--muted)' : 'transparent' }}>
                {m.label && <>
                  <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
                </>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Watch Prom', value: reel.watchProm },
              { label: 'Engagement', value: formatPercent(reel.engagement) },
              { label: 'Retención', value: formatPercent(reel.retention) },
              { label: 'Saves/Views', value: formatPercent(reel.savesViews) },
              { label: 'CTR Pago', value: formatPercent(reel.ctrPago) },
              { label: 'CPV', value: reel.cpv.toFixed(2) },
              { label: 'CPM', value: reel.cpm.toFixed(2) },
              { label: 'Spend', value: `$${reel.spend}` },
            ].map(m => (
              <div key={m.label} className="p-2 rounded text-[11px]" style={{ backgroundColor: 'var(--muted)' }}>
                <p style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
                <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Interacciones vs Benchmark */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Interacciones vs Benchmark</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarkData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                <ReferenceLine stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1} />
                <Bar dataKey="reel" name="Reel" radius={[4, 4, 0, 0]} fill="var(--accent)" />
                <Bar dataKey="benchmark" name="Benchmark" radius={[4, 4, 0, 0]} fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row: 3 panels */}
      <div className="grid grid-cols-3 gap-6">

        {/* Volumen absoluto */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Volumen absoluto y ratios claros</p>
          <p className="text-[11px] mb-4" style={{ color: 'var(--muted-foreground)' }}>Acá no hay barras sin base: arriba ves valores absolutos y abajo barras del tipo x de y.</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Views totales', value: formatK(reel.viewsTotal), color: 'var(--foreground)' },
              { label: 'Reach total', value: formatK(reel.reachTotal), color: '#B08A4A' },
              { label: 'Interacciones', value: formatK(reel.interactions), color: '#B08A4A' },
              { label: 'Watch time prom.', value: reel.watchProm, color: 'var(--accent)' },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--muted)' }}>
                <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[
              { label: 'Interacciones / Views', val: formatPercent((reel.interactions / reel.views) * 100), pct: (reel.interactions / reel.views) * 100, sub: `${formatK(reel.interactions)} de ${formatK(reel.views)}`, note: 'engagement bruto observado' },
              { label: 'Saves / Views', val: formatPercent((reel.saves / reel.views) * 100), pct: (reel.saves / reel.views) * 100, sub: '', note: '' },
            ].map(r => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--foreground)' }}>{r.label}</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{r.val}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(r.pct * 20, 100)}%`, backgroundColor: 'var(--accent)' }} />
                </div>
                {r.sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{r.sub} · {r.note}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Interacción vs promedio 90d */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Interacción sobre views vs promedio 90d</p>
          <p className="text-[11px] mb-4" style={{ color: 'var(--muted-foreground)' }}>Cada fila compara el porcentaje actual sobre views totales del Reel contra el benchmark de los últimos 90 días.</p>
          <div className="space-y-4">
            {interactionVsAvg.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--foreground)' }}>{item.label}</span>
                  <span className="font-bold" style={{ color: 'var(--foreground)' }}>{formatK(item.count)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min((item.actual / maxBar) * 100, 100)}%`, backgroundColor: item.diff > 0 ? '#8A7A4A' : '#A63A4B' }} />
                </div>
                <div className="flex items-center justify-between text-[10px] mt-0.5">
                  <span style={{ color: 'var(--muted-foreground)' }}>Actual {item.actual.toFixed(2)}%</span>
                  <span style={{ color: item.diff > 0 ? '#8A7A4A' : '#A63A4B' }}>
                    {item.diff > 0 ? `${item.diff}% más alto` : `${Math.abs(item.diff)}% más bajo`}
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Promedio 90d: {item.avg.toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Retención estimada */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Retención estimada</p>
          <p className="text-[11px] mb-4" style={{ color: 'var(--muted-foreground)' }}>Calculado con avg watch time (Meta) + duración. No es curva real por segundo.</p>
          <div className="space-y-3 mb-4">
            {[
              { label: 'Inicio del Reel', pct: 100, color: '#B08A4A' },
              { label: 'Viewer promedio llega hasta', pct: reel.retentionEstimated, color: 'var(--accent)', sub: `${reel.watchProm} de ${reel.duration}` },
              { label: 'Retención estimada', pct: reel.retentionEstimated, color: 'var(--accent)', sub: `${reel.retentionEstimated}% del Reel visto en promedio` },
            ].map(r => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--foreground)' }}>{r.label}</span>
                  <span className="font-bold" style={{ color: 'var(--foreground)' }}>{r.pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--accent)' }}>
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                </div>
                {r.sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{r.sub}</p>}
              </div>
            ))}
          </div>

          {/* Views por día */}
          <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: 'var(--muted)' }}>
            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>VIEWS POR DÍA DE SEMANA</p>
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={reel.viewsByDay}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="day" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <Radar dataKey="views" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} strokeWidth={1.5} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--muted-foreground)' }}>
              DÍA CON MÁS VIEWS: <span style={{ color: 'var(--foreground)' }}>{reel.bestDay} – {reel.bestDayViews.toLocaleString()} views</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Retención', value: formatPercent(reel.retention) },
              { label: 'Watch Time Prom.', value: reel.watchProm },
              { label: 'Duración', value: reel.duration },
              { label: 'Abandono prom.', value: `${reel.abandonSeconds}s` },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-2 text-xs" style={{ backgroundColor: 'var(--muted)' }}>
                <p style={{ color: 'var(--muted-foreground)' }}>{m.label}</p>
                <p className="font-bold" style={{ color: 'var(--foreground)' }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AskEternityButton />
    </div>
  )
}
