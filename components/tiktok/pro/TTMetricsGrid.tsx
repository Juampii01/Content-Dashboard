'use client'

import { Eye, Heart, MessageCircle, Share2, TrendingUp, Zap, Calendar, Target, BarChart3, Flame, Activity } from 'lucide-react'
import type { TikTokVideoRow } from '@/hooks/useTikTokData'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function fmt(n: number): string {
  if (!isFinite(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}
const pct = (n: number) => (isFinite(n) ? n : 0).toFixed(1) + '%'

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

export function TTMetricsGrid({ videos }: { videos: TikTokVideoRow[] }) {
  if (!videos.length) return null
  const n = videos.length

  const views = videos.map((v) => v.viewCount)
  const totalViews = views.reduce((s, v) => s + v, 0)
  const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0)
  const totalComments = videos.reduce((s, v) => s + v.commentCount, 0)
  const totalShares = videos.reduce((s, v) => s + v.shareCount, 0)
  const avgViews = totalViews / n
  const sorted = [...views].sort((a, b) => a - b)
  const median = sorted[Math.floor(n / 2)] ?? 0
  const maxViews = Math.max(...views)

  const engRate = totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews) * 100 : 0
  const shareRate = totalViews > 0 ? (totalShares / totalViews) * 100 : 0
  const likeRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0

  const viral = videos.filter((v) => v.viewCount > avgViews * 1.5).length
  const viralPct = Math.round((viral / n) * 100)

  const now = Date.now()
  const last30 = videos.filter((v) => v.publishedAt && now - new Date(v.publishedAt).getTime() < 30 * 86_400_000).length

  const wd = Array.from({ length: 7 }, () => ({ eng: 0, count: 0 }))
  for (const v of videos) {
    if (v.publishedAt) {
      const d = new Date(v.publishedAt).getDay()
      wd[d].eng += v.likeCount + v.commentCount + v.shareCount
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
    { icon: Eye, label: 'Views promedio', value: fmt(avgViews), sub: 'por video', accent: '#25F4EE' },
    { icon: BarChart3, label: 'Views mediana', value: fmt(median), sub: 'el video típico' },
    { icon: TrendingUp, label: 'Mejor video', value: fmt(maxViews), sub: avgViews > 0 ? `${Math.round((maxViews / avgViews - 1) * 100)}% sobre prom.` : undefined, accent: '#FE2C55' },
    { icon: Heart, label: 'Likes promedio', value: fmt(totalLikes / n), sub: `${pct(likeRate)} de views`, accent: '#FE2C55' },
    { icon: MessageCircle, label: 'Comentarios prom.', value: fmt(totalComments / n) },
    { icon: Share2, label: 'Shares promedio', value: fmt(totalShares / n), sub: `${pct(shareRate)} de views`, accent: '#25F4EE' },
    { icon: Activity, label: 'Engagement', value: pct(engRate), sub: 'likes+coments+shares / views', accent: '#833AB4' },
    { icon: Zap, label: 'Videos virales', value: `${viralPct}%`, sub: `${viral} de ${n} superan 1.5× prom.`, accent: '#FCB045' },
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
