'use client'

import { CLAUDE_MODELS } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'

interface AIModelSelectorProps {
  value: ClaudeModelId
  onChange: (v: ClaudeModelId) => void
}

export function AIModelSelector({ value, onChange }: AIModelSelectorProps) {
  return (
    <div
      className="inline-flex gap-0.5 rounded-lg p-0.5"
      role="group"
      aria-label="Seleccionar modelo"
      style={{
        backgroundColor: 'var(--muted)',
        border: '1px solid var(--border)',
      }}
    >
      {CLAUDE_MODELS.map((m) => {
        const isActive = m.id === value
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(m.id as ClaudeModelId)}
            className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--card)' : 'transparent',
              color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
              border: isActive ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
