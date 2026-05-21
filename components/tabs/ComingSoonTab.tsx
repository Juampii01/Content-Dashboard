'use client'

import type { LucideIcon } from 'lucide-react'

interface ComingSoonTabProps {
  icon: LucideIcon
  title: string
  description: string
  features?: string[]
}

export function ComingSoonTab({ icon: Icon, title, description, features }: ComingSoonTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border))',
          color: 'var(--accent)',
        }}
      >
        <Icon size={28} />
      </div>

      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
        style={{
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          color: 'var(--accent)',
          border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
        Próximamente
      </div>

      <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
        {title}
      </h2>
      <p className="text-sm max-w-md mb-8" style={{ color: 'var(--muted-foreground)' }}>
        {description}
      </p>

      {features && features.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
          {features.map((f) => (
            <div
              key={f}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--muted-foreground)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: 'var(--accent)', opacity: 0.6 }}
              />
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
