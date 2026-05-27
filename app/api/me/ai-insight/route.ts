/**
 * POST /api/me/ai-insight
 *
 * Generates a single actionable content strategy insight using Claude Haiku,
 * based on the active client's recent AccountSnapshot data, content pipeline,
 * and ideas count.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'

export const runtime = 'nodejs'
export const maxDuration = 120

export interface AIInsightResponse {
  insight: string | null
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<AIInsightResponse | { error: string }>> {
  try {
    const { clientId } = await requireActiveClient()

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const rl = await checkRateLimit(ip, 'ai-insight', 5, '60 s')
    if (rl !== null && !rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI no configurado' }, { status: 503 })
    }

    // Fetch latest 2 snapshots per platform
    const snapshots = await db.accountSnapshot.findMany({
      where: { clientId },
      orderBy: [{ platform: 'asc' }, { date: 'desc' }],
      distinct: ['platform'],
      take: 10,
      select: {
        platform: true,
        date: true,
        followers: true,
        totalViews: true,
        reach: true,
        engagementRate: true,
        profileVisits: true,
        newFollowers: true,
      },
    })

    if (snapshots.length === 0) {
      return NextResponse.json({ insight: null })
    }

    // Content pipeline counts
    let produccion = 0
    let programado = 0
    let ideasCount = 0
    try {
      ;[produccion, programado, ideasCount] = await Promise.all([
        db.contentPiece.count({ where: { clientId, status: 'en-proceso' } }),
        db.contentPiece.count({ where: { clientId, status: 'programado' } }),
        db.idea.count({ where: { clientId } }),
      ])
    } catch {
      // non-critical, continue with zeros
    }

    // Build context string
    const snapshotLines = snapshots
      .map(
        (s) =>
          `- ${s.platform}: ${s.followers} seguidores, ${s.totalViews} vistas, ${s.reach} alcance, ${s.engagementRate.toFixed(2)}% engagement, ${s.profileVisits} visitas al perfil, ${s.newFollowers} nuevos seguidores (${s.date.toISOString().slice(0, 10)})`
      )
      .join('\n')

    const context = `
Métricas por plataforma (última sincronización):
${snapshotLines}

Pipeline de contenido:
- En producción: ${produccion} piezas
- Programadas: ${programado} piezas
- Ideas guardadas: ${ideasCount}
`.trim()

    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Sos un estratega de contenido. Basándote en estos datos de la cuenta, da UN insight accionable concreto (máximo 3 oraciones) en español. Sé específico, no genérico.\n\nDatos:\n${context}`,
        },
      ],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    const insight = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : null

    return NextResponse.json({ insight })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[me/ai-insight/POST] error:', message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
