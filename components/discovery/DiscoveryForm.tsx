'use client'

import { useRef, useState } from 'react'
import type { DiscoveryBlock } from '@/lib/discovery/questions'

interface DiscoveryFormProps {
  blocks: DiscoveryBlock[]
  initialAnswers: Record<string, string>
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function DiscoveryForm({
  blocks,
  initialAnswers,
}: DiscoveryFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
  const [states, setStates] = useState<Record<string, SaveState>>({})
  const lastSaved = useRef<Record<string, string>>({ ...initialAnswers })

  async function persist(questionId: string, answer: string) {
    setStates((s) => ({ ...s, [questionId]: 'saving' }))
    try {
      const res = await fetch('/api/discovery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      lastSaved.current[questionId] = answer
      setStates((s) => ({ ...s, [questionId]: 'saved' }))
    } catch {
      setStates((s) => ({ ...s, [questionId]: 'error' }))
    }
  }

  function handleBlur(questionId: string) {
    const current = answers[questionId] ?? ''
    if (lastSaved.current[questionId] === current) return
    void persist(questionId, current)
  }

  return (
    <div className="flex flex-col gap-10">
      {blocks.map((block) => (
        <section key={block.id} className="flex flex-col gap-5">
          <header>
            <p className="text-eyebrow mb-1">Bloque {block.number}</p>
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--foreground)' }}
            >
              {block.title}
            </h2>
          </header>
          {block.questions.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl p-4"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card-sm)',
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <span
                  className="inline-flex items-center justify-center h-6 min-w-[1.75rem] px-1.5 rounded-md text-[11px] font-semibold tabular-nums shrink-0"
                  style={{
                    background:
                      'color-mix(in srgb, var(--accent) 14%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  {q.number}
                </span>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--foreground)' }}
                >
                  {q.text}
                </p>
              </div>
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
                onBlur={() => handleBlur(q.id)}
                placeholder="Escribí tu respuesta…"
                rows={4}
                maxLength={10_000}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-y"
                style={{
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  minHeight: '6rem',
                }}
              />
              <div
                className="flex justify-end mt-1.5 text-[11px] h-4"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {states[q.id] === 'saving' && 'Guardando…'}
                {states[q.id] === 'saved' && 'Guardado'}
                {states[q.id] === 'error' && (
                  <span style={{ color: 'var(--accent)' }}>
                    Error — reintentá
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
