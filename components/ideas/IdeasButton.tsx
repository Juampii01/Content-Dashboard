'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lightbulb } from 'lucide-react'
import { IdeasDrawer } from './IdeasDrawer'

export function IdeasButton() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)

  // Load count on mount
  useEffect(() => {
    fetch('/api/ideas')
      .then(r => r.ok ? r.json() : { ideas: [] })
      .then((data: { ideas: unknown[] }) => setCount(data.ideas?.length ?? 0))
      .catch(() => {})
  }, [])

  const handleCountChange = useCallback((n: number) => setCount(n), [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed z-overlay flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 brand-glow"
        style={{ bottom: '5rem', right: '1.5rem', backgroundColor: 'var(--accent)' }}
        title="Baúl de ideas"
      >
        <Lightbulb size={20} style={{ color: 'var(--accent-foreground)' }} />
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--stat-icon)', color: '#ffffff' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <IdeasDrawer open={open} onClose={() => setOpen(false)} onCountChange={handleCountChange} />
    </>
  )
}
