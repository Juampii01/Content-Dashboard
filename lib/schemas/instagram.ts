/**
 * Zod schemas for Instagram Graph API responses.
 *
 * These are intentionally permissive — the Graph API sometimes omits fields
 * on older media or on private/limited accounts, so most fields are optional
 * and we let the transformer decide what to do with missing values.
 */

import { z } from 'zod'

// ─── Media (a single post/reel/image from /{ig-user-id}/media) ────────────────

export const InstagramMediaSchema = z.object({
  id: z.string(),
  caption: z.string().optional(),
  media_type: z.enum(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REELS']).optional(),
  media_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  permalink: z.string().url().optional(),
  timestamp: z.string().optional(),
  shortcode: z.string().optional(),
  like_count: z.number().int().nonnegative().optional(),
  comments_count: z.number().int().nonnegative().optional(),
})
export type InstagramMedia = z.infer<typeof InstagramMediaSchema>

export const InstagramMediaListSchema = z.object({
  data: z.array(InstagramMediaSchema),
  paging: z
    .object({
      cursors: z.object({ before: z.string().optional(), after: z.string().optional() }).optional(),
      next: z.string().optional(),
    })
    .optional(),
})

// ─── Account (from /{ig-user-id}?fields=...) ─────────────────────────────────

export const InstagramAccountSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  name: z.string().optional(),
  profile_picture_url: z.string().url().optional(),
  followers_count: z.number().int().nonnegative().optional(),
  follows_count: z.number().int().nonnegative().optional(),
  media_count: z.number().int().nonnegative().optional(),
})
export type InstagramAccount = z.infer<typeof InstagramAccountSchema>

// ─── Error envelope (Graph API) ──────────────────────────────────────────────

export const InstagramGraphErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.number().optional(),
    error_subcode: z.number().optional(),
    fbtrace_id: z.string().optional(),
  }),
})
export type InstagramGraphError = z.infer<typeof InstagramGraphErrorSchema>
