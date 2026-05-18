/**
 * POST /api/guiones/generate
 *
 * Generate a complete script using Claude Sonnet for a given topic, type, and tone.
 * Returns { content: string } — plain text ready to paste into the GuionEditor.
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'

const GenerateSchema = z.object({
  topic: z.string().min(1).max(500),
  type: z.enum(['reel', 'historia']),
  tone: z.string().max(100).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  let auth: { userId: string; clientId: string }
  try {
    auth = await requireActiveClient()
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    throw err
  }

  // Rate limit — 10 per minute per client
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? auth.clientId
  const rl = await checkRateLimit(ip, 'guiones-generate', 10, '60 s')
  if (rl && !rl.success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intentá de nuevo en un minuto.' }, { status: 429 })
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = GenerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { topic, type, tone = 'conversacional y directo' } = parsed.data

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const typeLabel = type === 'reel' ? 'Reel (video corto de 30-90 segundos)' : 'Historia (Instagram/TikTok Story de 15-60 segundos)'

  const prompt = `Sos un experto en creación de contenido para redes sociales. Escribí un guión completo en español para el siguiente contenido:

Tema: ${topic}
Tipo: ${typeLabel}
Tono: ${tone}

El guión debe seguir exactamente esta estructura:

🎣 HOOK (0-3 seg):
[Una frase inicial poderosa que capture la atención de inmediato. Puede ser una pregunta disruptiva, una afirmación sorprendente, o una promesa de valor clara.]

📖 DESARROLLO:
[El cuerpo principal del contenido. Para un Reel: 3-5 puntos concretos o una narrativa con ritmo. Para una Historia: mensaje único y directo. Incluí lo que el espectador va a aprender, ver o sentir.]

📣 CTA:
[Llamada a la acción específica y natural. Ejemplos: "Guardá esto para cuando lo necesites", "Contame en comentarios si te pasó lo mismo", "Seguime para más tips como este".]

---
Importante:
- Escribí el guión listo para hablar en cámara, sin indicaciones de producción
- Usá el tono "${tone}" de forma consistente
- Sé concreto y específico, evitá el relleno
- El texto debe fluir de forma natural al hablarlo en voz alta`

  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = msg.content[0]
    if (!block || block.type !== 'text') {
      return NextResponse.json({ error: 'Respuesta inválida del modelo' }, { status: 500 })
    }

    return NextResponse.json({ content: block.text.trim() })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[guiones/generate POST] Anthropic error:', message)
    return NextResponse.json({ error: 'Error al generar el guión' }, { status: 500 })
  }
}
