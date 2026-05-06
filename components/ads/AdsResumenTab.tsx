'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { DollarSign, Users, Eye, MousePointerClick, TrendingUp } from 'lucide-react'
import { ADS_KPIS, ADS_BY_PLATFORM } from '@/lib/mock-data/ads'
import { AdsKPICard } from './AdsKPICard'
import { formatK, formatPercent } from '@/lib/utils/formatters'

export function AdsResumenTab() {
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <AdsKPICard
          label="Gasto total"
          value={`$${formatK(ADS_KPIS.totalSpend)}`}
          change={ADS_KPIS.totalSpendChange}
          invertChange
          icon={<DollarSign size={16} />}
        />
        <AdsKPICard
          label="Alcance"
          value={formatK(ADS_KPIS.reach)}
          change={ADS_KPIS.reachChange}
          icon={<Users size={16} />}
        />
        <AdsKPICard
          label="Impresiones"
          value={formatK(ADS_KPIS.impressions)}
          change={ADS_KPIS.impressionsChange}
          icon={<Eye size={16} />}
        />
        <AdsKPICard
          label="CTR"
          value={formatPercent(ADS_KPIS.ctr)}
          change={ADS_KPIS.ctrChange}
          icon={<MousePointerClick size={16} />}
        />
        <AdsKPICard
          label="CPC"
          value={`$${ADS_KPIS.cpc.toFixed(2)}`}
          change={ADS_KPIS.cpcChange}
          invertChange
          icon={<DollarSign size={16} />}
        />
        <AdsKPICard
          label="ROAS"
          value={`×${ADS_KPIS.roas.toFixed(1)}`}
          change={ADS_KPIS.roasChange}
          icon={<TrendingUp size={16} />}
        />
      </div>

      {/* Platform comparison chart */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-4"
          style={{ color: 'var(--muted-foreground)' }}
        >
          COMPARATIVA POR PLATAFORMA
        </p>
        <div className="grid grid-cols-2 gap-6">
          {/* Spend bar chart */}
          <div>
            <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>Gasto publicitario ($)</p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ADS_BY_PLATFORM} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="platform"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${formatK(v as number)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v: unknown) => [`$${formatK(v as number)}`, 'Gasto']}
                  />
                  <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
                    {ADS_BY_PLATFORM.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? 'var(--accent)' : '#B08A4A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROAS comparison */}
          <div>
            <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>ROAS por plataforma</p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ADS_BY_PLATFORM} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="platform"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `×${v}`}
                    domain={[0, 6]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v: unknown) => [`×${(v as number).toFixed(1)}`, 'ROAS']}
                  />
                  <Bar dataKey="roas" radius={[4, 4, 0, 0]}>
                    {ADS_BY_PLATFORM.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? 'var(--accent)' : '#B08A4A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Platform summary rows */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          {ADS_BY_PLATFORM.map((p, i) => (
            <div
              key={p.platform}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: i === 0 ? 'var(--accent)' : '#B08A4A' }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {p.platform}
                </span>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div className="text-right">
                  <p style={{ color: 'var(--muted-foreground)' }}>Gasto</p>
                  <p className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                    ${formatK(p.spend)}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ color: 'var(--muted-foreground)' }}>Alcance</p>
                  <p className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                    {formatK(p.reach)}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ color: 'var(--muted-foreground)' }}>ROAS</p>
                  <p className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                    ×{p.roas.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
