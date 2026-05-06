/**
 * Returns a readable string describing the ICP for use in Claude prompts.
 * Fetches from /api/bases/icp (Prisma-backed).
 * Returns null if no meaningful data has been filled in.
 */
export async function getICPContext(): Promise<string | null> {
  try {
    const res = await fetch('/api/bases/icp')
    if (!res.ok) return null
    const row = await res.json()
    if (!row) return null

    const dolores   = tryParseArray(row.dolores)
    const deseos    = tryParseArray(row.deseos)
    const creencias = tryParseArray(row.creencias)

    const hasProfile  = row.nombre || row.rol || row.edad || row.ingresos || row.nicho
    const hasInsights = dolores.length > 0 || deseos.length > 0 || creencias.length > 0

    if (!hasProfile && !hasInsights) return null

    const lines: string[] = []

    if (row.nombre)         lines.push(`Nombre del avatar: ${row.nombre}`)
    if (row.rol)            lines.push(`Rol / ocupación: ${row.rol}`)
    if (row.edad)           lines.push(`Edad: ${row.edad}`)
    if (row.ingresos)       lines.push(`Ingresos: ${row.ingresos}`)
    if (row.nicho)          lines.push(`Nicho: ${row.nicho}`)
    if (dolores.length)     lines.push(`Dolores: ${dolores.join(', ')}`)
    if (deseos.length)      lines.push(`Deseos: ${deseos.join(', ')}`)
    if (creencias.length)   lines.push(`Creencias / objeciones: ${creencias.join(', ')}`)

    return lines.length > 0 ? lines.join('\n') : null
  } catch {
    return null
  }
}

/**
 * Returns a short summary of which ICP fields are filled,
 * for display in the Copy Generator UI.
 */
export async function getICPSummary(): Promise<{
  filled: boolean
  nombre?: string
  rol?: string
  doloresCount: number
  deseosCount: number
}> {
  try {
    const res = await fetch('/api/bases/icp')
    if (!res.ok) return { filled: false, doloresCount: 0, deseosCount: 0 }
    const row = await res.json()
    if (!row) return { filled: false, doloresCount: 0, deseosCount: 0 }

    const dolores = tryParseArray(row.dolores)
    const deseos  = tryParseArray(row.deseos)
    const filled  = !!(row.nombre || row.rol || dolores.length || deseos.length)
    return {
      filled,
      nombre: row.nombre || undefined,
      rol: row.rol || undefined,
      doloresCount: dolores.length,
      deseosCount: deseos.length,
    }
  } catch {
    return { filled: false, doloresCount: 0, deseosCount: 0 }
  }
}

function tryParseArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string')
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p.filter((x): x is string => typeof x === 'string')
    } catch {}
  }
  return []
}
