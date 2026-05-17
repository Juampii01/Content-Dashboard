'use client'

import { useState } from 'react'
import { Camera, Music, Play, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useSocialConnection, type SocialPlatform } from '@/hooks/useSocialConnection'

interface PlatformConfig {
  label: string
  icon: React.ElementType
  iconColor: string
  description: string
  steps: string[]
  apiNote: string
}

const PLATFORMS: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    label: 'Instagram',
    icon: Camera,
    iconColor: 'var(--platform-instagram)',
    description: 'Vincula tu cuenta de Instagram para sincronizar métricas en tiempo real.',
    steps: [
      'Conecta tu cuenta de Meta Business',
      'Autoriza el acceso a Instagram Insights',
      'Selecciona la cuenta a sincronizar',
      'Los datos se actualizarán cada 24 h',
    ],
    apiNote: 'Requiere Meta App Review para instagram_manage_insights en producción.',
  },
  tiktok: {
    label: 'TikTok',
    icon: Music,
    iconColor: 'var(--platform-tiktok)',
    description: 'Vincula tu cuenta de TikTok para sincronizar métricas en tiempo real.',
    steps: [
      'Conecta tu cuenta de TikTok for Business',
      'Autoriza el acceso a TikTok Analytics API',
      'Selecciona el perfil a sincronizar',
      'Los datos se actualizarán cada 12 h',
    ],
    apiNote: 'Requiere TikTok for Developers API aprobada.',
  },
  youtube: {
    label: 'YouTube',
    icon: Play,
    iconColor: 'var(--platform-youtube)',
    description: 'Vincula tu canal de YouTube para sincronizar métricas en tiempo real.',
    steps: [
      'Conecta tu cuenta de Google / YouTube Studio',
      'Autoriza el acceso a YouTube Analytics API',
      'Selecciona el canal a vincular',
      'Los datos se actualizarán cada 24 h',
    ],
    apiNote: 'Requiere YouTube Data API v3 habilitada en Google Cloud.',
  },
  'meta-ads': {
    label: 'Meta Ads',
    icon: Play,
    iconColor: 'var(--platform-meta)',
    description: 'Vincula tu cuenta de Meta Ads para sincronizar campañas e insights.',
    steps: [
      'Autoriza el acceso con tu cuenta de Facebook',
      'Otorga el permiso ads_read',
      'Selecciona la cuenta publicitaria',
      'Las campañas se sincronizarán con el botón Sincronizar',
    ],
    apiNote: 'Requiere que tu app de Meta tenga ads_read aprobado para producción.',
  },
}

interface Props {
  platform: SocialPlatform
  open: boolean
  onClose: () => void
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className="space-y-4 py-2 animate-pulse">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0"
          style={{ backgroundColor: 'var(--muted)' }}
        />
        <div
          className="h-5 w-40 rounded-md"
          style={{ backgroundColor: 'var(--muted)' }}
        />
      </div>
      <div className="h-3 w-full rounded-md" style={{ backgroundColor: 'var(--muted)' }} />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-3 rounded-md flex-1" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-3 pt-2">
        <div className="h-9 w-20 rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="h-9 w-36 rounded-lg" style={{ backgroundColor: 'var(--muted)' }} />
      </div>
    </div>
  )
}

// ── Disconnected view ─────────────────────────────────────────────────────────
function DisconnectedView({
  cfg,
  onConnect,
  onClose,
  connecting,
}: {
  cfg: PlatformConfig
  onConnect: () => void
  onClose: () => void
  connecting: boolean
}) {
  const Icon = cfg.icon
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${cfg.iconColor} 9%, transparent)`,
              border: `1px solid color-mix(in srgb, ${cfg.iconColor} 19%, transparent)`,
            }}
          >
            <Icon size={20} style={{ color: cfg.iconColor }} />
          </div>
          <DialogTitle style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 600 }}>
            Conectar {cfg.label}
          </DialogTitle>
        </div>
        <DialogDescription style={{ color: 'var(--muted-foreground)' }}>
          {cfg.description}
        </DialogDescription>
      </DialogHeader>

      {/* Steps */}
      <div className="space-y-2 my-1">
        {cfg.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {i + 1}
            </div>
            <p className="text-sm leading-snug" style={{ color: 'var(--foreground)' }}>{step}</p>
          </div>
        ))}
      </div>

      {/* API requirements note — small text, no prominent box */}
      <p
        className="flex items-center gap-1.5 text-[11px]"
        style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}
      >
        <ExternalLink size={10} />
        {cfg.apiNote}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={connecting}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          {connecting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Conectando...
            </>
          ) : (
            <>Conectar con {cfg.label}</>
          )}
        </button>
      </div>
    </>
  )
}

// ── Connected view ────────────────────────────────────────────────────────────
function ConnectedView({
  cfg,
  accountName,
  accountPic,
  connectedAt,
  onDisconnect,
  onClose,
}: {
  cfg: PlatformConfig
  accountName: string | null
  accountPic: string | null
  connectedAt: string | null
  onDisconnect: () => Promise<void>
  onClose: () => void
}) {
  const Icon = cfg.icon

  const formattedDate = connectedAt
    ? new Date(connectedAt).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

  async function handleDisconnect() {
    await onDisconnect()
    onClose()
  }

  return (
    <>
      <DialogHeader>
        {/* Connected badge */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${cfg.iconColor} 9%, transparent)`,
                border: `1px solid color-mix(in srgb, ${cfg.iconColor} 19%, transparent)`,
              }}
            >
              <Icon size={20} style={{ color: cfg.iconColor }} />
            </div>
            <DialogTitle style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 600 }}>
              {cfg.label}
            </DialogTitle>
          </div>
          <span
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              color: 'var(--success)',
              border: '1px solid color-mix(in srgb, var(--success) 40%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--success) 10%, transparent)',
            }}
          >
            <CheckCircle2 size={12} />
            Conectado
          </span>
        </div>
        <DialogDescription style={{ color: 'var(--muted-foreground)' }}>
          Cuenta vinculada correctamente. Puedes desconectarla en cualquier momento.
        </DialogDescription>
      </DialogHeader>

      {/* Account info */}
      <div
        className="flex items-center gap-3 rounded-xl p-4"
        style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
      >
        {accountPic ? (
          <Image
            src={accountPic}
            alt={accountName ?? cfg.label}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <Icon size={18} style={{ color: 'var(--muted-foreground)' }} />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {accountName ?? cfg.label}
          </p>
          {formattedDate && (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Conectado el {formattedDate}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={handleDisconnect}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            color: 'var(--destructive)',
            border: '1px solid var(--destructive)',
            backgroundColor: 'transparent',
          }}
        >
          Desconectar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-70"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
        >
          Cerrar
        </button>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ConnectAccountModal({ platform, open, onClose }: Props) {
  const cfg = PLATFORMS[platform]
  const [connecting, setConnecting] = useState(false)
  const { connected, loading, accountName, accountPic, connectedAt, connect, disconnect } =
    useSocialConnection(platform)

  function handleConnect() {
    setConnecting(true)
    connect()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="max-w-md"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <SkeletonLoader />
        ) : connected ? (
          <ConnectedView
            cfg={cfg}
            accountName={accountName}
            accountPic={accountPic}
            connectedAt={connectedAt}
            onDisconnect={disconnect}
            onClose={onClose}
          />
        ) : (
          <DisconnectedView
            cfg={cfg}
            onConnect={handleConnect}
            onClose={onClose}
            connecting={connecting}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
