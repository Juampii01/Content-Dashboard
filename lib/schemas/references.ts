import { z } from 'zod'

const VALID_CATEGORIES = ['Hook', 'Estructura', 'CTA', 'Storytelling', 'Social Proof', 'Otro'] as const
const VALID_PLATFORMS  = ['IG', 'TT', 'YT', 'otro'] as const

export const CreateReferenceSchema = z.object({
  title:    z.string().min(1).max(200),
  category: z.enum(VALID_CATEGORIES),
  tags:     z.array(z.string().min(1).max(50)).max(10).default([]),
  url:      z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
  platform: z.enum(VALID_PLATFORMS).default('IG'),
  notes:    z.string().max(500).optional(),
})

export const DeleteReferenceSchema = z.object({
  id: z.string().min(1),
})

export type CreateReferenceInput = z.infer<typeof CreateReferenceSchema>
export { VALID_CATEGORIES, VALID_PLATFORMS }
