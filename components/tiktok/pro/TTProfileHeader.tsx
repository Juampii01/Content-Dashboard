'use client'

import { RefreshCw, LogOut, CheckCircle } from 'lucide-react'
import type { TikTokAccountSummary } from '@/hooks/useTikTokData'
import { fmtTT, TT_TEAL, TT_PINK } from './tt-theme'

interface TTProfileHeaderProps {
  summary: TikTokAccountSummary
  syncing: boolean
  onSync: () => void
  onDisconnect: () => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 first:pl-0 last:pr-0">
      <span className="text-lg font-bold text-foreground leading-none">{value}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  )
}

function StatSeparator() {
  return <div className="w-px h-8 bg-border/60 shrink-0" />
}

export function TTProfileHeader({
  summary,
  syncing,
  onSync,
  onDisconnect,
}: TTProfileHeaderProps) {
  const snap = summary.latestSnapshot
  const account = summary.account

  const accountName = account?.accountName ?? 'TikTok Account'
  const avatarUrl = account?.accountPic

  const followers = snap?.followers ?? 0
  const following = snap?.following ?? 0
  const posts = snap?.posts ?? summary.videosCount ?? 0
  const er = snap?.engagementRate ?? 0
  const totalViews = snap?.totalViews ?? 0

  // Performance badge: color based on ER
  const erLevel =
    er >= 6 ? 'Excelente' : er >= 3 ? 'Bueno' : er > 0 ? 'Mejorable' : null

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Top gradient bar */}
      <div
        className="h-1.5"
        style={{ background: `linear-gradient(90deg, ${TT_TEAL}, ${TT_PINK})` }}
      />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          {/* Left: avatar + name */}
          <div className="flex items-center gap-4">
            {/* Avatar with TT gradient ring */}
            <div
              className="p-0.5 rounded-full shrink-0"
              style={{
                background: `linear-gradient(135deg, ${TT_TEAL}, ${TT_PINK})`,
              }}
            >
              <div className="w-14 h-14 rounded-full bg-muted overflow-hidden border-2 border-card">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={accountName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ background: `linear-gradient(135deg, ${TT_TEAL}, ${TT_PINK})` }}
                  >
                    {accountName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-lg leading-tight">
                  @{accountName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: TT_TEAL }} />
                <span className="text-xs text-muted-foreground">Cuenta conectada</span>
                {erLevel && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">•</span>
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: er >= 6 ? TT_TEAL : er >= 3 ? '#a3e635' : TT_PINK,
                      }}
                    >
                      {erLevel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
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
              title="Desconectar TikTok"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center flex-wrap gap-y-3">
          <Stat label="Following" value={fmtTT(following)} />
          <StatSeparator />
          <Stat label="Seguidores" value={fmtTT(followers)} />
          <StatSeparator />
          <Stat label="Me gusta" value={fmtTT(totalViews)} />
          <StatSeparator />
          <Stat label="Eng. Rate" value={er > 0 ? er.toFixed(2) + '%' : '—'} />
          <StatSeparator />
          <Stat label="Videos" value={fmtTT(posts)} />
        </div>
      </div>
    </div>
  )
}
