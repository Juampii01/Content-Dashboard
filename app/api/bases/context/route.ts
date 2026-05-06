import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stripHtml } from '@/lib/utils/stripHtml'
import { requireActiveClient, UnauthorizedError, ForbiddenError } from '@/lib/auth-user'

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

export async function GET() {
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

  try {
    const [icpRow, bases] = await Promise.all([
      db.iCPProfile.findFirst({ where: { clientId } }),
      db.businessBase.findMany({ where: { clientId } }),
    ])

    const baseMap = Object.fromEntries(bases.map((b) => [b.key, b]))

    const ofertaRaw = baseMap['oferta']?.content ?? ''
    const ofertaText = ofertaRaw ? stripHtml(ofertaRaw).trim() : undefined

    const context = {
      icp: icpRow
        ? (() => {
            const lines: string[] = []
            if (icpRow.nombre)   lines.push(`Nombre del avatar: ${icpRow.nombre}`)
            if (icpRow.rol)      lines.push(`Rol / ocupación: ${icpRow.rol}`)
            if (icpRow.edad)     lines.push(`Edad: ${icpRow.edad}`)
            if (icpRow.ingresos) lines.push(`Ingresos: ${icpRow.ingresos}`)
            if (icpRow.nicho)    lines.push(`Nicho: ${icpRow.nicho}`)
            const dolores   = parseJsonArray(icpRow.dolores)
            const deseos    = parseJsonArray(icpRow.deseos)
            const creencias = parseJsonArray(icpRow.creencias)
            if (dolores.length)   lines.push(`Dolores: ${dolores.join(', ')}`)
            if (deseos.length)    lines.push(`Deseos: ${deseos.join(', ')}`)
            if (creencias.length) lines.push(`Creencias / objeciones: ${creencias.join(', ')}`)
            return lines.length > 0 ? lines.join('\n') : undefined
          })()
        : undefined,
      oferta:    ofertaText || undefined,
      problemas: parseJsonArray(baseMap['problemas']?.items ?? '[]'),
      dolores:   parseJsonArray(baseMap['dolores']?.items   ?? '[]'),
      deseos:    parseJsonArray(baseMap['deseos']?.items    ?? '[]'),
      insights:  parseJsonArray(baseMap['insights']?.items  ?? '[]'),
    }

    return NextResponse.json(context)
  } catch (err) {
    console.error('[GET /api/bases/context]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
