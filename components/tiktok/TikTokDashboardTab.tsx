'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Users, Eye, Heart, MessageCircle, TrendingUp } from 'lucide-react'
import { getTikTokKPIs, getTikTokGrowthData } from '@/lib/mock-data/tiktok'
import { TikTokKPICard } from './TikTokKPICard'
import { formatK, formatPercent } from '@/lib/utils/formatters'
import { usePeriod } from '@/hooks/usePeriod'

export function TikTokDashboardTab() {
  const [period] = usePeriod()
  const kpis = getTikTokKPIs(period)
  const chartData = getTikTokGrowthData(period)

  // Compute X-axis tick interval so labels don't overlap
  const tickInterval = period <= 7 ? 0 : period <= 14 ? 1 : period <= 30 ? 4 : 13

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <TikTokKPICard
          label="Seguidores"
          value={formatK(kpis.followers)}
          change={kpis.followersChange}
          icon={<Users size={16} />}
        />
        <TikTokKPICard
          label="Vistas totales"
          value={formatK(kpis.totalViews)}
          change={kpis.totalViewsChange}
          icon={<Eye size={16} />}
        />
        <TikTokKPICard
          label="Likes"
          value={formatK(kpis.likes)}
          change={kpis.likesChange}
          icon={<Heart size={16} />}
        />
        <TikTokKPICard
          label="Comentarios"
          value={formatK(kpis.comments)}
          change={kpis.commentsChange}
          icon={<MessageCircle size={16} />}
        />
        <TikTokKPICard
          label="Tasa engagement"
          value={formatPercent(kpis.engagementRate)}
          change={kpis.engagementChange}
          icon={<TrendingUp size={16} />}
        />
      </div>

      {/* Growth chart */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              CRECIMIENTO ÚLTIMOS {period} DÍAS
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
              {formatK(kpis.followers)}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>seguidores totales</p>
          </div>
          <span className="text-sm font-semibold" style={{ color: '#8A7A4A' }}>
            ↗ +{kpis.followersChange}%
          </span>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ttFollowersGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="#B08A4A" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                yAxisId="followers"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatK}
              />
              <YAxis
                yAxisId="views"
                orientation="right"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatK}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--foreground)', fontSize: 12 }}
                formatter={(v: unknown, name: unknown) => [
                  formatK(v as number),
                  name === 'followers' ? 'Seguidores' : 'Vistas',
                ]}
              />
              <Line
                yAxisId="followers"
                type="monotone"
                dataKey="followers"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={false}
                name="followers"
              />
              <Line
                yAxisId="views"
                type="monotone"
                dataKey="views"
                stroke="#B08A4A"
                strokeWidth={1.5}
                dot={false}
                name="views"
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-6 mt-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: 'var(--accent)' }} />
            Seguidores
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span
              className="w-4 h-0.5 inline-block"
              style={{
                backgroundColor: '#B08A4A',
                backgroundImage: 'repeating-linear-gradient(90deg, #B08A4A 0, #B08A4A 4px, transparent 4px, transparent 6px)',
              }}
            />
            Vistas
          </div>
        </div>
      </div>
    </div>
  )
}
