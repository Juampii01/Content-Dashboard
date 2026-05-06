'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot } from 'lucide-react'

export interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

interface MessageListProps {
  messages: UIMessage[]
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      >
        {content}
      </div>
    </div>
  )
}

function AssistantBubble({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--accent) 15%, var(--card))',
          border: '1px solid var(--border)',
        }}
      >
        <Bot size={14} style={{ color: 'var(--accent)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="mb-1 text-xs font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          Eternity
        </p>
        <div
          className="prose-eternity max-w-none text-sm leading-relaxed"
          style={{ color: 'var(--foreground)' }}
        >
          {content.length > 0 ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          ) : (
            <span style={{ color: 'var(--muted-foreground)' }}>Pensando…</span>
          )}
          {isStreaming && content.length > 0 && (
            <span
              className="ml-1 inline-block h-3 w-0.5 animate-pulse rounded-full align-middle"
              style={{ backgroundColor: 'var(--accent)' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      {messages.map((m) =>
        m.role === 'user' ? (
          <UserBubble key={m.id} content={m.content} />
        ) : (
          <AssistantBubble
            key={m.id}
            content={m.content}
            isStreaming={m.isStreaming}
          />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  )
}
