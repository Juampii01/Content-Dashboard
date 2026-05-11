/**
 * Zod schemas for `/api/discovery` (PATCH).
 * The form definition itself is fixed (40 questions, 9 blocks) so we only
 * validate incoming answers.
 */
import { z } from 'zod'
import { ALL_QUESTION_IDS } from '@/lib/discovery/questions'

// Cap per-answer length to prevent runaway JSONB rows. 10k is generous for
// long-form qualitative responses; the textarea client-side also enforces.
const ANSWER_MAX = 10_000

export const PatchDiscoverySchema = z.object({
  questionId: z
    .string()
    .min(1)
    .refine((v) => ALL_QUESTION_IDS.has(v), 'unknown questionId'),
  answer: z.string().max(ANSWER_MAX),
})

export type PatchDiscoveryRequest = z.infer<typeof PatchDiscoverySchema>
