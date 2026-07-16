'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChipEditor } from '../ChipEditor'
import { useAISuggest, AISuggestButton, GhostChips } from '../AISuggest'
import { BASES_GENERATE_FIELDS, type BasesGenerateField } from '@/lib/schemas/bases/generate'

interface ChipListSectionProps {
  sectionId: string
  title: string
  description: string
  placeholder: string
  chipColor?: string
  emptyMessage?: string
}

const COLORS: Record<string, string> = {
  problemas: 'var(--accent)',
  dolores:   '#C49A6C',
  deseos:    'var(--warning)',
  keywords:  '#5C4B50',
}

export function ChipListSection({
  sectionId, title, description, placeholder, chipColor, emptyMessage,
}: ChipListSectionProps) {
  const color        = chipColor ?? COLORS[sectionId] ?? 'var(--accent)'
  const [items, setItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Only these section ids map to a valid AI-generate field.
  const aiField = BASES_GENERATE_FIELDS.includes(sectionId as BasesGenerateField)
    ? (sectionId as BasesGenerateField)
    : null

  // Load from API on mount / sectionId change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading on sectionId change before fetch
    setLoading(true)
    fetch(`/api/bases/${sectionId}`)
      .then((r) => r.json())
      .then((row) => {
        if (!row) return
        try {
          const parsed = JSON.parse(row.items ?? '[]')
          if (Array.isArray(parsed)) {
            setItems(parsed.filter((x: unknown): x is string => typeof x === 'string'))
          }
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sectionId])

  const save = useCallback((next: string[]) => {
    setItems(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/bases/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next }),
      }).catch(() => {})
    }, 400)
  }, [sectionId])

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const ai = useAISuggest(aiField ?? 'dolores')

  const pickSuggestion = useCallback((value: string) => {
    const val = value.trim()
    if (val && !items.includes(val)) save([...items, val])
    ai.dropSuggestion(value)
  }, [items, save, ai])

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl px-5 py-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</p>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: color + '22', color }}>
                {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
              </span>
            )}
            {aiField && (
              <AISuggestButton onClick={ai.suggest} loading={ai.loading} color={color} />
            )}
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>{description}</p>

        {!loading && items.length === 0 && (
          <p className="text-xs mb-3 italic" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
            {emptyMessage ?? 'Aún no has añadido ningún ítem. Empieza escribiendo abajo.'}
          </p>
        )}

        {loading ? (
          <div className="flex flex-wrap gap-2 py-1">
            {[60, 90, 72, 50, 80].map((w, i) => (
              <div key={i} className="h-6 rounded-full animate-pulse" style={{ width: `${w}px`, backgroundColor: 'var(--muted)' }} />
            ))}
          </div>
        ) : (
          <ChipEditor
            items={items}
            onChange={save}
            placeholder={placeholder}
            chipColor={color}
          />
        )}

        {aiField && (
          <GhostChips
            suggestions={ai.suggestions}
            error={ai.error}
            color={color}
            onPick={pickSuggestion}
            onDismissAll={ai.clear}
          />
        )}
      </div>
    </div>
  )
}
