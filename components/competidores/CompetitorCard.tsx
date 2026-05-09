'use client'

import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import type { CompetitorDTO } from '@/lib/types/competidores'

interface CompetitorCardProps {
  competitor: CompetitorDTO
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

function InitialsAvatar({ username }: { username: string }) {
  const initial = username.charAt(0).toUpperCase()
  return (
    <div
      className="flex items-center justify-center w-12 h-12 rounded-full text-lg font-semibold flex-shrink-0"
      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
    >
      {initial}
    </div>
  )
}

export function CompetitorCard({ competitor }: CompetitorCardProps) {
  const router = useRouter()

  function handleClick() {
    router.push(`/competidores/${encodeURIComponent(competitor.username)}`)
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      className="cursor-pointer surface card-lift rounded-xl p-4 flex items-center gap-4"
    >
      {/* Avatar — plain <img>: IG CDN URLs rotate frequently, not worth adding to next.config remotePatterns */}
      {competitor.profilePicUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={competitor.profilePicUrl}
          alt={`Avatar de @${competitor.username}`}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <InitialsAvatar username={competitor.username} />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
          @{competitor.username}
        </p>
        {competitor.displayName && (
          <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
            {competitor.displayName}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1.5">
          {competitor.followersCount != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <Users size={11} />
              {competitor.followersCount >= 1000
                ? `${(competitor.followersCount / 1000).toFixed(1)}K`
                : competitor.followersCount}
            </span>
          )}
          {competitor.reelsCount != null && (
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {competitor.reelsCount} reels
            </span>
          )}
        </div>
      </div>

      {/* Last scraped */}
      {competitor.lastScrapedAt && (
        <div className="text-right flex-shrink-0">
          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
            {formatRelativeTime(competitor.lastScrapedAt)}
          </p>
        </div>
      )}
    </div>
  )
}
