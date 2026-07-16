'use client'

import { useMemo } from 'react'
import { Heart, MessageCircle, Send, Bookmark, Music2 } from 'lucide-react'

// ─── Block model ──────────────────────────────────────────────────────────────
// The editor stores TipTap HTML. We parse it into a flat list of blocks so the
// phone frame can typeset the script like a reel caption / teleprompter.

type Block =
  | { kind: 'section'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'rule' }

function parseBlocks(html: string): Block[] {
  if (typeof window === 'undefined' || !html) return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks: Block[] = []

  doc.body.childNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    const tag = node.tagName.toLowerCase()

    if (tag === 'hr') {
      blocks.push({ kind: 'rule' })
      return
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll('li'))
        .map((li) => (li.textContent ?? '').trim())
        .filter(Boolean)
      if (items.length) blocks.push({ kind: 'list', items })
      return
    }

    const text = (node.textContent ?? '').trim()
    if (!text) return

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      blocks.push({ kind: 'section', text })
    } else {
      blocks.push({ kind: 'text', text })
    }
  })

  return blocks
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GuionPhonePreviewProps {
  title: string
  html: string
  typeLabel: string | null
  wordCount: number
  duration: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GuionPhonePreview({ title, html, typeLabel, wordCount, duration }: GuionPhonePreviewProps) {
  const blocks = useMemo(() => parseBlocks(html), [html])
  const isEmpty = blocks.length === 0 && !title.trim()

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Header label */}
      <div className="flex items-center gap-2 self-stretch justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Vista previa
        </span>
        {duration && (
          <span className="text-[10px] font-medium tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
            {duration}
          </span>
        )}
      </div>

      {/* Phone frame */}
      <div
        className="relative w-full max-w-[300px] rounded-[2.2rem] p-2.5"
        style={{
          aspectRatio: '9 / 16',
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--foreground) 14%, var(--card)), color-mix(in srgb, var(--foreground) 4%, var(--card)))',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card), inset 0 0 0 1px color-mix(in srgb, var(--foreground) 6%, transparent)',
        }}
      >
        {/* Screen */}
        <div
          className="relative w-full h-full rounded-[1.7rem] overflow-hidden flex flex-col"
          style={{
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, var(--card)), var(--card) 55%)',
            border: '1px solid color-mix(in srgb, var(--foreground) 8%, transparent)',
          }}
        >
          {/* Notch */}
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
            <div
              className="w-16 h-1.5 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--foreground) 14%, transparent)' }}
            />
          </div>

          {/* Top account row */}
          <div className="flex items-center gap-2 px-3.5 pt-1.5 pb-2 flex-shrink-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              @
            </div>
            <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>
              tu_cuenta
            </span>
            {typeLabel && (
              <span
                className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
                  color: 'var(--accent)',
                }}
              >
                {typeLabel}
              </span>
            )}
          </div>

          {/* Caption / teleprompter body */}
          <div className="flex-1 overflow-y-auto px-3.5 pb-2" style={{ scrollbarWidth: 'none' }}>
            {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
                <Music2 size={20} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                  Tu guión se ve acá como un reel mientras escribís.
                </p>
              </div>
            ) : (
              <>
                {title.trim() && (
                  <p
                    className="text-[15px] font-extrabold leading-tight mb-2.5 tracking-tight"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {title}
                  </p>
                )}
                <div className="space-y-2">
                  {blocks.map((block, i) => {
                    if (block.kind === 'rule') {
                      return (
                        <div
                          key={i}
                          className="my-2 h-px"
                          style={{ background: 'color-mix(in srgb, var(--foreground) 12%, transparent)' }}
                        />
                      )
                    }
                    if (block.kind === 'section') {
                      return (
                        <p
                          key={i}
                          className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] pt-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          {block.text}
                        </p>
                      )
                    }
                    if (block.kind === 'list') {
                      return (
                        <ul key={i} className="space-y-1">
                          {block.items.map((item, j) => (
                            <li
                              key={j}
                              className="flex gap-1.5 text-[11.5px] leading-snug"
                              style={{ color: 'color-mix(in srgb, var(--foreground) 88%, transparent)' }}
                            >
                              <span style={{ color: 'var(--accent)' }}>·</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    }
                    return (
                      <p
                        key={i}
                        className="text-[11.5px] leading-snug"
                        style={{ color: 'color-mix(in srgb, var(--foreground) 88%, transparent)' }}
                      >
                        {block.text}
                      </p>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Bottom action rail */}
          <div
            className="flex items-center justify-end gap-3.5 px-3.5 py-2.5 flex-shrink-0"
            style={{ borderTop: '1px solid color-mix(in srgb, var(--foreground) 7%, transparent)' }}
          >
            <Heart size={15} style={{ color: 'var(--muted-foreground)', opacity: 0.75 }} />
            <MessageCircle size={15} style={{ color: 'var(--muted-foreground)', opacity: 0.75 }} />
            <Send size={15} style={{ color: 'var(--muted-foreground)', opacity: 0.75 }} />
            <Bookmark size={15} style={{ color: 'var(--muted-foreground)', opacity: 0.75 }} />
          </div>
        </div>
      </div>

      {/* Under-frame meta */}
      <p className="text-[10px] tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.55 }}>
        {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
      </p>
    </div>
  )
}
