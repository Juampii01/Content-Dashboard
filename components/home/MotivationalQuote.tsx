'use client'

import { useEffect, useState } from 'react'

const QUOTES = [
  "El contenido que publicas hoy es la semilla del negocio que cosecharás mañana.",
  "Recuerda por qué empezaste. Esa energía sigue ahí, más fuerte que nunca.",
  "No se trata de ser viral. Se trata de ser relevante para las personas correctas.",
  "La consistencia vence al talento cuando el talento no es consistente.",
  "Un reel bien pensado vale más que cien publicados sin estrategia.",
  "Tu audiencia no solo quiere contenido — quiere conexión.",
  "El creador que estudia su data no compite con suerte, compite con certeza.",
  "La diferencia entre un hobby y un negocio es la intención detrás de cada publicación.",
  "Cada pieza de contenido es una conversación con alguien que aún no te conoce.",
  "El mejor momento para publicar fue ayer. El segundo mejor momento es ahora.",
]

export function MotivationalQuote() {
  const [quote, setQuote] = useState('')

  useEffect(() => {
    const saved = sessionStorage.getItem('eternity_quote_idx')
    const idx = saved ? parseInt(saved) : Math.floor(Math.random() * QUOTES.length)
    if (!saved) sessionStorage.setItem('eternity_quote_idx', String(idx))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuote(QUOTES[idx])
  }, [])

  if (!quote) return null

  return (
    <div
      className="rounded-xl px-5 py-4 mb-6"
      style={{ backgroundColor: 'var(--accent)', borderLeft: '3px solid var(--accent)' }}
    >
      <p className="text-sm italic leading-relaxed" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  )
}
