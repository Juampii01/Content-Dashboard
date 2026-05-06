'use client'

import { useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'

interface ChipEditorProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  chipColor?: string
}

export function ChipEditor({ items, onChange, placeholder = 'Escribe y pulsa Enter', chipColor = 'var(--accent)' }: ChipEditorProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const val = input.trim()
    if (val && !items.includes(val)) {
      onChange([...items, val])
    }
    setInput('')
  }

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map((item, i) => (
        <span
          key={item}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ backgroundColor: chipColor + '22', color: chipColor, border: `1px solid ${chipColor}44` }}
        >
          {item}
          <button
            onClick={() => remove(i)}
            className="flex-shrink-0 rounded-full hover:opacity-100 opacity-60 transition-opacity"
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {/* Inline add */}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add() }
            if (e.key === 'Escape') setInput('')
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused || input ? placeholder : '+ Añadir'}
          className="text-xs px-2 py-1 rounded-full outline-none min-w-0 transition-all"
          style={{
            width: input ? `${Math.max(80, input.length * 8 + 24)}px` : '72px',
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            border: `1px solid ${focused ? chipColor : 'var(--border)'}`,
          }}
        />
        {input && (
          <button
            onClick={add}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: chipColor }}
          >
            <Plus size={10} style={{ color: '#fff' }} />
          </button>
        )}
      </div>
    </div>
  )
}
