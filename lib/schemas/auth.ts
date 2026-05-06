import { z } from 'zod'

export const NotifySignupSchema = z.object({
  email: z.string().email().max(320),
  userId: z.string().min(1).max(128).optional(),
})

export type NotifySignupRequest = z.infer<typeof NotifySignupSchema>
