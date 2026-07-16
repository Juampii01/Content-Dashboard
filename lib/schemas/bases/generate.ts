import { z } from 'zod'

export const BASES_GENERATE_FIELDS = [
  'dolores',
  'deseos',
  'problemas',
  'keywords',
  'oferta_promesa',
  'icp_creencias',
] as const

export const BasesGenerateSchema = z.object({
  field: z.enum(BASES_GENERATE_FIELDS),
  count: z.number().int().min(1).max(10).optional(),
})

export type BasesGenerateField = (typeof BASES_GENERATE_FIELDS)[number]
export type BasesGenerateRequest = z.infer<typeof BasesGenerateSchema>
