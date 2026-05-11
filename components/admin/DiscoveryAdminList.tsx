'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Mail, Calendar } from 'lucide-react'
import { SECTIONS } from '@/lib/discovery/questions'

export interface DiscoveryItem {
  id: string
  userId: string
  clientId: string | null
  email: string | null
  createdAt: string
  answers: Record<string, string | null>
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function answeredCount(answers: Record<string, string | null>): number {
  return Object.values(answers).filter((v) => typeof v === 'string' && v.trim().length > 0).length
}

export function DiscoveryAdminList({ items }: { items: DiscoveryItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const totalQuestions = useMemo(
    () => SECTIONS.reduce((s, sec) => s + sec.questions.length, 0),
    [],
  )

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 text-center text-sm"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--muted-foreground)',
        }}
      >
        Todavía no hay respuestas. Cuando alguien envíe el formulario en{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>
          /discovery
        </code>
        , las vas a ver acá.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = expanded.has(item.id)
        const filled = answeredCount(item.answers)
        return (
          <div
            key={item.id}
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer transition-opacity hover:opacity-90"
            >
              <div className="flex items-center gap-3 min-w-0">
                {isOpen ? (
                  <ChevronDown size={16} style={{ color: 'var(--muted-foreground)' }} />
                ) : (
                  <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    <Mail size={12} style={{ color: 'var(--muted-foreground)' }} />
                    <span className="truncate">{item.email ?? '(email desconocido)'}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} /> {formatDate(item.createdAt)}
                    </span>
                    {item.clientId && (
                      <span className="truncate">cliente: {item.clientId.slice(0, 8)}…</span>
                    )}
                  </div>
                </div>
              </div>
              <span
                className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                }}
              >
                {filled} / {totalQuestions} respondidas
              </span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 space-y-6" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                {SECTIONS.map((section) => (
                  <section key={section.number}>
                    <div className="mb-3 flex items-baseline gap-2">
                      <span
                        className="text-[10px] font-bold tracking-wider"
                        style={{ color: 'var(--accent)' }}
                      >
                        BLOQUE {section.number}
                      </span>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        {section.title}
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {section.questions.map((q) => {
                        const answer = item.answers[q.id]
                        const hasAnswer = typeof answer === 'string' && answer.trim().length > 0
                        return (
                          <div key={q.id}>
                            <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--muted-foreground)' }}>
                              {q.label}
                            </p>
                            <p
                              className="mt-1 text-sm whitespace-pre-wrap"
                              style={{
                                color: hasAnswer ? 'var(--foreground)' : 'var(--muted-foreground)',
                                fontStyle: hasAnswer ? 'normal' : 'italic',
                              }}
                            >
                              {hasAnswer ? answer : '— sin respuesta —'}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
