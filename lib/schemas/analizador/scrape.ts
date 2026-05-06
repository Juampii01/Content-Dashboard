import { z } from 'zod'

export const ScrapeRequestSchema = z.object({
  username: z.string().min(1).max(30),
  limit: z.number().int().min(1).max(50),
})

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>
