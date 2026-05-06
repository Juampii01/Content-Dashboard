'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DEFAULT_MODEL } from '@/lib/claude/models'
import type { ClaudeModelId } from '@/lib/claude/models'
import { AIModelSelector } from './AIModelSelector'
import { collectWorkspaceContext } from '@/lib/ai/collect-workspace-context'
import { EmptyState } from './EmptyState'
import { MessageList, type UIMessage } from './MessageList'
import { ChatInput } from './ChatInput'
import { ConversationSidebar } from './ConversationSidebar'
import type { ConversationDTO, GetConversationResponse, ListConversationsResponse } from '@/lib/types/ai'

export function EternityAIContent() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [model, setModel] = useState<ClaudeModelId>(DEFAULT_MODEL)
  const [conversations, setConversations] = useState<ConversationDTO[]>([])
  const [convsLoading, setConvsLoading] = useState(false)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      readerRef.current?.cancel().catch(() => {})
    }
  }, [])

  // Load conversation list on mount
  const fetchConversations = useCallback(async () => {
    setConvsLoading(true)
    try {
      const res = await fetch('/api/ai/conversations', { credentials: 'same-origin' })
      if (res.ok) {
        const data = (await res.json()) as ListConversationsResponse
        if (mountedRef.current) setConversations(data.conversations)
      }
    } catch {
      // Silently fail — sidebar is non-critical
    } finally {
      if (mountedRef.current) setConvsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  const handleNew = useCallback(() => {
    readerRef.current?.cancel().catch(() => {})
    setActiveId(null)
    setMessages([])
    setInput('')
  }, [])

  const handleSelectConversation = useCallback(async (id: string) => {
    if (id === activeId) return
    readerRef.current?.cancel().catch(() => {})
    setActiveId(id)
    setMessages([])
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { credentials: 'same-origin' })
      if (!res.ok) return
      const data = (await res.json()) as GetConversationResponse
      if (mountedRef.current) {
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            isStreaming: false,
          })),
        )
      }
    } catch {
      toast.error('No se pudo cargar la conversación')
    }
  }, [activeId])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/ai/conversations/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) {
        setActiveId(null)
        setMessages([])
      }
    } catch {
      toast.error('No se pudo eliminar la conversación')
    }
  }, [activeId])

  const sendMessage = useCallback(
    async (textToSend: string) => {
      const content = textToSend.trim()
      if (!content || sending) return

      setInput('')
      setSending(true)

      const userMsgId = `local_user_${Date.now()}`
      const assistantMsgId = `local_asst_${Date.now()}`

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: 'user', content },
        { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true },
      ])

      try {
        const workspace = await collectWorkspaceContext()

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            conversationId: activeId ?? undefined,
            content,
            model,
            context: workspace,
          }),
        })

        if (!res.ok || !res.body) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(errBody.error ?? `Error ${res.status}`)
        }

        const returnedId = res.headers.get('x-conversation-id')
        if (returnedId && returnedId !== activeId) {
          setActiveId(returnedId)
          // Refresh conversation list after creating new one
          void fetchConversations()
        }

        readerRef.current = res.body.getReader()
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await readerRef.current.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m,
              ),
            )
          }
        } finally {
          readerRef.current = null
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
          ),
        )
        // Refresh list so title / updatedAt reflects the new message
        void fetchConversations()
      } catch (err) {
        if (!mountedRef.current) return
        const msg = err instanceof Error ? err.message : 'Error al enviar'
        toast.error(msg)
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsgId ? { ...m, isStreaming: false } : m)
        )
        setMessages((prev) =>
          prev.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId),
        )
      } finally {
        if (mountedRef.current) setSending(false)
      }
    },
    [activeId, model, sending, fetchConversations],
  )

  const handleSuggestion = useCallback(
    (text: string) => {
      void sendMessage(text)
    },
    [sendMessage],
  )

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const showEmpty = messages.length === 0 && !sending

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-0 flex-1">
      {/* ── Main chat area ── */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Top bar: model selector */}
        <div
          className="flex flex-shrink-0 items-center justify-end px-4 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <AIModelSelector value={model} onChange={setModel} />
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {showEmpty ? (
            <EmptyState onPickSuggestion={handleSuggestion} />
          ) : (
            <MessageList messages={messages} />
          )}
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => void sendMessage(input)}
            disabled={sending}
            autoFocus
          />
        </div>
      </div>

      {/* ── Conversation sidebar (right) ── */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        loading={convsLoading}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onNew={handleNew}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
      />
    </div>
  )
}
