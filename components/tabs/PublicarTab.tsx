'use client'

import { useState, useEffect } from 'react'
import {
  Send,
  ImageIcon,
  Film,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock,
  XCircle,
} from 'lucide-react'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublishedPost {
  id: string
  mediaType: string
  mediaUrl: string
  caption: string
  status: string
  postId: string
  permalink?: string | null
  errorMessage: string
  publishedAt: string | null
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function StatusBadge({ status }: { status: string }) {
  if (status === 'PUBLISHED') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
        <CheckCircle size={11} /> Publicado
      </span>
    )
  }
  if (status === 'PENDING') {
    return (
      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        <Clock size={11} /> Pendiente
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-600">
      <XCircle size={11} /> Fallido
    </span>
  )
}

// ─── Publish form ─────────────────────────────────────────────────────────────

type PublishState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; post: PublishedPost }
  | { status: 'error'; message: string }

function PublishForm({ onPublished }: { onPublished: (post: PublishedPost) => void }) {
  const [mediaType, setMediaType] = useState<'IMAGE' | 'REEL'>('IMAGE')
  const [mediaUrl, setMediaUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [state, setState] = useState<PublishState>({ status: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mediaUrl.trim()) return
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType, mediaUrl: mediaUrl.trim(), caption }),
      })
      const json = await res.json()
      if (!res.ok) {
        const detail = json.detail ?? json.error ?? 'Error desconocido'
        setState({ status: 'error', message: typeof detail === 'string' ? detail : JSON.stringify(detail) })
        return
      }
      const post = json.post as PublishedPost
      setState({ status: 'ok', post })
      onPublished(post)
      setMediaUrl('')
      setCaption('')
    } catch (e) {
      setState({ status: 'error', message: String(e) })
    }
  }

  const isLoading = state.status === 'loading'

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Send size={14} style={{ color: 'var(--accent)' }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Nueva publicación
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Media type */}
        <div className="flex gap-2">
          {(['IMAGE', 'REEL'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setMediaType(type)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: mediaType === type ? 'var(--accent)' : 'var(--muted)',
                color: mediaType === type ? 'var(--accent-foreground)' : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
              }}
            >
              {type === 'IMAGE' ? <ImageIcon size={13} /> : <Film size={13} />}
              {type === 'IMAGE' ? 'Imagen' : 'Reel'}
            </button>
          ))}
        </div>

        {/* Media URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
            URL pública del {mediaType === 'IMAGE' ? 'archivo de imagen' : 'video'} (HTTPS)
          </label>
          <input
            type="url"
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
            placeholder={mediaType === 'IMAGE' ? 'https://cdn.ejemplo.com/foto.jpg' : 'https://cdn.ejemplo.com/video.mp4'}
            required
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--input)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              outline: 'none',
            }}
          />
        </div>

        {/* Caption */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Caption
            </label>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {caption.length}/2200
            </span>
          </div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Escribí el caption para tu publicación…"
            rows={4}
            maxLength={2200}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none"
            style={{
              backgroundColor: 'var(--input)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              outline: 'none',
            }}
          />
        </div>

        {/* Feedback */}
        {state.status === 'ok' && (
          <div
            className="rounded-lg px-4 py-3 flex items-center gap-2"
            style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
            <p className="text-xs" style={{ color: 'var(--foreground)' }}>
              ¡Publicado! ID de post: <span className="font-mono">{state.post.postId}</span>
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div
            className="rounded-lg px-4 py-3 flex items-start gap-2"
            style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-px" />
            <p className="text-xs" style={{ color: 'var(--foreground)' }}>
              {state.status === 'error' && state.message}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !mediaUrl.trim()}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Publicando… (puede tardar hasta 30s para reels)
            </>
          ) : (
            <>
              <Send size={14} />
              Publicar en Instagram
            </>
          )}
        </button>

        {mediaType === 'REEL' && (
          <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
            Los reels requieren procesamiento en los servidores de Meta. El proceso puede tardar hasta 30 segundos.
          </p>
        )}
      </form>
    </div>
  )
}

// ─── History ──────────────────────────────────────────────────────────────────

function PublishHistory({ posts }: { posts: PublishedPost[] }) {
  if (posts.length === 0) return null

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
          HISTORIAL DE PUBLICACIONES
        </p>
      </div>
      <div>
        {posts.map(p => (
          <div
            key={p.id}
            className="flex items-start gap-4 px-5 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {/* Type icon */}
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              {p.mediaType === 'REEL'
                ? <Film size={13} style={{ color: 'var(--muted-foreground)' }} />
                : <ImageIcon size={13} style={{ color: 'var(--muted-foreground)' }} />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>
                {p.caption || <span style={{ color: 'var(--muted-foreground)' }}>Sin caption</span>}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={p.status} />
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {timeAgo(p.createdAt)}
                </span>
                {p.status === 'FAILED' && p.errorMessage && (
                  <span className="text-xs truncate max-w-xs text-red-600">
                    {p.errorMessage}
                  </span>
                )}
              </div>
            </div>

            {p.status === 'PUBLISHED' && p.postId && (
              <a
                href={p.permalink ?? `https://www.instagram.com/p/${p.postId}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function PublicarTab() {
  const { connected } = useInstagramDataContext()
  const [posts, setPosts] = useState<PublishedPost[]>([])

  // Load history on mount
  useEffect(() => {
    if (!connected) return
    void fetch('/api/instagram/publish')
      .then(r => r.json())
      .then(j => { if (Array.isArray(j.posts)) setPosts(j.posts as PublishedPost[]) })
      .catch(() => null)
  }, [connected])

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Send size={32} style={{ color: 'var(--muted-foreground)' }} />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Conectá tu cuenta de Instagram para publicar contenido.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PublishForm
        onPublished={post => setPosts(prev => [post, ...prev])}
      />
      <PublishHistory posts={posts} />
    </div>
  )
}
