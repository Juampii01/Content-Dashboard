'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyResultListProps {
  items: string[]
}

export function CopyResultList({ items }: CopyResultListProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyItem = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={item}
          className="flex items-start gap-3 rounded-xl p-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <span
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}
          >
            {i + 1}
          </span>
          <p className="flex-1 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
            {item}
          </p>
          <button
            onClick={() => copyItem(item)}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:opacity-80"
            style={{
              backgroundColor: copied === item ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--muted)',
              color: copied === item ? 'var(--accent)' : 'var(--muted-foreground)',
            }}
            title="Copiar"
          >
            {copied === item ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      ))}
    </div>
  )
}
