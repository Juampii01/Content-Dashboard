'use client'
import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, ChevronLeft, MessageSquare, Hash, Loader2, AlertCircle, Clock, Inbox, RefreshCw } from 'lucide-react'
import { IG_GRADIENT_CSS } from './ig-theme'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { useInstagramMessages, type IGConversation } from '@/hooks/useInstagramMessages'

type InboxMode = 'dms' | 'comments'

const WINDOW_MS = 24 * 60 * 60 * 1000

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return Math.floor(diff / 60) + 'm'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h'
  return Math.floor(diff / 86400) + 'd'
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

export function IGInbox() {
  const { connected } = useInstagramDataContext()
  const { convsState, threadState, syncing, sending, loadConversations, sync, loadThread, sendMessage } = useInstagramMessages()
  const [mode, setMode] = useState<InboxMode>('dms')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sendError, setSendError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoSyncAttemptedRef = useRef(false)

  useEffect(() => {
    if (connected) void loadConversations()
  }, [connected, loadConversations])

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

  useEffect(() => {
    if (!selectedId) return
    void loadThread(selectedId).then(() => {
      setReply('')
      setSendError('')
    })
  }, [selectedId, loadThread])

  useEffect(() => {
    if (threadState.status === 'ok') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [threadState])

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Inbox size={32} className="text-[var(--muted-foreground)]" />
        <p className="text-sm text-[var(--muted-foreground)]">Conectá tu cuenta de Instagram para gestionar mensajes.</p>
      </div>
    )
  }

  const conversations = convsState.status === 'ok' ? convsState.conversations : []
  const selectedConv = conversations.find(c => c.conversationId === selectedId) ?? null
  const messages = threadState.status === 'ok' ? threadState.messages : []
  const windowOpen = selectedConv ? isWindowOpen(selectedConv) : false

  async function handleSend() {
    if (!reply.trim() || !selectedId || sending) return
    setSendError('')
    const result = await sendMessage(selectedId, reply.trim())
    if (result.ok) {
      setReply('')
    } else {
      const msg = result.error === 'MESSAGING_WINDOW_CLOSED'
        ? 'La ventana de 24h está cerrada. El usuario debe escribirte primero.'
        : (result.error ?? 'Error al enviar')
      setSendError(msg)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden" style={{ minHeight: 480 }}>
      {/* Header */}
      <div className="flex items-center border-b border-[var(--border)] px-4 py-3 gap-3">
        {selectedId && (
          <button onClick={() => setSelectedId(null)} className="mr-1">
            <ChevronLeft size={18} className="text-[var(--muted-foreground)]" />
          </button>
        )}
        <div className="flex gap-1 flex-1">
          {(['dms', 'comments'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelectedId(null) }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${mode === m ? IG_GRADIENT_CSS + ' text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
            >
              {m === 'dms' ? <><MessageSquare size={12} /> DMs</> : <><Hash size={12} /> Comentarios</>}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className="btn btn-secondary btn-sm"
        >
          {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        </button>
        {conversations.length > 0 && !selectedId && (
          <span className="text-xs text-[var(--muted-foreground)]">{conversations.length} conv.</span>
        )}
      </div>

      {mode === 'dms' && !selectedId && (
        /* Conversation list */
        <div className="divide-y divide-[var(--border)]">
          {convsState.status === 'loading' && (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--muted)] animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-24" />
                    <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {convsState.status === 'error' && (
            <div className="p-4 flex items-start gap-2">
              <AlertCircle size={13} className="text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[var(--muted-foreground)]">No se pudieron cargar las conversaciones.</p>
            </div>
          )}
          {convsState.status === 'ok' && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle size={32} className="text-[var(--muted-foreground)] opacity-40 mb-3" />
              <p className="text-sm text-[var(--muted-foreground)]">No hay mensajes aún</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Sincronizá para cargar DMs</p>
            </div>
          )}
          {convsState.status === 'ok' && conversations.slice(0, 20).map(conv => {
            const open = isWindowOpen(conv)
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.conversationId)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--muted)]/30 transition-colors text-left"
              >
                <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold ${conv.unreadCount > 0 ? IG_GRADIENT_CSS + ' text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                  {conv.participantPic
                    ? <img src={conv.participantPic} className="w-full h-full rounded-full object-cover" alt="" />
                    : conv.participantUsername.charAt(0).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${conv.unreadCount > 0 ? 'font-bold text-[var(--foreground)]' : 'font-medium text-[var(--foreground)]'}`}>
                      @{conv.participantUsername || conv.participantId}
                    </span>
                    {conv.lastMessageAt && (
                      <span className="text-[11px] text-[var(--muted-foreground)]">{timeAgo(conv.lastMessageAt)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: open ? '#16a34a' : 'var(--muted-foreground)' }} />
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {open ? windowTimeLeft(conv) : 'Ventana cerrada'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className={`ml-auto text-[10px] text-white font-bold px-1.5 py-0.5 rounded-full ${IG_GRADIENT_CSS}`}>
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {mode === 'dms' && selectedId && (
        /* Message thread */
        <div className="flex flex-col h-[420px]">
          {/* Thread header */}
          {selectedConv && (
            <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border)]">
              <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm font-bold text-[var(--muted-foreground)] flex-shrink-0">
                {selectedConv.participantUsername.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">@{selectedConv.participantUsername || selectedConv.participantId}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: windowOpen ? '#16a34a' : 'var(--muted-foreground)' }} />
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {windowOpen ? `Ventana abierta · ${windowTimeLeft(selectedConv)}` : 'Ventana cerrada'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadState.status === 'loading' && (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="animate-spin text-[var(--muted-foreground)]" />
              </div>
            )}
            {threadState.status === 'error' && (
              <div className="flex items-start gap-2 p-2">
                <AlertCircle size={14} className="text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[var(--muted-foreground)]">No se pudo cargar la conversación.</p>
              </div>
            )}
            {threadState.status === 'ok' && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <MessageSquare size={24} className="text-[var(--muted-foreground)]" />
                <p className="text-sm text-[var(--muted-foreground)]">Sin mensajes</p>
              </div>
            )}
            {threadState.status === 'ok' && messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isFromBusiness ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${
                  msg.isFromBusiness
                    ? IG_GRADIENT_CSS + ' text-white rounded-br-sm'
                    : 'bg-[var(--muted)] text-[var(--foreground)] rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.text || <span className="italic opacity-60">Contenido multimedia</span>}</p>
                  <p className="text-[10px] mt-1 text-right opacity-70">{timeAgo(msg.timestamp)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 24h warning */}
          {!windowOpen && selectedConv && (
            <div className="mx-3 mb-2 px-3 py-2 rounded-lg flex items-center gap-2 bg-[var(--muted)] border border-[var(--border)]">
              <Clock size={13} className="text-[var(--muted-foreground)] flex-shrink-0" />
              <p className="text-xs text-[var(--muted-foreground)]">La ventana de 24h está cerrada. El usuario debe enviarte un mensaje primero.</p>
            </div>
          )}

          {/* Reply input */}
          <div className="p-3 border-t border-[var(--border)]">
            {sendError && <p className="text-xs text-red-500 mb-1 px-1">{sendError}</p>}
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && void handleSend()}
                placeholder={windowOpen ? 'Mensaje… (Enter para enviar)' : 'Ventana cerrada'}
                disabled={!windowOpen || sending}
                className="flex-1 bg-[var(--muted)] rounded-full px-4 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none border border-[var(--border)] focus:border-[var(--muted-foreground)] transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => void handleSend()}
                disabled={!reply.trim() || sending || !windowOpen}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-50 ${reply.trim() && windowOpen ? IG_GRADIENT_CSS : 'bg-[var(--muted)]'}`}
              >
                {sending ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className={reply.trim() && windowOpen ? 'text-white' : 'text-[var(--muted-foreground)]'} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'comments' && (
        <div className="p-5 text-center text-sm text-[var(--muted-foreground)]">
          <Hash size={28} className="mx-auto mb-3 opacity-40" />
          Seleccioná un reel para ver y responder comentarios
        </div>
      )}
    </div>
  )
}

