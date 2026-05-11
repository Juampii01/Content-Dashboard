'use client'

import { useState } from 'react'

interface Question {
  id: string
  label: string
  helper?: string
}

interface Section {
  number: number
  title: string
  questions: Question[]
}

const SECTIONS: Section[] = [
  {
    number: 1,
    title: 'Visión del producto',
    questions: [
      { id: 'q1', label: 'En 1-2 frases: ¿qué es Eternity y para quién es?' },
      {
        id: 'q2',
        label:
          '¿Por qué decidiste construir este producto? ¿Qué problema viste en el mercado que nadie estaba resolviendo bien?',
      },
      {
        id: 'q3',
        label: 'Si Eternity funciona como soñás, ¿cómo se ve en 2 años?',
        helper: 'Volumen de clientes, revenue, posicionamiento.',
      },
      {
        id: 'q4',
        label:
          '¿Hay otros productos en el mercado que hacen algo parecido? Si sí, ¿cuáles? ¿Qué hacen ellos que vos NO querés hacer?',
      },
      { id: 'q5', label: '¿Por qué creés que Eternity puede ganar contra esos competidores?' },
    ],
  },
  {
    number: 2,
    title: 'Cliente ideal (ICP)',
    questions: [
      {
        id: 'q6',
        label: '¿Quién es el cliente ideal de Eternity?',
        helper:
          'Sé específico: tipo de negocio, tamaño, industria, momento del negocio. No "creators" genérico — describime una persona real.',
      },
      {
        id: 'q7',
        label: '¿Cuántos clientes ideales hay en LATAM aproximadamente?',
        helper: 'Si no sabés, estimá. Si no te animás a estimar, decime por qué.',
      },
      {
        id: 'q8',
        label: '¿Cómo encuentran ese tipo de clientes a Eternity?',
        helper: 'Marketing, referidos, ventas directas, anuncios, contenido.',
      },
      {
        id: 'q9',
        label:
          '¿Hay un "cliente que NO querés"? Describime quién no entra al producto aunque pague.',
      },
    ],
  },
  {
    number: 3,
    title: 'Modelo de negocio',
    questions: [
      {
        id: 'q10',
        label: '¿Cómo va a cobrar Eternity?',
        helper: 'Suscripción mensual, anual, por proyecto, freemium, pay-as-you-go.',
      },
      {
        id: 'q11',
        label:
          '¿Pensaste pricing? Si sí, ¿cuáles son los tiers tentativos? Si no, ¿cuándo lo querés definir?',
      },
      { id: 'q12', label: '¿Cuánto debería gastar un cliente promedio al mes?' },
      {
        id: 'q13',
        label: '¿Tenés idea de cuánto te cuesta operacionalmente cada cliente?',
        helper: 'API costs de Claude, Groq, Apify, hosting, soporte.',
      },
      { id: 'q14', label: '¿Hay funcionalidades premium que pensás cobrar aparte?' },
    ],
  },
  {
    number: 4,
    title: 'Relación con GovBidder',
    questions: [
      {
        id: 'q15',
        label: '¿Eternity y GovBidder van a tener relación comercial?',
        helper: 'Mismas oficinas, mismos clientes, mismo equipo, marcas separadas.',
      },
      {
        id: 'q16',
        label:
          '¿Querés que los clientes de Eternity sepan que tenés relación con GovBidder? ¿O las marcas son completamente independientes?',
      },
      {
        id: 'q17',
        label:
          'Si Santo y vos algún día se separan profesionalmente, ¿qué pasa con Eternity? ¿Es 100% tuyo?',
      },
      {
        id: 'q18',
        label:
          '¿Hay algo del modelo de negocio de Eternity que es información confidencial entre Santo y vos?',
      },
    ],
  },
  {
    number: 5,
    title: 'Features y roadmap',
    questions: [
      {
        id: 'q19',
        label:
          'De las features ya construidas, ¿cuáles son TUS favoritas, las que más valor entregan al cliente?',
        helper: 'Análisis de competidores, AI chat, transcripción, etc.',
      },
      {
        id: 'q20',
        label:
          '¿Cuáles son las features que decís "esto es lindo pero no es lo que vende el producto"?',
      },
      { id: 'q21', label: '¿Qué features faltan que vos sí o sí querés antes de empezar a vender?' },
      {
        id: 'q22',
        label:
          'Si pudieras quedarte con SOLO UNA feature (todas las demás desaparecen), ¿cuál sería?',
      },
      { id: 'q23', label: '¿Hay alguna feature que pensaste y después abandonaste? ¿Por qué?' },
    ],
  },
  {
    number: 6,
    title: 'Ventas y marketing',
    questions: [
      {
        id: 'q24',
        label: '¿Quién va a vender Eternity? ¿Vos? ¿Vas a tener vendedores? ¿Self-service?',
      },
      {
        id: 'q25',
        label: '¿Cómo planeás que el primer cliente conozca el producto?',
        helper: 'Marketing, contenido, referido, llamada en frío, otra cosa.',
      },
      {
        id: 'q26',
        label:
          '¿Tenés idea de qué decir cuando alguien te pregunta "¿por qué debería pagarte y no usar [competidor]?" Si sí, ¿cuál sería tu respuesta?',
      },
      {
        id: 'q27',
        label:
          '¿Hay alguna conversación con un potencial cliente que ya tuviste? Si sí, ¿qué te dijo que te marcó?',
      },
    ],
  },
  {
    number: 7,
    title: 'Operativa y equipo',
    questions: [
      {
        id: 'q28',
        label:
          '¿Quiénes van a operar Eternity una vez lance? Vos solo, equipo, contratistas, freelancers.',
      },
      { id: 'q29', label: '¿Cuánto tiempo a la semana podés dedicarle vos a Eternity?' },
      {
        id: 'q30',
        label: '¿Hay alguien técnico además de mí que va a tocar el código?',
        helper:
          'Si la respuesta es "ahora mismo no, pero sí en el futuro", decime cuándo aproximadamente.',
      },
      {
        id: 'q31',
        label: '¿Qué responsabilidades técnicas esperás que cubra YO específicamente?',
        helper:
          'Mantenimiento, features nuevas, arquitectura, deploy, soporte de bugs, seguridad — listá lo que va y lo que no.',
      },
    ],
  },
  {
    number: 8,
    title: 'Temas técnicos',
    questions: [
      {
        id: 'q32',
        label:
          '¿Eternity va a ser self-service (el cliente se da de alta solo) o asistido (vos o yo creamos cada cuenta)?',
      },
      {
        id: 'q33',
        label: '¿Cómo imaginás que un cliente nuevo se da de alta? Walk me through: paso 1, paso 2, paso 3…',
      },
      {
        id: 'q34',
        label:
          '¿Querés que cada cliente tenga su propio "espacio" de data 100% aislado del de los demás? ¿O hay info que se comparte entre clientes?',
        helper: 'Ej: análisis públicos de competidores.',
      },
      {
        id: 'q35',
        label:
          '¿Pensaste algo sobre integración con Stripe / MercadoPago para cobrar? ¿O eso lo decidís más adelante?',
      },
      {
        id: 'q36',
        label: '¿Cuántos clientes esperás manejar el primer año? ¿Los primeros 3 meses?',
        helper: 'Esto cambia decisiones de arquitectura críticas.',
      },
    ],
  },
  {
    number: 9,
    title: 'Decisiones pendientes',
    questions: [
      {
        id: 'q37',
        label:
          '¿Hay alguna decisión sobre Eternity que tenés posponiendo porque no terminás de definirla? Decime cuál y por qué.',
      },
      {
        id: 'q38',
        label: '¿Hay algún miedo o duda sobre el producto que no le contaste a nadie?',
        helper: 'No tenés que decirme cuál, solo si existe.',
      },
      {
        id: 'q39',
        label:
          'Si te pidiera priorizar las próximas 5 cosas a hacer en Eternity, ¿cuáles serían?',
      },
      { id: 'q40', label: '¿Cualquier cosa importante que sientas que tengo que saber y no pregunté?' },
    ],
  },
]

const ALL_QUESTION_IDS: string[] = SECTIONS.flatMap((s) => s.questions.map((q) => q.id))
const EMPTY: Record<string, string> = Object.fromEntries(ALL_QUESTION_IDS.map((id) => [id, '']))

export default function DiscoveryPage() {
  const [answers, setAnswers] = useState<Record<string, string>>(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <header className="mb-8">
        <p
          className="text-[11px] font-medium uppercase tracking-[0.2em]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Discovery · Eternity
        </p>
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
              setAnswers(EMPTY)
              setSubmitted(false)
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
