'use client'

import { useState } from 'react'
import { Link2, Check, Loader2 } from 'lucide-react'
import { useSocialConnection, type SocialPlatform } from '@/hooks/useSocialConnection'
import { ConnectAccountModal } from './ConnectAccountModal'

interface Props {
  platform: SocialPlatform
  labels?: { connected?: string; disconnected?: string }
}

export function ConnectButton({ platform, labels }: Props) {
  const [open, setOpen] = useState(false)
  const { connected, loading } = useSocialConnection(platform, {
    onConnectSuccess: () => setOpen(false),
  })

  const labelConnected = labels?.connected ?? `${platform.charAt(0).toUpperCase() + platform.slice(1)} conectado`
  const labelDisconnected = labels?.disconnected ?? 'Conectar cuenta'

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium opacity-60 cursor-not-allowed"
        style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
      >
        <Loader2 size={14} className="animate-spin" />
        Cargando...
      </button>
    )
  }

  return (
    <>
      {connected ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--success)' }}
        >
          <Check size={14} style={{ color: 'var(--success)' }} />
          {labelConnected}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          <Link2 size={14} />
          {labelDisconnected}
        </button>
      )}
      <ConnectAccountModal platform={platform} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
