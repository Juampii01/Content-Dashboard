/**
 * Zod schemas for `/api/transcript` (POST/DELETE).
 *
 * Ported from Smart-Scale's transcript flow but adapted to project conventions:
 * tenant scoping happens via `requireActiveClient()` (httpOnly cookie),
 * not body-passed `client_id`.
 */
import { z } from 'zod'

const URL_MAX = 2048

export const TranscribeRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'url is required')
    .max(URL_MAX)
    .refine(
      (v) => /^https?:\/\//i.test(v),
      'url must start with http:// or https://',
    ),
})

export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>

export const DeleteTranscriptSchema = z.object({
  id: z.string().min(1, 'id is required'),
})

export type DeleteTranscriptRequest = z.infer<typeof DeleteTranscriptSchema>
