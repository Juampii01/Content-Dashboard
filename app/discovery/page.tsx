'use client'

import { useState } from 'react'

interface FormState {
  name: string
  email: string
  business: string
  niche: string
  goal: string
  audience: string
  notes: string
}

const EMPTY: FormState = {
  name: '',
  email: '',
  business: '',
  niche: '',
  goal: '',
  audience: '',
  notes: '',
}

export default function DiscoveryPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 350))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl" style={{ color: 'var(--foreground)' }}>
          Discovery
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Contanos sobre tu negocio. Con esto armamos tu plan de contenido inicial.
        </p>
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
            Recibimos tus respuestas. Te vamos a contactar pronto.
          </p>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY)
              setSubmitted(false)
            }}
            className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            Enviar otra respuesta
          </button>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl p-6 md:p-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <Field label="Tu nombre" required>
            <input
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </Field>

          <Field label="Email de contacto" required>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </Field>

          <Field label="Nombre del negocio o marca">
            <input
              type="text"
              value={form.business}
              onChange={(e) => set('business', e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </Field>

          <Field label="Nicho o industria">
            <input
              type="text"
              placeholder="Ej. coaching, e-commerce, fitness…"
              value={form.niche}
              onChange={(e) => set('niche', e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </Field>

          <Field label="¿A quién le hablás?">
            <textarea
              rows={3}
              placeholder="Describí tu audiencia ideal."
              value={form.audience}
              onChange={(e) => set('audience', e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </Field>

          <Field label="¿Cuál es tu objetivo principal con el contenido?">
            <textarea
              rows={3}
              placeholder="Vender, posicionarte, educar…"
              value={form.goal}
              onChange={(e) => set('goal', e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </Field>

          <Field label="Algo más que querramos saber">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
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
        </form>
      )}
    </div>
  )
}

const INPUT_CLASS =
  'w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent)]'

const INPUT_STYLE = {
  backgroundColor: 'color-mix(in srgb, var(--background) 60%, transparent)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
} as const

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="mb-2 block text-sm font-semibold"
        style={{ color: 'var(--foreground)' }}
      >
        {label}
        {required && <span style={{ color: 'var(--accent)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}
