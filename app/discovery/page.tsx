'use client'

import { useEffect, useRef, useState } from 'react'
import { SECTIONS, ALL_QUESTION_IDS } from '@/lib/discovery/questions'

const DRAFT_KEY = 'discovery-draft-v1'
type SaveState = 'idle' | 'saving' | 'saved'

const EMPTY: Record<string, string> = Object.fromEntries(
  ALL_QUESTION_IDS.map((id) => [id, '']),
)

export default function DiscoveryPage() {
  const [answers, setAnswers] = useState<Record<string, string>>(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate from localStorage on mount. Only treat it as a real draft if at
  // least one answer is non-empty — avoids showing "Guardado" the first time.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>
        const merged = { ...EMPTY, ...parsed }
        setAnswers(merged)
        if (Object.values(parsed).some((v) => typeof v === 'string' && v.trim().length > 0)) {
          setSaveState('saved')
        }
      }
    } catch {
      // Corrupt JSON — ignore, user starts fresh.
    }
    setHydrated(true)
  }, [])

  // Debounced persistence. We write 500ms after the last keystroke so we
  // don't thrash localStorage on every character. Skipped before hydration
  // so the initial render doesn't overwrite a valid draft with EMPTY.
  useEffect(() => {
    if (!hydrated) return
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(answers))
        setSaveState('saved')
      } catch {
        setSaveState('idle')
      }
    }, 500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [answers, hydrated])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string; detail?: string }
          | null
        const code = data?.error ?? `HTTP_${res.status}`
        const detail = data?.detail
        setSubmitError(
          code === 'UNAUTHORIZED'
            ? 'Tu sesión expiró. Volvé a entrar antes de enviar.'
            : code === 'RATE_LIMIT'
              ? 'Esperá un minuto antes de enviar de nuevo.'
              : detail
                ? `Error ${res.status}: ${detail}`
                : `Error ${res.status} (${code}). Probá de nuevo.`,
        )
        return
      }
      try {
        window.localStorage.removeItem(DRAFT_KEY)
      } catch {
        // ignore
      }
      setSubmitted(true)
    } catch {
      setSubmitError('Error de red. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <header className="mb-8">
        <div className="flex items-center justify-between gap-3">
          <p
            className="text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Discovery · Eternity
          </p>
          {hydrated && !submitted && (
            <span
              className="text-[11px] font-medium"
              style={{ color: 'var(--muted-foreground)' }}
              aria-live="polite"
            >
              {saveState === 'saving'
                ? 'Guardando…'
                : saveState === 'saved'
                  ? 'Borrador guardado en este navegador'
                  : ''}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl" style={{ color: 'var(--foreground)' }}>
          Cuestionario estratégico
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Lo que pongas acá define cómo construimos el producto los próximos meses.
        </p>

        <div
          className="mt-6 rounded-xl p-5 text-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            color: 'var(--foreground)',
          }}
        >
          <p className="mb-2 font-semibold">Importante</p>
          <ul className="space-y-1.5" style={{ color: 'var(--muted-foreground)' }}>
            <li>• Respondé con honestidad.</li>
            <li>
              • Si no sabés algo todavía, escribí <em>“no lo definí”</em> — eso también es información valiosa.
            </li>
            <li>• Tiempo estimado: 45–60 minutos. Mejor hacerlo de a poco, no de una.</li>
            <li>
              • Si alguna pregunta te incomoda, escribí <em>“hablamos verbalmente”</em> y lo dejamos para una llamada.
            </li>
          </ul>
        </div>
      </header>

      {submitted ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          }}
        >
          <p className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
            ¡Gracias!
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Recibimos tus respuestas. Cuando termines, hablamos en una llamada para profundizar.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                window.localStorage.removeItem(DRAFT_KEY)
              } catch {
                // ignore
              }
              setAnswers(EMPTY)
              setSubmitted(false)
              setSaveState('idle')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            Empezar de nuevo
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-8">
          {SECTIONS.map((section) => (
            <section
              key={section.number}
              className="rounded-2xl p-6 md:p-8"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="mb-6 flex items-baseline gap-3">
                <span
                  className="text-[11px] font-bold tracking-wider"
                  style={{ color: 'var(--accent)' }}
                >
                  BLOQUE {section.number}
                </span>
                <h2
                  className="text-lg font-semibold md:text-xl"
                  style={{ color: 'var(--foreground)' }}
                >
                  {section.title}
                </h2>
              </div>

              <div className="space-y-6">
                {section.questions.map((q, idx) => {
                  const number = ALL_QUESTION_IDS.indexOf(q.id) + 1
                  return (
                    <div key={q.id}>
                      <label
                        htmlFor={q.id}
                        className="block text-sm font-semibold leading-snug"
                        style={{ color: 'var(--foreground)' }}
                      >
                        <span style={{ color: 'var(--muted-foreground)' }}>{number}.</span>{' '}
                        {q.label}
                      </label>
                      {q.helper && (
                        <p
                          className="mt-1 text-xs leading-relaxed"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          {q.helper}
                        </p>
                      )}
                      <textarea
                        id={q.id}
                        rows={3}
                        value={answers[q.id]}
                        onChange={(e) =>
                          setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                        }
                        className="mt-2 w-full resize-y rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--background) 60%, transparent)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)',
                        }}
                      />
                      {idx < section.questions.length - 1 && <div className="mt-2" />}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {submitError && (
            <p
              className="text-center text-sm"
              style={{ color: 'var(--accent)' }}
              role="alert"
            >
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {loading ? 'Enviando…' : 'Enviar respuestas'}
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Gracias. Cuando termines, hablamos en una llamada para profundizar.
          </p>
        </form>
      )}
    </div>
  )
}
