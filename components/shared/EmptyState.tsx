'use client'

import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  emoji?: string
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, emoji, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon ? (
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--muted)' }}
        >
          <Icon size={22} style={{ color: 'var(--muted-foreground)' }} />
        </div>
      ) : emoji ? (
        <span className="text-4xl mb-4">{emoji}</span>
      ) : null}
      <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>{title}</p>
      {description && (
        <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          {description}
        </p>
      )}
    </div>
  )
}
