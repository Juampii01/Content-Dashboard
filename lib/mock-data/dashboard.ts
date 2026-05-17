import type { DashboardStats, Period } from '@/lib/types'

function generateChartData(days: number) {
  const data = []
  const base = new Date('2026-03-05')
  for (let i = 0; i < days; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const spike = i === Math.floor(days * 0.6) ? 3.2 : i === Math.floor(days * 0.75) ? 1.8 : 1
    data.push({
      date: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      impressions: Math.round((35000 + Math.random() * 30000) * spike),
      reach: Math.round((22000 + Math.random() * 15000) * spike),
    })
  }
  return data
}

function generateInteractionsData(days: number) {
  const data = []
  const base = new Date('2026-03-05')
  for (let i = 0; i < days; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const spike = i === Math.floor(days * 0.6) ? 2.8 : i === Math.floor(days * 0.75) ? 1.6 : 1
    data.push({
      date: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      likes:    Math.round((600  + Math.random() * 400)  * spike),
      saves:    Math.round((700  + Math.random() * 500)  * spike),
      comments: Math.round((300  + Math.random() * 200)  * spike),
    })
  }
  return data
}

const stats: Record<Period, DashboardStats> = {
  0: {
    impressions: 12000000, avgDailyReach: 45600, impressionsChange: 0,
    profileConversionRate: 18.5, profileVisits: 580000, newFollowers: 98400, conversionChange: 0,
    profileGrowth: 98400, growthLast30: 7900,
    trafficOrganic: 21, trafficPaid: 79,
    likes: 240000, saves: 270000, comments: 120000,
    engagementRate: 5.1, bestReelViews: 284000,
    viewsGoalPct: 100, followersGoalPct: 100,
    chartData: generateChartData(90),
    interactionsData: generateInteractionsData(90),
  },
  7: {
    impressions: 312000, avgDailyReach: 8200, impressionsChange: 12.1,
    profileConversionRate: 14.8, profileVisits: 10200, newFollowers: 1510, conversionChange: 18.2,
    profileGrowth: 5800, growthLast30: 1510,
    trafficOrganic: 22, trafficPaid: 78,
    likes: 5200, saves: 6100, comments: 2800,
    engagementRate: 4.2, bestReelViews: 284000,
    viewsGoalPct: 43, followersGoalPct: 29,
    chartData: generateChartData(7),
    interactionsData: generateInteractionsData(7),
  },
  14: {
    impressions: 680000, avgDailyReach: 16400, impressionsChange: 15.8,
    profileConversionRate: 15.9, profileVisits: 22000, newFollowers: 3500, conversionChange: 24.1,
    profileGrowth: 12100, growthLast30: 3500,
    trafficOrganic: 24, trafficPaid: 76,
    likes: 10800, saves: 13200, comments: 5900,
    engagementRate: 4.6, bestReelViews: 284000,
    viewsGoalPct: 57, followersGoalPct: 48,
    chartData: generateChartData(14),
    interactionsData: generateInteractionsData(14),
  },
  30: {
    impressions: 1400000, avgDailyReach: 29300, impressionsChange: 21.4,
    profileConversionRate: 17.2, profileVisits: 45800, newFollowers: 7900, conversionChange: 33.8,
    profileGrowth: 24800, growthLast30: 7900,
    trafficOrganic: 19, trafficPaid: 81,
    likes: 21500, saves: 22400, comments: 11100,
    engagementRate: 4.6, bestReelViews: 284000,
    viewsGoalPct: 72, followersGoalPct: 48,
    chartData: generateChartData(30),
    interactionsData: generateInteractionsData(30),
  },
  90: {
    impressions: 4100000, avgDailyReach: 45600, impressionsChange: 38.2,
    profileConversionRate: 18.5, profileVisits: 142000, newFollowers: 22400, conversionChange: 61.2,
    profileGrowth: 22400, growthLast30: 7900,
    trafficOrganic: 21, trafficPaid: 79,
    likes: 62000, saves: 68000, comments: 31000,
    engagementRate: 5.1, bestReelViews: 284000,
    viewsGoalPct: 89, followersGoalPct: 74,
    chartData: generateChartData(90),
    interactionsData: generateInteractionsData(90),
  },
}

export function getDashboardStats(period: Period): DashboardStats {
  return stats[period]
}
