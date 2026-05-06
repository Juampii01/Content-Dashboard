import { z } from 'zod'

const CopyTypeSchema = z.enum(['reels-virales', 'reels-nicho', 'anuncios', 'ideas'])

export const GenerateRequestSchema = z.object({
  type: CopyTypeSchema,
  categoria: z.string().max(200).optional(),
  tono: z.string().max(100).optional(),
  cantidad: z.number().int().min(1).max(20),
  icpContext: z.string().max(2000).optional(),
})

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
