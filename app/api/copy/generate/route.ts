import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { GenerateRequestSchema } from '@/lib/schemas/copy/generate'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export const maxDuration = 120

const TYPE_INSTRUCTIONS: Record<string, string> = {
  'reels-virales': `Genera scripts/hooks para reels virales de Instagram o TikTok orientados a máximo alcance.
Cada resultado incluye: hook de apertura (máx 8 palabras que generen curiosidad inmediata), 2-3 puntos clave del desarrollo y un CTA de cierre.
Usa estructuras probadas de viralidad: datos sorprendentes, afirmaciones provocadoras, preguntas retóricas, revelaciones inesperadas.
El contenido debe apelar a audiencias amplias sin perder la esencia del nicho.`,

  'reels-nicho': `Genera scripts/hooks para reels dirigidos específicamente a la audiencia del ICP.
Cada resultado habla directamente a los dolores, deseos y lenguaje del cliente ideal.
Usa terminología del nicho, referencia problemas específicos que conoce el ICP y ofrece valor profundo.
El tono es de experto que habla a otro profesional, no a una audiencia general.`,

  'anuncios': `Genera copies para anuncios de Meta Ads (Facebook e Instagram).
Cada resultado incluye: headline de impacto, copy principal (problema → agitación → solución) y CTA claro.
Sé directo, específico y orientado a conversión. Apunta al dolor principal del ICP.
Evita lenguaje corporativo. Usa frases cortas y puntuación para escaneabilidad.`,

  ideas: `Genera ideas de contenido como títulos de reels o posts listos para grabar.
Cada idea es un título específico y accionable que indica exactamente el tema y el ángulo.
Incluye el gancho del contenido en el título. Que al leerlo el creador sepa exactamente qué decir y a quién va dirigido.`,
}

export async function POST(req: NextRequest) {
  try {
    await requireActiveClient()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    throw err
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI no configurado' }, { status: 503 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'copy', 30, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const client = new Anthropic()

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const result = GenerateRequestSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: result.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 }
    )
    }

    const { type, categoria, tono, cantidad, icpContext } = result.data

    const icpBlock = icpContext
      ? `\nCLIENTE IDEAL:\n${icpContext}\n`
      : '\n(No hay ICP definido — genera contenido de valor general para el nicho)\n'

    const prompt = `Eres un experto en copywriting y estrategia de contenido para redes sociales.
${icpBlock}
CATEGORÍA DE CONTENIDO: ${categoria}
TONO: ${tono}

TAREA: ${TYPE_INSTRUCTIONS[type] ?? TYPE_INSTRUCTIONS.ideas}

Genera exactamente ${cantidad} variantes.

REGLAS:
- Cada variante debe ser claramente diferente a las demás
- Adapta el contenido al ICP si está disponible
- Responde ÚNICAMENTE con JSON válido, sin texto adicional
- Formato exacto: {"items": ["variante 1", "variante 2", ...]}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.content?.[0]?.type !== 'text') {
      return NextResponse.json({ error: 'Respuesta inesperada de Claude (sin bloque de texto)' }, { status: 500 })
    }

    const raw = message.content[0].text

    // Parse JSON — find the first valid JSON object in the response
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA' }, { status: 500 })
    }

    let parsed: { items?: unknown }
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return NextResponse.json({ error: 'JSON inválido en la respuesta de IA' }, { status: 500 })
    }

    if (!parsed.items || !Array.isArray(parsed.items)) {
      return NextResponse.json({ error: 'Formato de respuesta inesperado' }, { status: 500 })
    }

    return NextResponse.json({ items: parsed.items })
  } catch (e) {
    console.error('copy/generate error:', e)
    return NextResponse.json({ error: 'Error generando copies' }, { status: 500 })
  }
}
