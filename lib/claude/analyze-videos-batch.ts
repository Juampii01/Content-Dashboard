/**
 * Claude Haiku batch analyzer for short, list-style content insights.
 *
 * Used by /api/content-research and /api/video-feed: given a ranked list of
 * videos/posts, ask Haiku to return a 2-sentence "why this worked / what
 * pattern" string per item — as a JSON array.
 *
 * Adapted from Smart-Scale's `analyzeNewPosts`. Haiku chosen for cost
 * (these analyses are run for batches of 10-15 items per request).
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: `Experto en contenido. Analizá ${ranked.length} posts de "${ownerName}". Por cada uno: 2 oraciones en español sobre por qué funcionó y qué patrón usa.\n\n${list}\n\nRespondé SOLO con un JSON array de ${ranked.length} strings. Sin markdown, sin texto antes ni después.`,
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
