/**
 * Claude summarizer for transcribed videos.
 *
 * Produces a 3-section structured summary (RESUMEN / PUNTOS CLAVE / CONCLUSIÓN)
 * formatted as plain text — no markdown, no bullets — so the view can split
 * blocks and render each section with its own color theme.
 *
 * Model: project default (claude-sonnet-4-6). Smart-Scale used opus-4-6 but
 * sonnet-4-6 is fast enough and a third the cost for this format.
 */
import Anthropic from '@anthropic-ai/sdk'
import { DEFAULT_MODEL } from './models'

const MAX_INPUT_CHARS = 8000
const MAX_OUTPUT_TOKENS = 800

export async function summarizeTranscript(
  transcript: string,
  creator: string | null,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const anthropic = new Anthropic({ apiKey })
  const trimmed = transcript.slice(0, MAX_INPUT_CHARS)
  const creatorClause = creator ? ` del canal "${creator}"` : ''

  const msg = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      {
        role: 'user',
        content: `Generá un resumen ejecutivo de este video${creatorClause}.

TRANSCRIPT:
${trimmed}

Usá EXACTAMENTE este formato, sin markdown, sin asteriscos, sin #:

RESUMEN
[2-3 oraciones de qué trata el video]

PUNTOS CLAVE
[3-5 puntos principales separados por salto de línea, sin guiones ni viñetas]

CONCLUSIÓN
[1 oración con el mensaje final]

Sé directo y concreto. Sin emojis en los títulos.`,
      },
    ],
  })

  const block = msg.content[0]
  if (!block || block.type !== 'text') return ''
  return block.text.trim()
}
