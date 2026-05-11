/**
 * Zod schemas for `/api/discovery` (POST).
 *
 * The form has 40 free-text questions. We accept an open map of
 * `string → string` rather than locking each key — that keeps the route
 * forward-compatible if questions are added/renumbered on the client.
 */
import { z } from 'zod'

const ANSWER_MAX = 10_000
const QUESTION_COUNT_MAX = 200 // safety: more than enough vs. the 40 we ship

export const DiscoverySubmitSchema = z.object({
  answers: z
    .record(z.string().min(1), z.string().max(ANSWER_MAX))
    .refine((rec) => Object.keys(rec).length <= QUESTION_COUNT_MAX, {
      message: `answers must have at most ${QUESTION_COUNT_MAX} keys`,
    }),
})

export type DiscoverySubmitRequest = z.infer<typeof DiscoverySubmitSchema>
