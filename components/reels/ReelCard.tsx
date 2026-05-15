'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Eye, Heart, Bookmark, MessageCircle, Share2, ExternalLink, Clock } from 'lucide-react'
import type { Reel } from '@/lib/types'
import { MetricBadge } from '@/components/shared/MetricBadge'
import { formatK } from '@/lib/utils/formatters'

interface Props {
  reel: Reel
}

export function ReelCard({ reel }: Props) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <Link href={`/instagram/reels/${reel.id}`}
      className="block rounded-xl overflow-hidden transition-all duration-150 hover:scale-[1.01]"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>

      {/* Thumbnail */}
      <div className="relative aspect-[9/16] max-h-52 w-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--muted)' }}>
        {reel.thumbnail && !imgFailed ? (
          <img
            src={reel.thumbnail}
            alt=""
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
        )}
        {/* Top badges */}
        <div className="absolute top-2 left-2">
          <MetricBadge multiplier={reel.multiplier} isAd={reel.isAd} />
        </div>
        {reel.isTrialReel && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
              Trial
            </span>
          </div>
        )}
        {/* Duration */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px]"
          style={{ color: 'var(--foreground)' }}>
          <Clock size={10} />
          {reel.duration}
        </div>
      </div>

      {/* Metrics row */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--foreground)' }}>
            <Eye size={12} />{formatK(reel.views)}
          </span>
          <span className="flex items-center gap-1"><Heart size={11} />{formatK(reel.likes)}</span>
          <span className="flex items-center gap-1"><Bookmark size={11} />{formatK(reel.saves)}</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} />{formatK(reel.comments)}</span>
          <span className="flex items-center gap-1"><Share2 size={11} />{formatK(reel.shares)}</span>
        </div>
      </div>

      {/* Organic bar */}
      <div className="px-3 py-1">
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${reel.organicPercent}%`, backgroundColor: 'var(--accent)' }} />
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          {reel.organicPercent}% orgánico
        </p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-2">
        <p className="text-[11px] leading-tight line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
          {reel.caption}
        </p>
      </div>

      {/* CTA button */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
          <ExternalLink size={11} />
          Ver en IG
        </div>
      </div>
    </Link>
  )
}
