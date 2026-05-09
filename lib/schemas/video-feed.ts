/**
 * Zod schemas for /api/video-feed.
 */
import { z } from 'zod'

export const ConnectFeedSchema = z.object({
  channelUrl: z.string().trim().min(1).max(2048),
})
export type ConnectFeedRequest = z.infer<typeof ConnectFeedSchema>
