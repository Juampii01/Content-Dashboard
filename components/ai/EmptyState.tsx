'use client'

import { Bot } from 'lucide-react'

const SUGGESTIONS = [
  'Analizá mis últimos reels y decime qué patrón ves',
  '¿Cómo viene mi rendimiento este mes?',
  'Dame ideas de hooks basadas en lo que mejor me funciona',
  '¿Cuál es mi diferenciador principal vs la competencia?',
]

interface EmptyStateProps {
  onPickSuggestion: (text: string) => void
}

export function EmptyState({ onPickSuggestion }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--accent) 15%, var(--card))',
          border: '1px solid var(--border)',
        }}
      >
        <Bot size={40} style={{ color: 'var(--accent)' }} />
      </div>

      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ color: 'var(--foreground)' }}
      >
        Eternity AI
      </h1>
      <p
        className="mt-1 max-w-md text-center text-sm"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Tu consultor de marketing con acceso a toda la data de tu workspace.
      </p>

      <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPickSuggestion(s)}
            className="rounded-xl px-4 py-4 text-left text-sm transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
