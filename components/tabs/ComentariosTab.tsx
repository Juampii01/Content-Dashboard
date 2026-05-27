'use client'

import { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  RefreshCw,
  Eye,
  EyeOff,
  CornerDownRight,
  Send,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import { useInstagramComments, type InstagramComment } from '@/hooks/useInstagramComments'
import { Skeleton } from '@/components/ui/skeleton'
import { formatK } from '@/lib/utils/formatters'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function Avatar({ username }: { username: string }) {
  const letter = (username?.[0] ?? '?').toUpperCase()
  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
    >
      {letter}
    </div>
  )
}

// ─── Reply form ───────────────────────────────────────────────────────────────

function ReplyForm({
  commentId,
  onSubmit,
  onCancel,
  loading,
}: {
  commentId: string
  onSubmit: (commentId: string, message: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit(commentId, text.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 ml-10 flex gap-2 items-end">
      <textarea
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
        placeholder="Escribe una respuesta…"
        rows={2}
        maxLength={2200}
        className="flex-1 rounded-lg px-3 py-2 text-sm resize-none"
        style={{
          backgroundColor: 'var(--input)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
          outline: 'none',
        }}
      />
      <div className="flex flex-col gap-1">
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="btn btn-primary btn-sm"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary btn-sm"
        >
          ✕
        </button>
      </div>
    </form>
  )
}

// ─── Single comment row ───────────────────────────────────────────────────────

function CommentRow({
  comment,
  replies,
  onReply,
  onHide,
  replyingTo,
  setReplyingTo,
  replyLoading,
  hideLoading,
}: {
  comment: InstagramComment
  replies: InstagramComment[]
  onReply: (commentId: string, message: string) => void
  onHide: (id: string) => void
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  replyLoading: boolean
  hideLoading: boolean
}) {
  const isReplying = replyingTo === comment.commentId

  return (
    <div
      className="py-3 px-4"
      style={{
        borderBottom: '1px solid var(--border)',
        opacity: comment.hidden ? 0.45 : 1,
      }}
    >
      {/* Top-level comment */}
      <div className="flex gap-3">
        <Avatar username={comment.username} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              @{comment.username}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {timeAgo(comment.timestamp)}
            </span>
            {comment.hidden && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                oculto
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>
            {comment.text}
          </p>
          {/* Actions */}
          <div className="flex items-center gap-3 mt-1.5">
            {comment.likeCount > 0 && (
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                ♥ {formatK(comment.likeCount)}
              </span>
            )}
            {!comment.hidden && (
              <button
                type="button"
                onClick={() => setReplyingTo(isReplying ? null : comment.commentId)}
                className="text-xs flex items-center gap-1"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <CornerDownRight size={11} />
                Responder
              </button>
            )}
            <button
              type="button"
              onClick={() => onHide(comment.id)}
              disabled={hideLoading || comment.hidden}
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {comment.hidden ? <Eye size={11} /> : <EyeOff size={11} />}
              {comment.hidden ? 'Oculto' : 'Ocultar'}
            </button>
          </div>
        </div>
      </div>

      {/* Reply form */}
      {isReplying && (
        <ReplyForm
          commentId={comment.commentId}
          onSubmit={onReply}
          onCancel={() => setReplyingTo(null)}
          loading={replyLoading}
        />
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="ml-10 mt-2 space-y-2">
          {replies.map(r => (
            <div key={r.id} className="flex gap-2">
              <ChevronRight size={12} style={{ color: 'var(--muted-foreground)', marginTop: 4, flexShrink: 0 }} />
              <div>
                <span className="text-xs font-semibold mr-1.5" style={{ color: 'var(--foreground)' }}>
                  @{r.username}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {timeAgo(r.timestamp)}
                </span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--foreground)' }}>
                  {r.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Comments panel ───────────────────────────────────────────────────────────

function CommentsPanel({
  mediaId,
  caption,
}: {
  mediaId: string
  caption?: string | null
}) {
  const { state, replyState, hideState, fetchComments, postReply, hideComment } = useInstagramComments()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)

  useEffect(() => {
    // Reset reply state and fetch fresh comments when the selected reel changes.
    // setReplyingTo is called inside the async chain to avoid a synchronous
    // setState inside the effect body (react-compiler/react-compiler).
    void fetchComments(mediaId).then(() => setReplyingTo(null))
  }, [mediaId, fetchComments])

  async function handleReply(commentId: string, message: string) {
    const ok = await postReply(commentId, message)
    if (ok) setReplyingTo(null)
  }

  async function handleHide(id: string) {
    await hideComment(id)
  }

  if (state.status === 'loading') {
    return (
      <div className="p-4 space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="p-4 flex items-start gap-2">
        <AlertCircle size={14} style={{ color: 'var(--muted-foreground)', marginTop: 2 }} />
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          No se pudieron cargar los comentarios. Intentá de nuevo.
        </p>
      </div>
    )
  }

  if (state.status !== 'ok') return null

  const topLevel = state.comments.filter(c => !c.parentId)
  const replies  = state.comments.filter(c =>  c.parentId)

  const visible = showHidden ? topLevel : topLevel.filter(c => !c.hidden)
  const hiddenCount = topLevel.filter(c => c.hidden).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {topLevel.length} comentario{topLevel.length !== 1 ? 's' : ''}
          </p>
          {caption && (
            <p className="text-xs truncate max-w-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {caption}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowHidden(v => !v)}
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {showHidden ? <EyeOff size={11} /> : <Eye size={11} />}
              {showHidden ? 'Ocultar' : `Ver ${hiddenCount} oculto${hiddenCount !== 1 ? 's' : ''}`}
            </button>
          )}
          <button
            type="button"
            onClick={() => void fetchComments(mediaId)}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={24} style={{ color: 'var(--muted-foreground)', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Sin comentarios visibles
            </p>
          </div>
        ) : (
          visible.map(c => (
            <CommentRow
              key={c.id}
              comment={c}
              replies={replies.filter(r => r.parentId === c.commentId)}
              onReply={handleReply}
              onHide={handleHide}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyLoading={replyState === 'loading'}
              hideLoading={hideState === 'loading'}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function ComentariosTab() {
  const { reels, connected, hasRealData } = useInstagramDataContext()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedReel = reels.find(r => r.instagramId === selectedId)

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <MessageSquare size={32} style={{ color: 'var(--muted-foreground)' }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Conectá tu cuenta de Instagram para gestionar comentarios.
        </p>
      </div>
    )
  }

  if (!hasRealData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <MessageSquare size={32} style={{ color: 'var(--muted-foreground)' }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Sincronizá tu cuenta para ver los reels y sus comentarios.
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
      {/* Left: reel list */}
      <div
        className="w-64 flex-shrink-0 overflow-y-auto"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <div
          className="px-4 py-3 sticky top-0"
          style={{ backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
            REELS
          </p>
        </div>
        {reels.slice(0, 50).map(r => (
          <button
            key={r.instagramId}
            type="button"
            onClick={() => setSelectedId(r.instagramId)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
            style={{
              backgroundColor: selectedId === r.instagramId ? 'var(--accent)' : 'transparent',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {r.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.thumbnailUrl}
                alt=""
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: 'var(--muted)' }}
              >
                <MessageSquare size={14} style={{ color: 'var(--muted-foreground)' }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-medium truncate"
                style={{ color: selectedId === r.instagramId ? 'var(--accent-foreground)' : 'var(--foreground)' }}
              >
                {r.caption?.slice(0, 60) || 'Sin caption'}
              </p>
              <p
                className="text-xs"
                style={{ color: selectedId === r.instagramId ? 'var(--accent-foreground)' : 'var(--muted-foreground)' }}
              >
                {r.commentsCount} comentario{r.commentsCount !== 1 ? 's' : ''}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Right: comments */}
      <div className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <MessageSquare size={28} style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Seleccioná un reel para ver sus comentarios
            </p>
          </div>
        ) : (
          <CommentsPanel
            mediaId={selectedId}
            caption={selectedReel?.caption ?? null}
          />
        )}
      </div>
    </div>
  )
}
