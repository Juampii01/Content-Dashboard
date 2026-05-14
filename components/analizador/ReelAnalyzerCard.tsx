'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Eye, Heart, MessageCircle, Share2, Loader2, Sparkles, Clapperboard } from 'lucide-react'
import { formatK } from '@/lib/utils/formatters'
import { StructureModal, type GuionStructure } from './StructureModal'

interface ScrapedReel {
  id: string
  url: string
  caption?: string
  transcript?: string
  videoPlayCount?: number
  likesCount?: number
  commentsCount?: number
  sharesCount?: number
  timestamp?: string
  displayUrl?: string
}

interface ReelAnalyzerCardProps {
  reel: ScrapedReel
  rank: number
}

export function ReelAnalyzerCard({ reel, rank }: ReelAnalyzerCardProps) {
  const [loading, setLoading] = useState(false)
  const [structure, setStructure] = useState<GuionStructure | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const views = reel.videoPlayCount ?? 0
  const likes = reel.likesCount ?? 0
  const comments = reel.commentsCount ?? 0
  const shares = reel.sharesCount ?? 0

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analizador/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: reel.caption, transcript: reel.transcript, views, likes, comments }),
      })
      const data = await res.json()
      if (data.structure) {
        setStructure(data.structure)
        setModalOpen(true)
      } else {
        setError(data.error ?? 'Error desconocido')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const title = reel.caption?.slice(0, 80) ?? `Reel ${reel.id?.slice(-6)}`

  return (
    <>
      <div
        className="rounded-xl overflow-hidden flex flex-col transition-all hover:opacity-90"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[9/16] bg-black overflow-hidden" style={{ maxHeight: 160 }}>
          {reel.displayUrl ? (
            <Image src={reel.displayUrl} alt={title} fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1214' }}>
              <Clapperboard className="h-8 w-8" style={{ color: 'var(--muted-foreground)' }} />
            </div>
          )}
          <div
            className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            #{rank}
          </div>
          <div
            className="absolute top-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-lg"
            style={{ backgroundColor: '#0008', color: '#fff' }}
          >
            {formatK(views)}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: 'var(--foreground)' }}>
            {title}
          </p>

          {/* Metrics row */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { icon: Eye, value: views, color: '#5B8DEF' },
              { icon: Heart, value: likes, color: '#E05252' },
              { icon: MessageCircle, value: comments, color: '#10B981' },
              { icon: Share2, value: shares, color: '#B08A4A' },
            ].map(({ icon: Icon, value, color }, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <Icon size={11} style={{ color }} />
                <span className="text-[10px] font-semibold" style={{ color }}>{formatK(value)}</span>
              </div>
            ))}
          </div>

          {/* Analyze button */}
          <button
            onClick={structure ? () => setModalOpen(true) : handleAnalyze}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 w-full text-xs py-1.5 rounded-lg font-medium transition-all disabled:opacity-50 mt-auto"
            style={{
              backgroundColor: structure ? '#10B98122' : 'var(--accent)',
              color: structure ? '#10B981' : '#fff',
              border: structure ? '1px solid #10B98144' : 'none',
            }}
          >
            {loading ? (
              <><Loader2 size={11} className="animate-spin" /> Analizando...</>
            ) : structure ? (
              <><Sparkles size={11} /> Ver estructura</>
            ) : (
              <><Sparkles size={11} /> Analizar guión</>
            )}
          </button>

          {error && <p className="text-[10px] text-center" style={{ color: '#E05252' }}>{error}</p>}
        </div>
      </div>

      {modalOpen && structure && (
        <StructureModal
          title={title}
          structure={structure}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
