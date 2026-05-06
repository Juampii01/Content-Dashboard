'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Send, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ModelSelector } from '@/components/competidores/ModelSelector'
import { DEFAULT_MODEL } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'
import type {
  ReelDTO,
  TranscriptionDTO,
  AnalysisDTO,
  ChatMessageDTO,
  ChatRequest,
  GetChatResponse,
} from '@/lib/types/competidores'

interface ChatSectionProps {
  reel: ReelDTO
  transcription: TranscriptionDTO | null
  analyses: AnalysisDTO[]
}

interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

function ChatBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
        style={{
          backgroundColor: isUser
            ? 'color-mix(in srgb, var(--accent) 20%, var(--card))'
            : 'var(--card)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          borderBottomRightRadius: isUser ? '4px' : undefined,
          borderBottomLeftRadius: !isUser ? '4px' : undefined,
        }}
      >
        {message.content}
        {message.isStreaming && (
          <span
            className="ml-1 inline-block h-3 w-0.5 animate-pulse rounded-full"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Tab 4 — Chat.
 * Loads history on mount. Sends messages with streaming response via ReadableStream.
 * Re-fetches GET after stream ends to sync persisted messages.
 */
export function ChatSection({ reel, transcription, analyses }: ChatSectionProps) {
  // Why destructure `analyses` here: the prop is sourced by the parent
  // (ReelDetailDrawer) and passed through for context. The server route
  // `/api/reels/[id]/chat` loads analyses from DB for the LLM prompt, so we
  // do not forward them in the request body — but we expose a readable
  // indicator to the user so they know the chat has richer context than
  // transcription alone. A prior lint pass removed this destructure,
  // silently regressing the "N análisis previos" badge.
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(DEFAULT_MODEL)
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)

  // Cancel any in-flight stream reader on unmount
  useEffect(() => {
    return () => { readerRef.current?.cancel().catch(() => {}) }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Load history on mount (or when reel.id changes)
  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/reels/${reel.id}/chat`, {
        credentials: 'same-origin',
        signal,
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = (await res.json()) as GetChatResponse
      if (mountedRef.current) {
        setMessages(
          data.messages.map((m: ChatMessageDTO) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })),
        )
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Error cargando historial'
      toast.error(msg)
    } finally {
      if (mountedRef.current) setLoadingHistory(false)
    }
  }, [reel.id])

  useEffect(() => {
    const controller = new AbortController()
    void loadHistory(controller.signal)
    return () => controller.abort()
  }, [loadHistory])

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    setInput('')
    setSending(true)

    // Optimistic user message
    const userMsgId = `local_user_${Date.now()}`
    const assistantMsgId = `local_asst_${Date.now()}`

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content },
      { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true },
    ])

    try {
      const body: ChatRequest = { content, model: selectedModel }
      const res = await fetch(`/api/reels/${reel.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      })

      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody.error ?? `Error ${res.status}`)
      }

      // Stream the response
      readerRef.current = res.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await readerRef.current.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: m.content + text }
                : m,
            ),
          )
        }
      } finally {
        readerRef.current = null
      }

      // Mark stream done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
        ),
      )

      // Re-fetch to sync persisted messages (replaces optimistic with DB-backed)
      await loadHistory()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar mensaje'
      toast.error(msg)
      // Remove the optimistic messages on error
      setMessages((prev) =>
        prev.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId),
      )
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar: model selector */}
      <div className="flex-shrink-0 p-3 pb-2">
        <ModelSelector value={selectedModel} onChange={setSelectedModel} />
      </div>

      {/* Context badges: transcription + analyses count */}
      <div className="mx-3 mb-2 flex flex-wrap items-center gap-2 flex-shrink-0">
        {!transcription && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
              color: 'var(--muted-foreground)',
            }}
          >
            <AlertCircle size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            Sin transcripción, las respuestas serán más genéricas.
          </div>
        )}
        {analyses.length > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: 'var(--muted-foreground)',
            }}
            title="El asistente tiene acceso a los análisis previos de este reel"
          >
            {analyses.length} análisis {analyses.length === 1 ? 'previo' : 'previos'}
          </div>
        )}
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1 px-3">
        <div className="flex flex-col gap-2 py-2">
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
            </div>
          ) : messages.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 rounded-xl p-6 text-center"
              style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Pregúntale algo sobre este reel. El asistente tiene el caption, la transcripción y
                el último análisis como contexto.
              </p>
            </div>
          ) : (
            messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div
        className="flex-shrink-0 p-3 pt-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--border)',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje… (Enter para enviar)"
            disabled={sending}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            style={{
              color: 'var(--foreground)',
              maxHeight: '120px',
              lineHeight: '1.5',
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            aria-label="Enviar mensaje"
            className="flex-shrink-0 rounded-lg p-1.5 transition-opacity disabled:opacity-40"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)',
              color: 'var(--accent)',
            }}
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="mt-1 text-center text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
          Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}
