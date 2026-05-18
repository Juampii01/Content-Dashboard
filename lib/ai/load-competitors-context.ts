import { db } from '@/lib/db'
import type { CompetitorContext } from '@/lib/claude/chat-workspace'

const MAX_COMPETITORS = 10
const TOP_REELS_PER_COMPETITOR = 5
const RECENT_ANALYSES_PER_COMPETITOR = 5

/**
 * Carga desde Prisma los competidores del workspace con sus top reels
 * (por vistas) y análisis recientes para inyectar como contexto a Claude.
 */
export async function loadCompetitorsContext(clientId: string): Promise<CompetitorContext[]> {
  const competitors = await db.competitor.findMany({
    where: { clientId },
    take: MAX_COMPETITORS,
    orderBy: { createdAt: 'desc' },
    include: {
      reels: {
        take: TOP_REELS_PER_COMPETITOR,
        orderBy: { viewsCount: 'desc' },
        include: {
          analyses: {
            take: RECENT_ANALYSES_PER_COMPETITOR,
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  })

  return competitors.map((c) => ({
    username: c.username,
    displayName: c.displayName,
    followersCount: c.followersCount,
    topReels: c.reels.map((r) => ({
      caption: r.caption,
      viewsCount: r.viewsCount,
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
      postedAt: r.postedAt,
    })),
    recentAnalyses: c.reels.flatMap((r) => r.analyses).slice(0, RECENT_ANALYSES_PER_COMPETITOR),
  }))
}
