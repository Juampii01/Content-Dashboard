/**
 * POST /api/guiones/generate
 *
 * Two modes, selected by the request body:
 *
 * 1. Full generate (no `action`) — Generate a complete script using Claude
 *    for a given { topic, type, tone }. Returns { content } — plain text ready
 *    to paste into the GuionEditor (HOOK / DESARROLLO / CTA structure).
 *
 * 2. Section-level action (`action` present) — Run a focused edit over the
 *    caller's current { script } text:
 *      - 'rewrite_hook'  → returns { content }  (a sharper hook, 1-2 lines)
 *      - 'hook_variants' → returns { variants } (3 alternative hooks)
 *      - 'punch_cta'     → returns { content }  (a sharper CTA, 1 line)
 *      - 'tighten'       → returns { content }  (full script trimmed to ~30s)
 *
 * Both modes share the 10/min rate limit.
 */

export const runtime = 'nodejs'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { checkRateLimit } from '@/lib/utils/ratelimit'

const GEN_ACTIONS = ['rewrite_hook', 'hook_variants', 'punch_cta', 'tighten'] as const
type GenAction = (typeof GEN_ACTIONS)[number]

const FullGenerateSchema = z.object({
  topic: z.string().min(1).max(500),
  type: z.enum(['reel', 'historia']),
  tone: z.string().max(100).optional(),
})

const ActionSchema = z.object({
  action: z.enum(GEN_ACTIONS),
  script: z.string().min(1).max(8000),
  type: z.enum(['reel', 'historia']),
  tone: z.string().max(100).optional(),
})

function hasStringAction(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'action' in body &&
    typeof (body as Record<string, unknown>).action === 'string'
  )
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function fullGeneratePrompt(topic: string, type: 'reel' | 'historia', tone: string): string {
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

  return `Sos un experto en creación de contenido para redes sociales hispanohablantes. Escribí un guión completo en español rioplatense (vos, no tú) para el siguiente contenido:

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
}

function actionPrompt(
  action: GenAction,
  script: string,
  type: 'reel' | 'historia',
  tone: string,
): string {
  const base = `Sos un experto en guiones para redes sociales hispanohablantes. Trabajás en español rioplatense (vos, no tú), con un tono "${tone}".

Este es el guión actual:
---
${script}
---
`

  switch (action) {
    case 'rewrite_hook':
      return `${base}
Reescribí SOLO el gancho de apertura (el hook, los primeros 1-3 segundos) para que sea más potente y detenga el scroll: una pregunta disruptiva, una afirmación sorprendente o una promesa de valor irresistible.
Devolvé ÚNICAMENTE el nuevo hook (1-2 oraciones cortas), sin etiquetas de sección, sin emojis, sin comillas y sin ninguna explicación.`

    case 'hook_variants':
      return `${base}
Generá 3 hooks (ganchos de apertura) alternativos y bien distintos entre sí para este guión. Cada uno debe detener el scroll en los primeros 3 segundos, con ángulos diferentes (curiosidad, contraste, beneficio directo, etc.).
Devolvé EXACTAMENTE 3 líneas, una por hook, sin numeración, sin viñetas, sin emojis, sin comillas y sin ninguna explicación.`

    case 'punch_cta':
      return `${base}
Reescribí SOLO el CTA (el llamado a la acción del final) para que sea más claro, específico y natural — que invite a una acción concreta (guardar, comentar, mandar DM, seguir, etc.).
Devolvé ÚNICAMENTE el nuevo CTA (1 oración), sin etiquetas de sección, sin emojis, sin comillas y sin ninguna explicación.`

    case 'tighten': {
      const targetWords = type === 'historia' ? 55 : 75
      return `${base}
Achicá este guión para que dure aproximadamente 30 segundos hablado en voz alta (cerca de ${targetWords} palabras). Sacá todo el relleno, dejá solo lo esencial y afilá cada frase, manteniendo la idea central y la fuerza del mensaje.
Devolvé el guión completo respetando esta estructura de secciones, con los emojis tal cual:

🎣 HOOK:
[...]

📖 DESARROLLO:
[...]

📣 CTA:
[...]

Entregá SOLO el guión, sin introducción ni explicación adicional.`
    }
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const isActionMode = hasStringAction(body)

  // Build the prompt + response mapping for the chosen mode.
  let prompt: string
  let action: GenAction | null = null

  if (isActionMode) {
    const parsed = ActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', ...(process.env.NODE_ENV !== 'production' ? { issues: parsed.error.flatten() } : {}) },
        { status: 400 },
      )
    }
    action = parsed.data.action
    const tone = parsed.data.tone ?? 'conversacional y directo'
    prompt = actionPrompt(action, parsed.data.script, parsed.data.type, tone)
  } else {
    const parsed = FullGenerateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', ...(process.env.NODE_ENV !== 'production' ? { issues: parsed.error.flatten() } : {}) },
        { status: 400 },
      )
    }
    const tone = parsed.data.tone ?? 'conversacional y directo'
    prompt = fullGeneratePrompt(parsed.data.topic, parsed.data.type, tone)
  }

  // Actions produce short output; full generate needs more room.
  const maxTokens = action && action !== 'tighten' ? 400 : 1200

  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = msg.content[0]
    if (!block || block.type !== 'text') {
      return NextResponse.json({ error: 'Respuesta inválida del modelo' }, { status: 500 })
    }

    const text = block.text.trim()

    if (action === 'hook_variants') {
      const variants = text
        .split('\n')
        .map((line) => line.replace(/^\s*(?:\d+[.)]\s*|[-*•]\s*)/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
      if (variants.length === 0) {
        return NextResponse.json({ error: 'No se generaron variantes' }, { status: 500 })
      }
      return NextResponse.json({ variants })
    }

    return NextResponse.json({ content: text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[guiones/generate POST] Anthropic error:', message)
    return NextResponse.json({ error: 'Error al generar el guión' }, { status: 500 })
  }
}
