'use client'

import { formatCostUsd } from '@/lib/utils/cost-format'

interface CostBadgeProps {
  usd: number
  label?: string
}

/**
 * Tiny inline cost badge: "~$0.0003" or "~$0.01 · Groq".
 * Formatting delegated to formatCostUsd from lib/utils/cost-format.
 */
export function CostBadge({ usd, label }: CostBadgeProps) {
  const formatted = formatCostUsd(usd)

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        color: 'var(--muted-foreground)',
        border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
      }}
    >
      ~{formatted}
      {label && (
        <>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>{label}</span>
        </>
      )}
    </span>
  )
}
