import { z } from 'zod'

export const TikTokVideoSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  video_description: z.string().optional(),
  duration: z.number().optional(),
  cover_image_url: z.string().optional(),
  share_url: z.string().optional(),
  create_time: z.number().optional(), // unix timestamp
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  share_count: z.number().optional(),
  view_count: z.number().optional(),
})
export type TikTokVideo = z.infer<typeof TikTokVideoSchema>

export const TikTokVideoListResponseSchema = z.object({
  data: z
    .object({
      videos: z.array(TikTokVideoSchema).optional(),
      cursor: z.number().optional(),
      has_more: z.boolean().optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string().optional(),
    })
    .optional(),
})

export const TikTokUserInfoSchema = z.object({
  data: z
    .object({
      user: z
        .object({
          open_id: z.string().optional(),
          display_name: z.string().optional(),
          avatar_url: z.string().optional(),
          follower_count: z.number().optional(),
          following_count: z.number().optional(),
          likes_count: z.number().optional(),
          video_count: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string().optional(),
    })
    .optional(),
})

export const TikTokVideosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
})
