'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, Hand, GitBranch, CalendarCheck } from 'lucide-react'

const QUOTES = [
  'El mejor contenido no es el más perfecto, sino el más constante.',
  'Crear sin publicar es como respirar sin exhalar.',
  'La consistencia supera al talento. Siempre.',
  'Un reel mediocre publicado vale más que diez perfectos en borrador.',
  'El algoritmo premia a los que aparecen, no a los que esperan.',
]

function getGreeting(date: Date): string {
  const h = date.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function getTodayDate(date: Date): string {
  const raw = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

interface GreetingBlockProps {
  pipelineProduccion: number
  pipelineProgramado: number
  ideasCount: number
  loaded?: boolean
  name?: string
}

// Date-derived strings are computed after mount to avoid SSR/CSR divergence
// on hour/day boundaries (was the source of React error #418).
export function GreetingBlock({
  pipelineProduccion,
  pipelineProgramado,
  ideasCount,
  loaded = true,
  name,
}: GreetingBlockProps) {
  const [greeting, setGreeting] = useState<string>('')
  const [quote, setQuote] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    // Intentional: date-derived state must be computed post-mount to avoid
    // SSR/CSR divergence at hour/day boundaries. Documented React pattern
    // for deferring browser-only values; expected exception to the rule.
    /* eslint-disable react-hooks/set-state-in-effect */
    const now = new Date()
    setGreeting(getGreeting(now))
    setQuote(QUOTES[now.getDay() % QUOTES.length])
    setDate(getTodayDate(now))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const pills = [
    { label: 'En producción', value: pipelineProduccion, icon: GitBranch,      color: 'var(--warning)',      hint: 'piezas activas' },
    { label: 'Programados',   value: pipelineProgramado,  icon: CalendarCheck,  color: 'var(--accent)', hint: 'listos para publicar' },
    { label: 'Ideas guardadas', value: ideasCount,        icon: Lightbulb,      color: 'var(--chart-purple)',      hint: 'en el baúl' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <span suppressHydrationWarning>{greeting ? `${greeting}, ${name || 'Creador'}` : `Hola, ${name || 'Creador'}`}</span>
            <Hand className="h-5 w-5" style={{ color: 'var(--warning)' }} />
          </h1>
          <p className="text-xs mt-0.5 min-h-[1em]" style={{ color: 'var(--muted-foreground)' }} suppressHydrationWarning>
            {date}
          </p>
        </div>
        <div
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl max-w-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}
        >
          <Lightbulb size={13} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <p className="text-xs italic leading-relaxed min-h-[1.2em]" style={{ color: 'var(--muted-foreground)' }} suppressHydrationWarning>
            {quote && <>&ldquo;{quote}&rdquo;</>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pills.map(({ label, value, icon: Icon, color, hint }, index) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 animate-slide-up-fade"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: color + '22' }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium leading-tight truncate" style={{ color: 'var(--muted-foreground)' }}>
                {label}
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5 min-w-0">
                {loaded ? (
                  <span className="text-xl font-bold truncate" style={{ color: 'var(--foreground)' }}>
                    {value}
                  </span>
                ) : (
                  <div className="h-6 w-10 rounded bg-muted animate-pulse" />
                )}
                <span className="text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>
                  {hint}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
