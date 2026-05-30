/**
 * POST /api/guiones/generate
 *
 * Generate a complete script using Claude Sonnet for a given topic, type, and tone.
 * Returns { content: string } — plain text ready to paste into the GuionEditor.
 */

export const runtime = 'nodejs'
export const maxDuration = 120

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
    return NextResponse.json(
      { error: 'Invalid request', ...(process.env.NODE_ENV !== 'production' ? { issues: parsed.error.flatten() } : {}) },
      { status: 400 },
    )
  }

  const { topic, type, tone = 'conversacional y directo' } = parsed.data

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const isReel = type === 'reel'
  const typeLabel = isReel
    ? 'Reel (video corto de 30-90 segundos, ~150 palabras)'
    : 'Historia (Story de Instagram/TikTok, 15-30 segundos, ~70 palabras)'

  const structureGuide = isReel
    ? `🎣 HOOK (0-3 seg):
[Una frase inicial poderosa que capture la atención de inmediato: pregunta disruptiva, estadística sorprendente, o promesa de valor clara. 1-2 oraciones.]

📖 DESARROLLO:
[El cuerpo principal. 3-5 puntos concretos con ritmo. Cada punto breve y contundente. Sin relleno.]

📣 CTA:
[Llamada a la acción específica y natural. Ej: "Guardá esto para cuando lo necesites", "Contame en comentarios si te pasó", "Seguime para más tips como este".]`
    : `🎣 APERTURA (0-3 seg):
[Frase de apertura breve e impactante. Genera curiosidad o promete valor inmediato. 1 oración.]

📖 MENSAJE CENTRAL:
[Un mensaje único y directo. Visual, emocional o útil — elegí uno. Máximo 3 oraciones cortas.]

📣 CTA:
[Acción concreta: responder, guardar, ir al perfil, mandar DM, etc. 1 oración.]`

  const prompt = `Sos un experto en creación de contenido para redes sociales hispanohablantes. Escribí un guión completo en español rioplatense (vos, no tú) para el siguiente contenido:

Tema: ${topic}
Tipo: ${typeLabel}
Tono: ${tone}

El guión debe seguir EXACTAMENTE esta estructura, con los emojis y secciones tal cual:

${structureGuide}

---
Reglas:
- El texto debe sonar natural al hablarlo en voz alta frente a cámara
- Sin indicaciones de producción, stage directions ni acotaciones
- Usá el tono "${tone}" de forma consistente en todo el guión
- Sé concreto y específico, evitá el relleno y las generalidades
- Respetá estrictamente el límite de duración del tipo de contenido
- Entregá SOLO el guión, sin introducción ni explicación adicional`

  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
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
