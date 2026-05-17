'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'meta-ads'

interface SocialStatus {
  connected: boolean
  accountName?: string
  accountPic?: string
  connectedAt?: string
}

interface UseSocialConnectionReturn {
  connected: boolean
  loading: boolean
  accountName: string | null
  accountPic: string | null
  connectedAt: string | null
  connect: () => void
  disconnect: () => Promise<void>
  refresh: () => Promise<void>
}

export function useSocialConnection(
  platform: SocialPlatform,
  options?: { onConnectSuccess?: () => void },
): UseSocialConnectionReturn {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [accountPic, setAccountPic] = useState<string | null>(null)
  const [connectedAt, setConnectedAt] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/social/${platform}/status`)
      if (res.ok) {
        const data: SocialStatus = await res.json()
        setConnected(data.connected)
        setAccountName(data.accountName ?? null)
        setAccountPic(data.accountPic ?? null)
        setConnectedAt(data.connectedAt ?? null)
      }
    } catch {
      // network error — keep previous state
    } finally {
      setLoading(false)
    }
  }, [platform])

  // Initial fetch on mount — depend only on stable platform string
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/social/${platform}/status`)
        if (!cancelled && res.ok) {
          const data: SocialStatus = await res.json()
          setConnected(data.connected)
          setAccountName(data.accountName ?? null)
          setAccountPic(data.accountPic ?? null)
          setConnectedAt(data.connectedAt ?? null)
        }
      } catch {
        // keep previous state on network error
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
   
  }, [platform])

  // Handle OAuth redirect — read URL params directly without useSearchParams
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const successPlatform = params.get('connect_success')
    const errorPlatform = params.get('connect_error')

    if (successPlatform === platform) {
      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} conectado correctamente`)
      void refresh().then(() => options?.onConnectSuccess?.())
      params.delete('connect_success')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    } else if (errorPlatform === platform) {
      const reason = params.get('connect_error_reason')
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1)
      if (reason === 'not_configured') {
        toast.error(`Configura las credenciales de ${platformName} en las variables de entorno para habilitar la conexión.`, { duration: 6000 })
      } else if (reason === 'access_denied') {
        toast.error(`Cancelaste la conexión con ${platformName}. Puedes intentarlo de nuevo cuando quieras.`)
      } else {
        toast.error(`Error al conectar ${platformName}. Inténtalo de nuevo.`)
      }
      params.delete('connect_error')
      params.delete('connect_error_reason')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = useCallback(() => {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/api/social/${platform}/connect?returnTo=${returnTo}`
  }, [platform])

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch(`/api/social/${platform}/disconnect`, { method: 'DELETE' })
      if (res.ok) {
        await refresh()
      } else {
        toast.error(`Error al desconectar ${platform}`)
      }
    } catch {
      toast.error(`Error al desconectar ${platform}`)
    }
  }, [platform, refresh])

  return {
    connected,
    loading,
    accountName,
    accountPic,
    connectedAt,
    connect,
    disconnect,
    refresh,
  }
}
