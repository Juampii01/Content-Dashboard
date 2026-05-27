'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Inbox,
  Send,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  MessageSquare,
} from 'lucide-react'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { useInstagramMessages, type IGConversation, type IGMessage } from '@/hooks/useInstagramMessages'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WINDOW_MS = 24 * 60 * 60 * 1000

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

function isWindowOpen(conv: IGConversation): boolean {
  if (!conv.lastUserMessageAt) return false
  return Date.now() - new Date(conv.lastUserMessageAt).getTime() < WINDOW_MS
}

function windowTimeLeft(conv: IGConversation): string {
  if (!conv.lastUserMessageAt) return ''
  const remaining = WINDOW_MS - (Date.now() - new Date(conv.lastUserMessageAt).getTime())
  if (remaining <= 0) return 'Expirada'
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m restantes`
  return `${m}m restantes`
}

function Avatar({ username, size = 36 }: { username: string; size?: number }) {
  const letter = (username?.[0] ?? '?').toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
        fontSize: size < 32 ? 11 : 13,
      }}
    >
      {letter}
    </div>
  )
}

// ─── Conversation list ────────────────────────────────────────────────────────

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  syncing,
}: {
  conversations: IGConversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  syncing: boolean
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
        {syncing ? (
          <>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
              Cargando conversaciones…
            </p>
          </>
        ) : (
          <>
            <Inbox size={24} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
              No hay conversaciones. Hacé sync para cargar los DMs.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {conversations.map(c => {
        const selected = selectedId === c.conversationId
        const open = isWindowOpen(c)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.conversationId)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
            style={{
              backgroundColor: selected ? 'var(--accent)' : 'transparent',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <Avatar username={c.participantUsername} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: selected ? 'var(--accent-foreground)' : 'var(--foreground)' }}
                >
                  @{c.participantUsername || c.participantId}
                </p>
                {c.lastMessageAt && (
                  <span
                    className="text-xs flex-shrink-0"
                    style={{ color: selected ? 'var(--accent-foreground)' : 'var(--muted-foreground)' }}
                  >
                    {timeAgo(c.lastMessageAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: open ? '#16a34a' : 'var(--muted-foreground)' }}
                />
                <span
                  className="text-xs"
                  style={{ color: selected ? 'var(--accent-foreground)' : 'var(--muted-foreground)' }}
                >
                  {open ? windowTimeLeft(c) : 'Ventana cerrada'}
                </span>
                {c.unreadCount > 0 && (
                  <span
                    className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
                  >
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: IGMessage }) {
  const isBiz = msg.isFromBusiness
  return (
    <div className={`flex ${isBiz ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isBiz && (
        <Avatar username={msg.fromUsername} size={28} />
      )}
      <div
        className={`max-w-xs rounded-2xl px-3 py-2 ${isBiz ? 'rounded-br-sm' : 'rounded-bl-sm ml-2'}`}
        style={{
          backgroundColor: isBiz ? 'var(--accent)' : 'var(--muted)',
          color: isBiz ? 'var(--accent-foreground)' : 'var(--foreground)',
        }}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
        <p
          className="text-xs mt-1 text-right"
          style={{ opacity: 0.7 }}
        >
          {timeAgo(msg.timestamp)}
        </p>
      </div>
    </div>
  )
}

// ─── Thread panel ─────────────────────────────────────────────────────────────

