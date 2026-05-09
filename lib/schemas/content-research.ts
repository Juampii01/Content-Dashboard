/**
 * Zod schemas for /api/content-research.
 */
import { z } from 'zod'

export const ResearchRequestSchema = z.object({
  channelUrl: z.string().trim().min(1).max(2048),
  timeframeDays: z.number().int().min(1).max(365).default(30).optional(),
})
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>

export const DeleteResearchSchema = z.object({
  id: z.string().min(1),
})
export type DeleteResearchRequest = z.infer<typeof DeleteResearchSchema>
