'use client'

import { useState, useEffect } from 'react'
import { Camera, PlayCircle, Music2, ChevronLeft, Unlink, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Camera,
    color: '#E1306C',
    gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: PlayCircle,
    color: '#FF0000',
    gradient: 'linear-gradient(135deg, #FF0000, #CC0000)',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: Music2,
    color: '#000000',
    gradient: 'linear-gradient(135deg, #010101, #69C9D0)',
  },
] as const

type PlatformId = (typeof PLATFORMS)[number]['id']

interface StatusMap {
  [key: string]: { connected: boolean; accountName?: string; loading: boolean }
}

async function disconnectPlatform(platform: PlatformId): Promise<boolean> {
  const res = await fetch(`/api/social/${platform}/disconnect`, { method: 'DELETE' })
  return res.ok
}

interface Props {
  onBack: () => void
}

export function ConnectedAccountsView({ onBack }: Props) {
  const [statuses, setStatuses] = useState<StatusMap>(() =>
    Object.fromEntries(PLATFORMS.map(p => [p.id, { connected: false, loading: true }])),
  )
  const [disconnecting, setDisconnecting] = useState<PlatformId | null>(null)

  useEffect(() => {
    PLATFORMS.forEach(async (p) => {
      try {
        const res = await fetch(`/api/social/${p.id}/status`)
        if (res.ok) {
          const data = await res.json() as { connected: boolean; accountName?: string }
          setStatuses(prev => ({ ...prev, [p.id]: { connected: data.connected, accountName: data.accountName, loading: false } }))
        } else {
          setStatuses(prev => ({ ...prev, [p.id]: { connected: false, loading: false } }))
        }
      } catch {
        setStatuses(prev => ({ ...prev, [p.id]: { connected: false, loading: false } }))
      }
    })
  }, [])

  async function handleDisconnect(id: PlatformId, label: string) {
    setDisconnecting(id)
    try {
      const ok = await disconnectPlatform(id)
      if (ok) {
        toast.success(`${label} desconectado`)
        setStatuses(prev => ({ ...prev, [id]: { connected: false, loading: false } }))
      } else {
        toast.error(`Error al desconectar ${label}`)
      }
    } catch {
      toast.error(`Error al desconectar ${label}`)
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs mb-4 px-1"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <ChevronLeft size={14} />
        Volver a Ajustes
      </button>

      <p className="text-xs px-1 mb-3" style={{ color: 'var(--muted-foreground)' }}>
        Gestioná las cuentas conectadas a tu workspace.
      </p>

      <div className="space-y-2">
        {PLATFORMS.map(({ id, label, icon: Icon, color, gradient }) => {
          const status = statuses[id]
          const isLoading = status.loading
          const isConnected = status.connected
          const isDisconnecting = disconnecting === id

          return (
            <div
              key={id}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Platform icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: gradient }}
              >
                <Icon size={16} className="text-white" strokeWidth={1.5} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</p>
                {isLoading ? (
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Verificando...</p>
                ) : isConnected ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-500" />
                    <span className="text-xs text-emerald-500 font-medium">
                      {status.accountName ? `@${status.accountName}` : 'Conectado'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <XCircle size={11} style={{ color: 'var(--muted-foreground)' }} />
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No conectado</span>
                  </div>
                )}
              </div>

              {/* Action */}
              {isLoading ? (
                <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              ) : isConnected ? (
                <button
                  onClick={() => void handleDisconnect(id, label)}
                  disabled={isDisconnecting}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted-foreground)',
                  }}
                  title={`Desconectar ${label}`}
                >
                  {isDisconnecting ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Unlink size={11} />
                  )}
                  {isDisconnecting ? 'Desconectando' : 'Desconectar'}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
