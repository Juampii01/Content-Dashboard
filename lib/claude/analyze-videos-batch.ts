/**
 * Claude Sonnet batch analyzer for deep "¿Por qué funcionó?" content insights.
 *
 * Used by /api/content-research and /api/video-feed: given a ranked list of
 * videos/posts, ask Sonnet to return a structured breakdown per item explaining
 * hook, engagement drivers, content pattern, and actionable replication tips.
 *
 * Adapted from Smart-Scale's `analyzeNewPosts`.
 */
import Anthropic from '@anthropic-ai/sdk'

export interface AnalyzableItem {
  id: string
  title: string
  views: number
  likes?: number
  comments?: number
  transcript?: string
}

export async function analyzeRankedItems(
  ownerName: string,
  items: AnalyzableItem[],
  maxItems = 15,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (!items.length) return result

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return result

  const ranked = [...items]
    .sort((a, b) => (b.views + (b.comments ?? 0)) - (a.views + (a.comments ?? 0)))
    .slice(0, maxItems)

  const list = ranked
    .map(
      (p, i) =>
        `${i + 1}. "${p.title.slice(0, 100)}" — ${p.views.toLocaleString()} views` +
        (p.comments ? `, ${p.comments.toLocaleString()} comentarios` : '') +
        (p.transcript
          ? `\nTranscript (${p.transcript.length} chars): ${p.transcript.slice(0, 400)}`
          : ''),
    )
    .join('\n')

  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [
        {
          role: 'user',
          content: `Sos un experto en estrategia de contenido en redes sociales. Analizá estos ${ranked.length} posts de "${ownerName}" y para cada uno explicá en profundidad por qué funcionó.

${list}

Para cada post, respondé con exactamente este formato (usá los emojis como marcadores):
🎣 HOOK: [cuál fue el gancho en 1 oración]
⚡ POR QUÉ FUNCIONÓ: [2-3 oraciones explicando los drivers de engagement: qué emoción generó, por qué el algoritmo lo amplificó, qué necesidad o curiosidad resolvió]
📐 PATRÓN: [estructura o formato de contenido utilizado, p.ej. "Tutorial paso a paso", "Storytelling personal", "Controversia controlada", "Antes/después", etc.]
🔁 QUÉ REPLICAR: [1-2 insights accionables concretos para replicar este éxito]

Respondé SOLO con un JSON array de ${ranked.length} strings, donde cada string contiene el análisis completo del post correspondiente usando exactamente el formato indicado. Sin markdown wrapper, sin texto antes ni después del JSON.`,
        },
      ],
    })

    const block = msg.content[0]
    if (!block || block.type !== 'text') return result
    const text = block.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(text) as unknown
    if (!Array.isArray(parsed)) return result

    ranked.forEach((it, i) => {
      const v = parsed[i]
      if (typeof v === 'string' && v.trim()) result.set(it.id, v.trim())
    })
    return result
  } catch {
    return result
  }
}
