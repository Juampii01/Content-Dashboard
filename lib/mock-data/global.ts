import type { GlobalStats } from '@/lib/types'
import type { Period } from '@/lib/types'

const stats: Record<Period, GlobalStats> = {
  7:  { views: 412000,   followers: 25200, engagementRate: 5.1 },
  14: { views: 890000,   followers: 25200, engagementRate: 4.8 },
  30: { views: 1700000,  followers: 25200, engagementRate: 4.6 },
  90: { views: 4200000,  followers: 25200, engagementRate: 4.3 },
}

export function getGlobalStats(period: Period): GlobalStats {
  return stats[period]
}
