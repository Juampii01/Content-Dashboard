'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import {
  Music,
  Loader2,
  RefreshCw,
  AtSign,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatK } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/formatDate'
import { useTikTokData, type TikTokVideoRow } from '@/hooks/useTikTokData'

function VideoCard({ video }: { video: TikTokVideoRow }) {
  return (
    <div
      className="rounded-xl overflow-hidden card-lift"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {video.thumbnailUrl && (
        <div className="relative aspect-[9/16] w-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-3">
        <p className="text-xs leading-snug mb-2 line-clamp-2" style={{ color: 'var(--foreground)' }}>
          {(video.caption ?? '').split('\n')[0] || '(sin caption)'}
        </p>
        <div className="grid grid-cols-2 gap-1 text-[11px] mb-2" style={{ color: 'var(--muted-foreground)' }}>
          <span className="inline-flex items-center gap-1"><Eye size={10} /> {formatK(video.viewsCount)}</span>
          <span className="inline-flex items-center gap-1"><ThumbsUp size={10} /> {formatK(video.likesCount)}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle size={10} /> {formatK(video.commentsCount)}</span>
          <span className="inline-flex items-center gap-1"><Share2 size={10} /> {formatK(video.sharesCount)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          <span>{video.publishedAt ? formatDate(video.publishedAt) : ''}</span>
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ExternalLink size={10} /> Ver
          </a>
        </div>
      </div>
    </div>
  )
}

export function TikTokContent() {
  const { summary, videos, loading, syncing, hasMore, loadingMore, sync, loadMore, refresh } = useTikTokData()
  const [handle, setHandle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleConnect(e: FormEvent) {
    e.preventDefault()
    const trimmed = handle.trim().replace(/^@/, '')
    if (!trimmed) {
      toast.error('Ingresá tu @handle de TikTok.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/tiktok/connect-handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: trimmed }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
        toast.error(data?.detail ?? 'No pudimos conectar. Revisá el @handle.')
        return
      }
      toast.success(`TikTok conectado como @${trimmed}.`)
      setHandle('')
      await refresh()
    } catch {
      toast.error('Error de red al conectar TikTok.')
    } finally {
      setSubmitting(false)
    }
  }

  const connected = summary?.connected ?? false
  const videoCount = summary?.videoCount ?? videos.length

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Redes sociales"
        title="TikTok Analytics"
        description="Análisis de rendimiento de tu cuenta de TikTok."
        icon={Music}
      />

      {/* Connection banner */}
      {loading ? (
        <Skeleton className="rounded-xl mb-6" style={{ height: 64 }} />
      ) : !connected ? (
        <form
          onSubmit={handleConnect}
          className="flex flex-col gap-3 rounded-xl px-4 py-3 mb-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}
            >
              <Music size={16} style={{ color: 'var(--foreground)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Conectá tu cuenta de TikTok
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Ingresá tu @handle. Sincronizamos públicamente vía scraper — sin pedir login a TikTok.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            >
              <AtSign size={13} style={{ color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                disabled={submitting}
                placeholder="tu_handle"
                maxLength={24}
                className="bg-transparent outline-none text-sm w-32"
                style={{ color: 'var(--foreground)' }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !handle.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Music size={14} />}
              {submitting ? 'Conectando…' : 'Conectar'}
            </button>
          </div>
        </form>
      ) : (
        <div
          className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-6"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
            <span>
              {videoCount} videos sincronizados {summary?.accountName ? `· @${summary.accountName}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60"
            style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {syncing ? 'Sincronizando…' : 'Re-sincronizar'}
          </button>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="rounded-xl"
              style={{ aspectRatio: '9 / 16', animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      ) : !connected ? (
        <EmptyState
          icon={Music}
          title="Sin cuenta de TikTok conectada"
          description="Una vez conectes tu @handle arriba, vamos a scrapear y mostrar tus videos con su performance."
        />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Music}
          title="Sin videos sincronizados todavía"
          description={`Tocá "Re-sincronizar" para traer los videos de @${summary?.accountName ?? 'tu cuenta'} vía Apify. Tarda 30-60 segundos.`}
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--card)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                {loadingMore ? 'Cargando…' : 'Cargar más videos'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
