'use client'

import { CLAUDE_MODELS, estimateClaudeCost } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'
import { formatCostUsd } from '@/lib/utils/cost-format'

interface ModelSelectorProps {
  value: ClaudeModelId
  onChange: (v: ClaudeModelId) => void
}

// Rough token estimate for cost indicator in the segmented control
const INDICATOR_INPUT_TOKENS = 1500
const INDICATOR_OUTPUT_TOKENS = 400

/**
 * Segmented control: Haiku / Sonnet / Opus.
 * Each button shows label, tagline, and a tiny cost estimate.
 * Active button gets var(--accent) tinted background.
 */
export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div
      className="flex gap-1 rounded-xl p-1"
      role="group"
      aria-label="Seleccionar modelo Claude"
      style={{
        backgroundColor: 'var(--muted)',
        border: '1px solid var(--border)',
      }}
    >
      {CLAUDE_MODELS.map((model) => {
        const isActive = model.id === value
        const cost = estimateClaudeCost(
          model.id as ClaudeModelId,
          INDICATOR_INPUT_TOKENS,
          INDICATOR_OUTPUT_TOKENS,
        )

        return (
          <button
            key={model.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(model.id as ClaudeModelId)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-center transition-all"
            style={{
              backgroundColor: isActive
                ? 'color-mix(in srgb, var(--accent) 18%, var(--card))'
                : 'transparent',
              border: isActive
                ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)'
                : '1px solid transparent',
              color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
            }}
          >
            <span className="text-xs font-semibold leading-tight">{model.label}</span>
            <span className="text-[10px] leading-tight opacity-75">{model.tagline}</span>
            <span
              className="mt-0.5 text-[10px] font-medium"
              style={{ color: isActive ? 'var(--accent)' : 'var(--muted-foreground)' }}
            >
              ~{formatCostUsd(cost)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
