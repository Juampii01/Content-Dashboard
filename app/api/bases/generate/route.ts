import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stripHtml } from '@/lib/utils/stripHtml'
import { checkRateLimit } from '@/lib/utils/ratelimit'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'
import { BasesGenerateSchema, type BasesGenerateField } from '@/lib/schemas/bases/generate'

export const maxDuration = 120

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    }
    return []
  } catch {
    return []
  }
}

interface BasesContext {
  icp?: string
  oferta?: string
  problemas: string[]
  dolores: string[]
  deseos: string[]
  insights: string[]
  keywords: string[]
  creencias: string[]
}

/** Reuses the aggregator logic from app/api/bases/context/route.ts */
async function loadBasesContext(clientId: string): Promise<BasesContext> {
  const [icpRow, bases] = await Promise.all([
    db.iCPProfile.findFirst({ where: { clientId } }),
    db.businessBase.findMany({ where: { clientId } }),
  ])

  const baseMap = Object.fromEntries(bases.map((b) => [b.key, b]))

  const ofertaRaw = baseMap['oferta']?.content ?? ''
  const ofertaText = ofertaRaw ? stripHtml(ofertaRaw).trim() : ''

  const icpDolores   = icpRow ? parseJsonArray(icpRow.dolores)   : []
  const icpDeseos    = icpRow ? parseJsonArray(icpRow.deseos)    : []
  const icpCreencias = icpRow ? parseJsonArray(icpRow.creencias) : []

  const icp = icpRow
    ? (() => {
        const lines: string[] = []
        if (icpRow.nombre)   lines.push(`Nombre del avatar: ${icpRow.nombre}`)
        if (icpRow.rol)      lines.push(`Rol / ocupación: ${icpRow.rol}`)
        if (icpRow.edad)     lines.push(`Edad: ${icpRow.edad}`)
        if (icpRow.ingresos) lines.push(`Ingresos: ${icpRow.ingresos}`)
        if (icpRow.nicho)    lines.push(`Nicho: ${icpRow.nicho}`)
        if (icpDolores.length)   lines.push(`Dolores: ${icpDolores.join(', ')}`)
        if (icpDeseos.length)    lines.push(`Deseos: ${icpDeseos.join(', ')}`)
        if (icpCreencias.length) lines.push(`Creencias / objeciones: ${icpCreencias.join(', ')}`)
        return lines.length > 0 ? lines.join('\n') : undefined
      })()
    : undefined

  return {
    icp,
    oferta:    ofertaText || undefined,
    problemas: parseJsonArray(baseMap['problemas']?.items ?? '[]'),
    dolores:   parseJsonArray(baseMap['dolores']?.items   ?? '[]'),
    deseos:    parseJsonArray(baseMap['deseos']?.items    ?? '[]'),
    insights:  parseJsonArray(baseMap['insights']?.items  ?? '[]'),
    keywords:  parseJsonArray(baseMap['keywords']?.items  ?? '[]'),
    creencias: icpCreencias,
  }
}

interface FieldSpec {
  /** What to generate. */
  task: string
  /** Existing values so the model dedupes against them. */
  existing: (ctx: BasesContext) => string[]
  /** Whether to return a single item (promesa) vs a list. */
  single?: boolean
}

const FIELD_SPECS: Record<BasesGenerateField, FieldSpec> = {
  problemas: {
    task: 'Generá PROBLEMAS de la audiencia: situaciones externas y concretas que enfrenta el cliente ideal (no emociones, sino hechos y obstáculos reales).',
    existing: (c) => c.problemas,
  },
  dolores: {
    task: 'Generá DOLORES de la audiencia: el impacto emocional de sus problemas — cómo los hace sentir (frustración, miedo, agotamiento, vergüenza).',
    existing: (c) => c.dolores,
  },
  deseos: {
    task: 'Generá DESEOS de la audiencia: qué quieren lograr, conseguir o sentir. Resultados aspiracionales y transformaciones deseadas.',
    existing: (c) => c.deseos,
  },
  keywords: {
    task: 'Generá KEYWORDS del nicho: palabras clave, términos y frases cortas que usa la audiencia cuando habla de sus problemas o busca soluciones.',
    existing: (c) => c.keywords,
  },
  icp_creencias: {
    task: 'Generá CREENCIAS y OBJECIONES del cliente ideal: ideas limitantes, dudas o excusas que lo frenan a comprar o actuar (ej: "eso no funciona en mi nicho").',
    existing: (c) => c.creencias,
  },
  oferta_promesa: {
    task: 'Generá una PROMESA PRINCIPAL de la oferta: una frase potente y específica que resuma la transformación que logra el cliente (con resultado y, si aplica, un marco de tiempo).',
    existing: (c) => (c.oferta ? [c.oferta] : []),
    single: true,
  },
}

