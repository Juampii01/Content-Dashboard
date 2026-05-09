'use client'

/**
 * CopyButton — copy text to the clipboard, then flash a check icon
 * for ~1.4s. Used wherever the user wants the contents of a panel
 * (transcript text, AI summary, generated copy) on their clipboard.
 *
 * Extracted from TranscriptView so it's reusable, has consistent feedback,
 * and ships a polite SR announcement on success.
 */
import { useCallback, useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyButtonProps {
  /** Text written to the clipboard on click. */
  text: string
  /** Visible label when idle. */
  label: string
  /** Override the success label (default "Copiado"). */
  successLabel?: string
  /** Optional className appended after the defaults. */
  className?: string
}

export function CopyButton({
  text,
  label,
  successLabel = 'Copiado',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleClick = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }, [text])

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${className}`}
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        color: 'var(--muted-foreground)',
      }}
    >
      {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      {copied ? successLabel : label}
    </button>
  )
}
