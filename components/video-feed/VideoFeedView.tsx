'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Eye,
  ThumbsUp,
  MessageCircle,
  Camera,
  Plug,
  Unplug,
  Rss,
  Inbox,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatK } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/formatDate'

interface FeedPost {
  postId: string
  type: 'Video' | 'Image'
  title: string
  caption: string
  thumbnail: string | null
  postUrl: string
  views: number
  likes: number
  comments: number
  duration: string | null
  publishedAt: string | null
  analysis: string | null
}

interface FeedAccount {
  id: string
  platform: string
  channelUrl: string
  channelName: string | null
  channelAvatar: string | null
  posts: FeedPost[]
  updatedAt: string
}

// `formatK` (lib/utils/formatters) handles 1.5K / 1.5M compaction.
// `formatDate` (lib/utils/formatDate) formats with es-ES + Intl options.
// Default opts (`{ day, month: 'short' }`) match the previous local helper exactly.
function PostCard({ post, rank }: { post: FeedPost; rank: number }) {
  return (
    <div
      className="rounded-xl overflow-hidden card-lift relative"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div
        className="absolute top-2 left-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold tabular-nums"
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-foreground)',
          boxShadow: '0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent)',
        }}
      >
        {rank}
      </div>
      {post.thumbnail && (
        <div
          className="aspect-square w-full"
          style={{
            backgroundImage: `url(${post.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          <span className="px-1.5 py-0.5 rounded font-semibold uppercase text-[9px] tracking-wider"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--secondary, var(--accent)) 12%, transparent)',
              color: 'var(--secondary, var(--accent))',
            }}
          >
            {post.type}
          </span>
          {post.duration && <span className="tabular-nums">{post.duration}</span>}
          {post.publishedAt && <span>· {formatDate(post.publishedAt)}</span>}
        </div>
        <p
          className="text-xs leading-snug mb-2 line-clamp-2"
          style={{ color: 'var(--foreground)' }}
        >
          {post.title}
        </p>
        <div className="flex items-center gap-2 text-[11px] mb-2" style={{ color: 'var(--muted-foreground)' }}>
          <span className="inline-flex items-center gap-0.5 tabular-nums"><Eye size={10} /> {formatK(post.views)}</span>
          <span className="inline-flex items-center gap-0.5 tabular-nums"><ThumbsUp size={10} /> {formatK(post.likes)}</span>
          <span className="inline-flex items-center gap-0.5 tabular-nums"><MessageCircle size={10} /> {formatK(post.comments)}</span>
        </div>
        {post.analysis && (
          <div
            className="rounded-lg p-2 mb-2 text-[11px] leading-relaxed"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border))',
              color: 'var(--foreground)',
            }}
          >
            <Sparkles size={10} style={{ color: 'var(--accent)', display: 'inline', marginRight: 4 }} />
            {post.analysis}
          </div>
        )}
        <a
          href={post.postUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-[11px] hover:underline"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ExternalLink size={10} /> Ver
        </a>
      </div>
    </div>
  )
}

export function VideoFeedView() {
  const [account, setAccount] = useState<FeedAccount | null>(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [channelUrl, setChannelUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshHint, setRefreshHint] = useState<string | null>(null)

  const loadAccount = useCallback(async () => {
    setAccountLoading(true)
    try {
      const r = await fetch('/api/video-feed')
      const data = await r.json()
      setAccount(data.account ?? null)
    } catch {
      setAccount(null)
    } finally {
      setAccountLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccount()
  }, [loadAccount])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = channelUrl.trim()
    if (!trimmed) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch('/api/video-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: trimmed }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'No se pudo conectar.')
        return
      }
      setAccount(data.account)
      setChannelUrl('')
      setRefreshHint(`${data.newPostsCount ?? 0} posts nuevos`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRefresh = async () => {
    if (!account) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch('/api/video-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: account.channelUrl }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'No se pudo refrescar.')
        return
      }
      setAccount(data.account)
      setRefreshHint(`${data.newPostsCount ?? 0} posts nuevos`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDisconnect = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/video-feed', { method: 'DELETE' })
      setAccount(null)
      setRefreshHint(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Contenido"
        title="Video Feed"
        description="Conectá tu Instagram para ver los últimos 30 días rankeados por engagement, con análisis IA por post."
        icon={Rss}
        actions={
          account && (
            <>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold disabled:opacity-50 cursor-pointer transition-all hover:opacity-90"
                style={{
                  background: 'var(--gradient-accent)',
                  color: 'var(--accent-foreground)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Actualizar
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  color: 'var(--muted-foreground)',
                }}
              >
                <Unplug size={14} />
                Desconectar
              </button>
            </>
          )
        }
      />

      {accountLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </div>
      ) : !account ? (
        <form onSubmit={handleConnect} className="surface-elevated p-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Conectar Instagram
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            >
              <input
                type="url"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://www.instagram.com/tu_usuario/"
                required
                disabled={submitting}
                className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
                style={{ color: 'var(--foreground)' }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || channelUrl.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:brightness-110 active:brightness-95"
              style={{
                background: 'var(--gradient-accent)',
                color: 'var(--accent-foreground)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
              {submitting ? 'Conectando…' : 'Conectar'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>}
        </form>
      ) : (
        <>
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <Camera size={16} style={{ color: 'var(--accent)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                @{account.channelName ?? 'cuenta'}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {account.posts.length} posts en últimos 30 días{refreshHint ? ` · ${refreshHint}` : ''}
              </p>
            </div>
            <a
              href={account.channelUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs hover:underline"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <ExternalLink size={11} /> abrir perfil
            </a>
          </div>

          {error && <p className="mb-4 text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>}

          {account.posts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No hay posts en los últimos 30 días"
              description="Cuando tu cuenta tenga actividad reciente aparecerán acá."
            />
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {account.posts.map((post, i) => (
                <PostCard key={post.postId} post={post} rank={i + 1} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