function ThreadPanel({ conversationId }: { conversationId: string }) {
  const { threadState, sending, loadThread, sendMessage } = useInstagramMessages()
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Clear text/error AFTER loadThread resolves so there's no synchronous
    // setState in the effect body (react-compiler/react-compiler lint rule).
    void loadThread(conversationId).then(() => {
      setText('')
      setSendError('')
    })
  }, [conversationId, loadThread])

  // Scroll to bottom when messages load/update
  useEffect(() => {
    if (threadState.status === 'ok') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [threadState])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSendError('')
    const result = await sendMessage(conversationId, text.trim())
    if (result.ok) {
      setText('')
    } else {
      const msg = result.error === 'MESSAGING_WINDOW_CLOSED'
        ? 'La ventana de 24h está cerrada. El usuario debe escribirte primero.'
        : result.error
      setSendError(msg)
    }
  }

  if (threadState.status === 'loading') {
    return (
      <div className="p-4 space-y-3">
        {[0,1,2,3].map(i => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-40'}`} />
          </div>
        ))}
      </div>
    )
  }

  if (threadState.status === 'error') {
    return (
      <div className="p-4 flex items-start gap-2">
        <AlertCircle size={14} style={{ color: 'var(--muted-foreground)', marginTop: 2 }} />
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          No se pudo cargar la conversación.
        </p>
      </div>
    )
  }

  if (threadState.status !== 'ok') return null

  const { conversation, messages } = threadState
  const windowOpen = isWindowOpen(conversation)

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div
        className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Avatar username={conversation.participantUsername} size={32} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            @{conversation.participantUsername || conversation.participantId}
          </p>
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: windowOpen ? '#16a34a' : 'var(--muted-foreground)' }}
            />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {windowOpen
                ? `Ventana abierta · ${windowTimeLeft(conversation)}`
                : 'Ventana cerrada · esperá que el usuario escriba'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <MessageSquare size={24} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Sin mensajes</p>
          </div>
        ) : (
          messages.map(msg => <Bubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* 24h warning */}
      {!windowOpen && (
        <div
          className="mx-4 mb-2 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <Clock size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            La ventana de 24h está cerrada. El usuario debe enviarte un mensaje primero.
          </p>
        </div>
      )}

      {/* Send form */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 px-4 pb-4 flex-shrink-0"
      >
        <div className="flex-1 space-y-1">
          {sendError && (
            <p className="text-xs px-1" style={{ color: '#dc2626' }}>{sendError}</p>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(e) }
            }}
            placeholder={windowOpen ? 'Escribe un mensaje… (Enter para enviar)' : 'Ventana cerrada'}
            disabled={!windowOpen || sending}
            rows={2}
            maxLength={1000}
            className="w-full rounded-xl px-3 py-2 text-sm resize-none"
            style={{
              backgroundColor: 'var(--input)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              outline: 'none',
              opacity: windowOpen ? 1 : 0.5,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!windowOpen || sending || !text.trim()}
          className="btn btn-primary flex-shrink-0"
          style={{ padding: '8px 12px' }}
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function MensajesTab() {
  const { connected } = useInstagramDataContext()
  const { convsState, syncing, loadConversations, sync } = useInstagramMessages()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Use a ref (not state) for the auto-sync flag — it's a one-time guard that
  // doesn't affect render output, so a ref avoids the synchronous-setState-in-
  // effect lint error (react-compiler/react-compiler).
  const autoSyncAttemptedRef = useRef(false)

  // On mount (when connected), load conversations from DB.
  useEffect(() => {
    if (connected) void loadConversations()
  }, [connected, loadConversations])

  // Auto-sync the first time we get an empty result, so the user doesn't
  // have to click the refresh button manually on first visit.
  useEffect(() => {
    if (
      connected &&
      convsState.status === 'ok' &&
      convsState.conversations.length === 0 &&
      !autoSyncAttemptedRef.current
    ) {
      autoSyncAttemptedRef.current = true
      void sync()
    }
  }, [connected, convsState, sync])

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Inbox size={32} style={{ color: 'var(--muted-foreground)' }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Conectá tu cuenta de Instagram para gestionar mensajes.
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        height: 'calc(100vh - 220px)',
        minHeight: 480,
      }}
    >
      {/* Left: conversation list */}
      <div
        className="w-72 flex-shrink-0 flex flex-col"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
            MENSAJES
          </p>
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="btn btn-secondary btn-sm"
          >
            {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convsState.status === 'loading' && (
            <div className="p-4 space-y-3">
              {[0,1,2].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {convsState.status === 'error' && (
            <div className="p-4 flex items-start gap-2">
              <AlertCircle size={13} style={{ color: 'var(--muted-foreground)', marginTop: 1 }} />
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                No se pudieron cargar las conversaciones.
              </p>
            </div>
          )}

          {convsState.status === 'ok' && (
            <ConversationList
              conversations={convsState.conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              syncing={syncing}
            />
          )}
        </div>
      </div>

      {/* Right: thread */}
      <div className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Inbox size={28} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Seleccioná una conversación
            </p>
          </div>
        ) : (
          <ThreadPanel conversationId={selectedId} />
        )}
      </div>
    </div>
  )
}
