/**
 * Zod schemas para los endpoints de Competidores.
 * Los types derivan de aquí vía z.infer — pero los contratos “humanos” viven
 * en `lib/types/competidores.ts` para que los agentes de UI los lean sin Zod.
 */

import { z } from 'zod'
import { CLAUDE_MODELS } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'

const claudeModelIds = CLAUDE_MODELS.map((m) => m.id) as [ClaudeModelId, ...ClaudeModelId[]]

// Sanea "@ramiro.cubria" / "ramiro.cubria/" / "https://instagram.com/ramiro.cubria" → "ramiro.cubria"
export const usernameSchema = z
  .string()
  .min(1)
  .max(2048)
  .transform((s) => {
    const trimmed = s.trim()
    // Extract username from a pasted Instagram URL
    const urlMatch = trimmed.match(/(?:instagram\.com\/)([a-zA-Z0-9._]+)/)
    if (urlMatch) return urlMatch[1]
    // Strip leading @ and trailing /
    return trimmed.replace(/^@+/, '').replace(/\/+$/, '')
  })
  .refine((s) => /^[a-zA-Z0-9._]{1,30}$/.test(s), {
    message: 'Username de Instagram inválido',
  })

// POST /api/competitors
export const CreateCompetitorSchema = z.object({
  username: usernameSchema,
  limit: z.union([z.literal(10), z.literal(20), z.literal(30)]),
})

// POST /api/reels/[id]/analyze
export const AnalyzeSchema = z.object({
  model: z.enum(claudeModelIds),
})

// POST /api/reels/[id]/chat
export const ChatSchema = z.object({
  content: z.string().min(1).max(4000),
  model: z.enum(claudeModelIds),
})

// Type exports (para imports simétricos si hace falta)
export type CreateCompetitorInput = z.infer<typeof CreateCompetitorSchema>
export type AnalyzeInput = z.infer<typeof AnalyzeSchema>
export type ChatInput = z.infer<typeof ChatSchema>
