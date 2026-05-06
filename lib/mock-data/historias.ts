import type { Story } from '@/lib/types'

export const STORIES: Story[] = Array.from({ length: 20 }, (_, i) => ({
  id: `story-${String(i + 1).padStart(3, '0')}`,
  thumbnail: '',
  publishedAt: new Date(Date.now() - i * 2 * 86400000).toISOString().split('T')[0],
  reach: Math.round(800 + Math.random() * 4200),
  impressions: Math.round(1000 + Math.random() * 5500),
  replies: Math.round(Math.random() * 120),
  stickerTaps: Math.round(Math.random() * 380),
  exits: Math.round(50 + Math.random() * 350),
  completionRate: Math.round(45 + Math.random() * 40),
}))
