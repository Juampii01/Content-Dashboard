'use client'

/**
 * VideoFeedView — "Top 30d" tab inside /instagram.
 *
 * Pure derived view on top of UserReel data already pulled by the unified
 * Instagram sync (see /api/instagram/sync). NO separate connect form, NO
 * separate scrape, NO separate Apify run. One connection (via the page's
 * banner above), one scrape, multiple views.
 *
 * Ranking: posts published in the last 30 days, sorted by total engagement
 * (likes + comments + shares). Title comes from caption first line; the
 * caption itself is kept available in the secondary line.
 */

import { useMemo } from 'react'
import Image from 'next/image'
import {
  ExternalLink,
  Eye,
  ThumbsUp,
  MessageCircle,
  Camera,
  Rss,
  Inbox,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatK } from '@/lib/utils/formatters'
import { formatDate } from '@/lib/utils/formatDate'
import { useInstagramDataContext } from '@/components/instagram/InstagramDataContext'
import type { UserReelRow } from '@/hooks/useInstagramData'

interface FeedPost {
  id: string
  thumbnail: string | null
  title: string
  publishedAt: string | null
  views: number
  likes: number
  comments: number
  url: string
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function reelToFeedPost(r: UserReelRow): FeedPost {
  const firstLine = (r.caption ?? '').split('\n')[0]?.trim() || '(sin caption)'
  return {
    id: r.id,
    thumbnail: r.thumbnailUrl,
    title: firstLine,
    publishedAt: r.publishedAt,
    views: r.viewsCount ?? 0,
    likes: r.likesCount ?? 0,
    comments: r.commentsCount ?? 0,
    url: r.url,
  }
}

function engagementScore(p: FeedPost): number {
  return p.likes + p.comments
}

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
        <div className="relative aspect-square w-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
          <Image
            src={post.thumbnail}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-3">
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
        <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          <span>{post.publishedAt ? formatDate(post.publishedAt) : ''}</span>
          <a
            href={post.url}
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

export function VideoFeedView() {
  const { connected, hasRealData, reels, loading } = useInstagramDataContext()

  const posts = useMemo<FeedPost[]>(() => {
    if (!hasRealData) return []
    const cutoff = Date.now() - THIRTY_DAYS_MS
    return reels
      .filter((r) => {
        if (!r.publishedAt) return false
        const t = Date.parse(r.publishedAt)
        return Number.isFinite(t) && t >= cutoff
      })
      .map(reelToFeedPost)
      .sort((a, b) => engagementScore(b) - engagementScore(a))
  }, [hasRealData, reels])

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        <Rss size={12} />
        <span>Posts de los últimos 30 días rankeados por engagement (likes + comentarios).</span>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl animate-shimmer"
              style={{
                aspectRatio: '1 / 1.3',
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      ) : !connected ? (
        <EmptyState
          icon={Camera}
          title="Conectá tu Instagram arriba"
          description="Una vez que ingreses tu @handle y sincronices, vas a ver acá los posts del último mes rankeados por engagement."
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No hay posts en los últimos 30 días"
          description="Cuando tu cuenta tenga actividad reciente vas a verlos rankeados acá."
        />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
