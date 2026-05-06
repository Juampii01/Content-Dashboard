'use client'

import { useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled: boolean
  autoFocus?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  autoFocus,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-grow
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim().length > 0) onSend()
    }
  }

  const canSend = !disabled && value.trim().length > 0

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
      <div
        className="flex items-end gap-2 rounded-2xl px-4 py-3"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Preguntale a Eternity…"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:opacity-50"
          style={{ color: 'var(--foreground)', lineHeight: '1.5', maxHeight: '200px' }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Enviar"
          className="flex-shrink-0 rounded-lg p-2 transition-opacity disabled:opacity-40"
          style={{
            backgroundColor: canSend
              ? 'var(--accent)'
              : 'color-mix(in srgb, var(--accent) 20%, transparent)',
            color: canSend ? 'var(--accent-foreground)' : 'var(--accent)',
          }}
        >
          {disabled ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      <p
        className="mt-2 text-center text-[10px]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Shift + Enter para nueva línea
      </p>
    </div>
  )
}
