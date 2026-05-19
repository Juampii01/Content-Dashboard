import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { AnalyzeRequestSchema } from '@/lib/schemas/analizador/analyze'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    // clientId extracted for tenant-scoping future DB writes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { clientId: _clientId } = await requireActiveClient()
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
  const client = new Anthropic()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await checkRateLimit(ip, 'analyze', 20, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = AnalyzeRequestSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'Invalid request', issues: result.error.flatten() }
        : { error: 'Invalid request' },
      { status: 400 }
    )
  }

  const { caption, transcript, views, likes, comments } = result.data

  const content = [
    caption ? `Caption: ${caption}` : '',
    transcript ? `Transcripción: ${transcript}` : '',
  ].filter(Boolean).join('\n\n')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analiza el siguiente reel de Instagram y extrae la estructura del guión. Responde SOLO con un objeto JSON válido, sin markdown ni texto extra.

${content}

Métricas: ${typeof views === 'number' ? views.toLocaleString() : 'N/A'} views | ${typeof likes === 'number' ? likes.toLocaleString() : 'N/A'} likes | ${typeof comments === 'number' ? comments.toLocaleString() : 'N/A'} comentarios

Extrae este JSON:
{
  "hook": "texto del hook (primeros 3 segundos)",
  "hookType": "pregunta | dato_impactante | historia | controversia | promesa | otro",
  "desarrollo": ["punto 1", "punto 2", "punto 3"],
  "cta": "llamada a la acción al final",
  "ctaType": "seguir | comentar | guardar | compartir | link_bio | ninguno",
  "patron": "patrón narrativo identificado (ej: problema-solución, lista, historia personal, etc.)",
  "tono": "educativo | entretenimiento | inspiracional | controversial | personal | profesional",
  "duracion_estimada": "corto (<30s) | medio (30-60s) | largo (>60s)",
  "insights": "observación clave sobre por qué este contenido funciona o podría mejorar"
}`,
      },
    ],
  })

  if (message.content?.[0]?.type !== 'text') {
    return NextResponse.json({ error: 'Respuesta inesperada de Claude (sin bloque de texto)' }, { status: 500 })
  }

  const text = message.content[0].text

  try {
    const json = JSON.parse(text)
    return NextResponse.json({ structure: json })
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return NextResponse.json({ structure: JSON.parse(match[0]) })
      } catch {
        // fall through
      }
    }
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { error: 'No se pudo parsear la respuesta de Claude', raw: text }
        : { error: 'No se pudo parsear la respuesta de Claude' },
      { status: 500 }
    )
  }
}
