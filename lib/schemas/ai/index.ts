import { z } from 'zod'
import { CLAUDE_MODELS } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'

const claudeModelIds = CLAUDE_MODELS.map((m) => m.id) as [ClaudeModelId, ...ClaudeModelId[]]

// Contexto del workspace que el cliente envía con cada mensaje.
// Reels propios y bases de negocio viven en localStorage (cliente),
// por lo que se serializan y mandan en el body.
export const WorkspaceContextSchema = z.object({
  icp: z.string().max(8000).optional(),
  oferta: z.string().max(8000).optional(),
  problemas: z.array(z.string()).max(100).optional(),
  dolores: z.array(z.string()).max(100).optional(),
  deseos: z.array(z.string()).max(100).optional(),
  insights: z.array(z.string()).max(100).optional(),
  tareas: z
    .array(
      z.object({
        title: z.string().max(400),
        columnId: z.string().max(40),
        dueDate: z.string().max(40).optional(),
      }),
    )
    .max(200)
    .optional(),
  reels: z
    .array(
      z.object({
        title: z.string().max(400),
        caption: z.string().max(2000).optional(),
        publishedAt: z.string().max(40).optional(),
        views: z.number().int().nonnegative().optional(),
        likes: z.number().int().nonnegative().optional(),
        comments: z.number().int().nonnegative().optional(),
        saves: z.number().int().nonnegative().optional(),
        shares: z.number().int().nonnegative().optional(),
        multiplier: z.number().nonnegative().optional(),
        isAd: z.boolean().optional(),
      }),
    )
    .max(100)
    .optional(),
})

export const AIChatSchema = z.object({
  conversationId: z.string().min(1).max(60).optional(),
  content: z.string().min(1).max(6000),
  model: z.enum(claudeModelIds),
  context: WorkspaceContextSchema.optional(),
})

export type AIChatInput = z.infer<typeof AIChatSchema>
export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>
