import { z } from 'zod'

export const AnalyzeRequestSchema = z
  .object({
    caption: z.string().max(5000).optional(),
    transcript: z.string().max(10000).optional(),
    views: z.number().int().min(0).optional(),
    likes: z.number().int().min(0).optional(),
    comments: z.number().int().min(0).optional(),
  })
  .refine((data) => data.caption !== undefined || data.transcript !== undefined, {
    message: 'Se requiere caption o transcript',
    path: ['caption'],
  })

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>
