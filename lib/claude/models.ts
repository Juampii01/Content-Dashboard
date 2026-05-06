/**
 * Catálogo de modelos Claude disponibles en la feature Competidores.
 * Precios en USD por 1M tokens (fuente: console.anthropic.com — revisar anualmente).
 */

export interface ClaudeModelMeta {
  id: string
  label: string
  tagline: string
  inputPricePer1M: number
  outputPricePer1M: number
}

export const CLAUDE_MODELS = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Haiku 4.5',
    tagline: 'Rápido y económico',
    inputPricePer1M: 1.00,
    outputPricePer1M: 5.00,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    tagline: 'Balance (recomendado)',
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
  },
  {
    id: 'claude-opus-4-7',
    label: 'Opus 4.7',
    tagline: 'Máxima profundidad',
    inputPricePer1M: 15.00,
    outputPricePer1M: 75.00,
  },
] as const satisfies readonly ClaudeModelMeta[]

export type ClaudeModelId = (typeof CLAUDE_MODELS)[number]['id']

export const DEFAULT_MODEL: ClaudeModelId = 'claude-sonnet-4-6'

export function getModelMeta(id: ClaudeModelId): ClaudeModelMeta {
  const m = CLAUDE_MODELS.find((x) => x.id === id)
  if (!m) throw new Error(`Modelo Claude desconocido: ${id}`)
  return m
}

/** Estimación de coste en USD dado input/output tokens. */
export function estimateClaudeCost(
  id: ClaudeModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const m = getModelMeta(id)
  return (inputTokens / 1_000_000) * m.inputPricePer1M
       + (outputTokens / 1_000_000) * m.outputPricePer1M
}
