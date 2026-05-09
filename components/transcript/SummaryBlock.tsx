/**
 * SummaryBlock — render Claude's structured summary as styled cards.
 *
 * Claude returns the summary as plain text with conventional headers
 * (RESUMEN / PUNTOS CLAVE / CONCLUSIÓN). We split on blank lines and look
 * for ALL-CAPS first lines as section headers, then render each section
 * as a card with its own color treatment.
 *
 * If the parser finds no headers (older summary or unexpected format),
 * we fall back to rendering the text verbatim.
 */

interface SummarySection {
  header: string | null
  body: string
}

const SECTION_STYLES: Record<
  string,
  { fg: string; bg: string; border: string }
> = {
  RESUMEN: {
    fg: 'color-mix(in srgb, var(--secondary, #1e3a8a) 80%, var(--foreground))',
    bg: 'color-mix(in srgb, var(--secondary, #1e3a8a) 8%, transparent)',
    border: 'color-mix(in srgb, var(--secondary, #1e3a8a) 25%, var(--border))',
  },
  'PUNTOS CLAVE': {
    fg: 'var(--accent)',
    bg: 'color-mix(in srgb, var(--accent) 8%, transparent)',
    border: 'color-mix(in srgb, var(--accent) 25%, var(--border))',
  },
  CONCLUSIÓN: {
    fg: 'color-mix(in srgb, var(--foreground) 90%, transparent)',
    bg: 'color-mix(in srgb, var(--stat-icon) 10%, transparent)',
    border: 'color-mix(in srgb, var(--stat-icon) 25%, var(--border))',
  },
}

function splitSummary(text: string): SummarySection[] {
  const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/#{1,3}\s*/g, '').trim()
  return clean
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.trim().split('\n')
      const first = lines[0]?.trim() ?? ''
      const isHeader = /^[A-ZÁÉÍÓÚÑ\s]{3,40}$/.test(first)
      if (isHeader && lines.length > 1) {
        return { header: first, body: lines.slice(1).join('\n').trim() }
      }
      return { header: null, body: block.trim() }
    })
    .filter((s) => s.body.length > 0)
}

export function SummaryBlock({ text }: { text: string }) {
  const sections = splitSummary(text)
  if (sections.length === 0) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)' }}>
        {text}
      </p>
    )
  }
  return (
    <div className="grid gap-3">
      {sections.map((s, i) => {
        const cfg = s.header ? SECTION_STYLES[s.header] : null
        return (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${cfg?.border ?? 'var(--border)'}` }}
          >
            {s.header && cfg && (
              <div
                className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: cfg.bg, color: cfg.fg, borderBottom: `1px solid ${cfg.border}` }}
              >
                {s.header}
              </div>
            )}
            <div className="px-4 py-3.5" style={{ backgroundColor: 'var(--card)' }}>
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--foreground)' }}
              >
                {s.body}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
