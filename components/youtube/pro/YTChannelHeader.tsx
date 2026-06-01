'use client'

import { RefreshCw, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { YouTubeChannelSummary } from '@/hooks/useYouTubeData'
import { fmtSubs, fmtViews, YT_RED } from './yt-theme'

interface YTChannelHeaderProps {
  summary: YouTubeChannelSummary
  syncing: boolean
  onSync: () => void
  onDisconnect: () => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 first:pl-0 last:pr-0">
      <span className="text-base font-bold text-foreground leading-none">{value}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  )
}

export function YTChannelHeader({
  summary,
  syncing,
  onSync,
  onDisconnect,
}: YTChannelHeaderProps) {
  const channel = summary.channel
  const snap = summary.snapshot

  const name = channel?.name ?? 'Canal de YouTube'
  const avatarUrl = channel?.avatarUrl
  const needsReconnect = channel?.needsReconnect ?? false

  const subscribers = snap?.subscribers ?? 0
  const totalViews = snap?.totalViews ?? 0
  const videoCount = snap?.videoCount ?? summary.videosCount ?? 0

  const connectedLabel = channel?.connectedAt
    ? `Conectado el ${new Date(channel.connectedAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`
    : 'Canal conectado'

  // Performance badge based on subscriber tier
  const tier =
    subscribers >= 1_000_000
      ? 'Creador estrella'
      : subscribers >= 100_000
        ? 'Creador establecido'
        : subscribers >= 1_000
          ? 'En crecimiento'
          : subscribers > 0
            ? 'Comenzando'
            : null

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Banner strip */}
      <div className="h-24 bg-[linear-gradient(135deg,#FF0000,#CC0000,#FF6B6B)]" />

      <div className="px-6 pb-6">
        <div className="flex items-end justify-between gap-4 -mt-10">
          {/* Avatar + name */}
          <div className="flex items-end gap-4 min-w-0">
            <div className="w-20 h-20 rounded-full bg-muted overflow-hidden border-2 border-[#FF0000] ring-4 ring-card shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ background: 'linear-gradient(135deg, #FF0000, #CC0000)' }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 mb-1">
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-muted/40 hover:bg-muted transition-colors disabled:opacity-60"
              title="Sincronizar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Sincronizando…' : 'Sync'}</span>
            </button>
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-muted/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              title="Desconectar YouTube"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Name + meta */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground text-xl leading-tight truncate">
              {name}
            </span>
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: YT_RED }} />
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {needsReconnect ? (
              <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" />
                Requiere reconexión
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{connectedLabel}</span>
            )}
            {tier && (
              <>
                <span className="text-muted-foreground/40 text-xs">•</span>
                <span className="text-xs font-medium" style={{ color: YT_RED }}>
                  {tier}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center flex-wrap gap-y-3 mt-5 divide-x divide-border/60">
          <Stat label="suscriptores" value={fmtSubs(subscribers)} />
          <Stat label="videos" value={fmtViews(videoCount)} />
          <Stat label="vistas" value={fmtViews(totalViews)} />
        </div>
      </div>
    </div>
  )
}
