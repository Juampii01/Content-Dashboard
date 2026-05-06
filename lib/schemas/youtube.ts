/**
 * Zod schemas for YouTube Data API v3 responses we consume.
 * Only the fields we actually read are declared; additional fields are allowed
 * and ignored by default.
 */

import { z } from 'zod'

// ─── channels.list ───────────────────────────────────────────────────────────

export const YTThumbnailSchema = z.object({
  url: z.string().url().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
}).partial()

export const YTThumbnailsSchema = z.object({
  default: YTThumbnailSchema.optional(),
  medium: YTThumbnailSchema.optional(),
  high: YTThumbnailSchema.optional(),
  standard: YTThumbnailSchema.optional(),
  maxres: YTThumbnailSchema.optional(),
}).partial()

export const YTChannelSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    thumbnails: YTThumbnailsSchema.optional(),
  }).optional(),
  statistics: z.object({
    viewCount: z.string().optional(),
    subscriberCount: z.string().optional(),
    hiddenSubscriberCount: z.boolean().optional(),
    videoCount: z.string().optional(),
  }).optional(),
  contentDetails: z.object({
    relatedPlaylists: z.object({
      uploads: z.string().optional(),
    }).optional(),
  }).optional(),
})

export const YTChannelListSchema = z.object({
  items: z.array(YTChannelSchema).optional(),
})

// ─── playlistItems.list ───────────────────────────────────────────────────────

export const YTPlaylistItemSchema = z.object({
  contentDetails: z.object({
    videoId: z.string(),
    videoPublishedAt: z.string().optional(),
  }).optional(),
})

export const YTPlaylistItemsListSchema = z.object({
  items: z.array(YTPlaylistItemSchema).optional(),
  nextPageToken: z.string().optional(),
})

// ─── videos.list ──────────────────────────────────────────────────────────────

export const YTVideoSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    publishedAt: z.string().optional(),
    channelId: z.string().optional(),
    thumbnails: YTThumbnailsSchema.optional(),
  }).optional(),
  statistics: z.object({
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    commentCount: z.string().optional(),
    favoriteCount: z.string().optional(),
  }).optional(),
  contentDetails: z.object({
    duration: z.string().optional(), // ISO-8601, e.g. "PT12M34S"
  }).optional(),
})

export const YTVideoListSchema = z.object({
  items: z.array(YTVideoSchema).optional(),
})

export type YTChannel = z.infer<typeof YTChannelSchema>
export type YTVideo = z.infer<typeof YTVideoSchema>

// ─── API route query-params ───────────────────────────────────────────────────

/**
 * GET /api/youtube/videos query params.
 * Coerces strings from URLSearchParams into a bounded integer; rejects invalid
 * input so downstream Prisma calls never receive NaN or absurd values.
 */
export const YouTubeVideosQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(100).optional(),
})

export type YouTubeVideosQuery = z.infer<typeof YouTubeVideosQuerySchema>
