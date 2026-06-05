'use client'

import { Eye, ThumbsUp, MessageCircle, TrendingUp, Clock, Gauge, MousePointerClick, Timer, Calendar, Target, BarChart3, Flame } from 'lucide-react'
import type { YouTubeVideoRow } from '@/hooks/useYouTubeData'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function fmt(n: number): string {
  if (!isFinite(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}
const pct = (n: number) => (isFinite(n) ? n : 0).toFixed(1) + '%'

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0
}

function Card({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: accent ?? 'var(--muted-foreground)' }} />
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      </div>
      <div className="text-xl font-bold text-[var(--foreground)] tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{sub}</div>}
    </div>
  )
}

export function YTMetricsGrid({ videos }: { videos: YouTubeVideoRow[] }) {
  if (!videos.length) return null
  const n = videos.length

  const views = videos.map((v) => v.viewsCount)
  const totalViews = views.reduce((s, v) => s + v, 0)
  const totalLikes = videos.reduce((s, v) => s + v.likesCount, 0)
  const totalComments = videos.reduce((s, v) => s + v.commentsCount, 0)
  const avgViews = totalViews / n
  const sorted = [...views].sort((a, b) => a - b)
  const median = sorted[Math.floor(n / 2)] ?? 0
  const maxViews = Math.max(...views)

  const engRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0
  const likeRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0

  // Métricas premium de YouTube (pueden venir null si falta el scope de Analytics)
  const retentionVals = videos.map((v) => v.averageViewPercent).filter((x): x is number => x != null)
  const ctrVals = videos.map((v) => v.ctr).filter((x): x is number => x != null)
  const avgDurVals = videos.map((v) => v.averageViewDuration).filter((x): x is number => x != null)
  const watchVals = videos.map((v) => v.watchTimeMinutes).filter((x): x is number => x != null)
  const totalWatch = watchVals.reduce((s, w) => s + w, 0)

  const now = Date.now()
  const last30 = videos.filter((v) => v.publishedAt && now - new Date(v.publishedAt).getTime() < 30 * 86_400_000).length

  const wd = Array.from({ length: 7 }, () => ({ eng: 0, count: 0 }))
  for (const v of videos) {
    if (v.publishedAt) {
      const d = new Date(v.publishedAt).getDay()
      wd[d].eng += v.likesCount + v.commentsCount
      wd[d].count++
    }
  }
  let bestDay = '—'
  let bestEng = -1
  wd.forEach((b, i) => {
    if (b.count > 0 && b.eng / b.count > bestEng) {
      bestEng = b.eng / b.count
      bestDay = WEEKDAYS[i]
    }
  })

  const cards: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: string }[] = [
    { icon: Eye, label: 'Views promedio', value: fmt(avgViews), sub: 'por video', accent: '#FF0000' },
    { icon: BarChart3, label: 'Views mediana', value: fmt(median), sub: 'el video típico' },
    { icon: TrendingUp, label: 'Mejor video', value: fmt(maxViews), sub: avgViews > 0 ? `${Math.round((maxViews / avgViews - 1) * 100)}% sobre prom.` : undefined, accent: '#FF0000' },
    { icon: ThumbsUp, label: 'Likes promedio', value: fmt(avg(videos.map((v) => v.likesCount))), sub: `${pct(likeRate)} de views` },
    { icon: MessageCircle, label: 'Comentarios prom.', value: fmt(avg(videos.map((v) => v.commentsCount))) },
    { icon: Flame, label: 'Engagement', value: pct(engRate), sub: 'interacciones / views', accent: '#833AB4' },
    { icon: Gauge, label: 'Retención prom.', value: retentionVals.length ? pct(avg(retentionVals)) : 'n/d', sub: retentionVals.length ? '% del video visto' : 'requiere Analytics', accent: '#16a34a' },
    { icon: MousePointerClick, label: 'CTR miniatura', value: ctrVals.length ? pct(avg(ctrVals)) : 'n/d', sub: ctrVals.length ? 'clicks / impresiones' : 'requiere Analytics', accent: '#2563eb' },
    { icon: Clock, label: 'Watch time', value: totalWatch ? fmt(totalWatch) + ' min' : 'n/d', sub: totalWatch ? 'minutos totales' : 'requiere Analytics' },
    { icon: Timer, label: 'Duración vista prom.', value: avgDurVals.length ? Math.round(avg(avgDurVals)) + 's' : 'n/d', sub: avgDurVals.length ? 'promedio por sesión' : 'requiere Analytics' },
    { icon: Calendar, label: 'Cadencia', value: String(last30), sub: 'videos (últimos 30 días)' },
    { icon: Target, label: 'Mejor día', value: bestDay, sub: 'el de mayor engagement' },
  ]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
        <Flame size={15} className="text-[var(--muted-foreground)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Métricas detalladas</span>
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">sobre {n} videos</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {cards.map((c, i) => (
          <Card key={i} {...c} />
        ))}
      </div>
    </div>
  )
}