function buildPrompt(field: BasesGenerateField, ctx: BasesContext, count: number): string {
  const spec = FIELD_SPECS[field]
  const existing = spec.existing(ctx)

  const contextLines: string[] = []
  if (ctx.icp)       contextLines.push(`CLIENTE IDEAL:\n${ctx.icp}`)
  if (ctx.oferta)    contextLines.push(`OFERTA:\n${ctx.oferta}`)
  if (ctx.problemas.length) contextLines.push(`PROBLEMAS ya definidos: ${ctx.problemas.join(', ')}`)
  if (ctx.dolores.length)   contextLines.push(`DOLORES ya definidos: ${ctx.dolores.join(', ')}`)
  if (ctx.deseos.length)    contextLines.push(`DESEOS ya definidos: ${ctx.deseos.join(', ')}`)
  if (ctx.keywords.length)  contextLines.push(`KEYWORDS ya definidas: ${ctx.keywords.join(', ')}`)
  if (ctx.insights.length)  contextLines.push(`INSIGHTS: ${ctx.insights.join(', ')}`)

  const contextBlock = contextLines.length > 0
    ? contextLines.join('\n\n')
    : '(Todavía no hay contexto definido — inferí desde un nicho de creadores de contenido y negocios digitales)'

  const dedupeBlock = existing.length > 0
    ? `\nNO repitas ni parafrasees estos ítems que ya existen:\n- ${existing.join('\n- ')}\n`
    : ''

  return `Sos un estratega de marketing experto que ayuda a definir las bases de negocio de un creador de contenido.

CONTEXTO DEL NEGOCIO:
${contextBlock}
${dedupeBlock}
TAREA: ${spec.task}

REGLAS:
- Escribí en español rioplatense (voseo, natural, como habla la gente en Argentina/Uruguay).
- Cada ítem debe ser corto, punchy y concreto (máx ~12 palabras).
- Nada de relleno, comillas ni numeración dentro del texto de cada ítem.
- Coherente con el contexto y el cliente ideal.
${spec.single
    ? '- Devolvé UNA sola opción, la mejor.'
    : `- Generá exactamente ${count} opciones claramente distintas entre sí.`}
- Respondé ÚNICAMENTE con JSON válido, sin texto adicional.
- Formato exacto: {"items": ["opción 1", "opción 2", ...]}`
}

export async function POST(req: NextRequest) {
  let clientId: string
  try {
    ({ clientId } = await requireActiveClient())
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
  const rl = await checkRateLimit(ip, 'bases-generate', 30, '60 s')
  if (rl !== null && !rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const anthropic = new Anthropic()

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const result = BasesGenerateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        process.env.NODE_ENV !== 'production'
          ? { error: 'Invalid request', issues: result.error.flatten() }
          : { error: 'Invalid request' },
        { status: 400 }
      )
    }

    const { field } = result.data
    const spec = FIELD_SPECS[field]
    const count = spec.single ? 1 : (result.data.count ?? 5)

    const ctx = await loadBasesContext(clientId)
    const prompt = buildPrompt(field, ctx, count)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.content?.[0]?.type !== 'text') {
      return NextResponse.json({ error: 'Respuesta inesperada de Claude (sin bloque de texto)' }, { status: 500 })
    }

    const raw = message.content[0].text
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

    // Dedupe (case-insensitive) against what the client already has.
    const existing = new Set(spec.existing(ctx).map((s) => s.trim().toLowerCase()))
    const suggestions = parsed.items
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !existing.has(s.toLowerCase()))
      // dedupe within the batch itself
      .filter((s, i, arr) => arr.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i)
      .slice(0, count)

    return NextResponse.json({ suggestions })
  } catch (e) {
    console.error('bases/generate error:', e)
    return NextResponse.json({ error: 'Error generando sugerencias' }, { status: 500 })
  }
}
