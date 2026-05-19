'use client'

import { useContext, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Eye, Users, TrendingUp, Menu, ChevronDown, Settings, LogOut, X } from 'lucide-react'
import { formatM, formatPercent } from '@/lib/utils/formatters'
import { ThemeToggle } from './ThemeToggle'
import { SettingsModal } from './SettingsModal'
import { MobileSidebarContext } from './LayoutShell'
import { useAuth } from './AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface GlobalStats {
  followers: number
  views: number
  engagementRate: number
}

interface UserEntry {
  id: string
  email: string | null
  displayName: string | null
  role: string
  clientId: string | null
}

const EMPTY = '—'

function readViewAsCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('admin_view_as='))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

export function TopBar() {
  const { open: openMobileSidebar } = useContext(MobileSidebarContext)
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuth()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // User dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<UserEntry[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // View-as state
  const [viewAsClientId, setViewAsClientId] = useState<string | null>(null)
  const [viewAsLoading, setViewAsLoading] = useState(false)

  const isAdmin = profile?.role === 'admin'

  // Initials & display for the current identity shown in the pill
  const viewAsUser = viewAsClientId
    ? allUsers.find((u) => u.clientId === viewAsClientId) ?? null
    : null

  const pillName = viewAsUser
    ? (viewAsUser.displayName ?? viewAsUser.email ?? 'Usuario')
    : (profile?.displayName ?? profile?.email ?? 'Tu Cuenta')

  const pillInitials = pillName.slice(0, 2).toUpperCase()

  // Map route → platform param
  const platformParam = pathname.startsWith('/instagram')
    ? 'instagram'
    : pathname.startsWith('/youtube')
    ? 'youtube'
    : pathname.startsWith('/tiktok')
    ? 'tiktok'
    : pathname.startsWith('/ads')
    ? 'meta-ads'
    : null

  useEffect(() => {
    let cancelled = false
    const url = platformParam
      ? `/api/me/global-stats?platform=${platformParam}`
      : '/api/me/global-stats'
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<GlobalStats | null>) : null))
      .then((data) => { if (!cancelled) { setStats(data); setLoaded(true) } })
      .catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [pathname, platformParam])

  // Fetch all users (admin only) + read existing view-as cookie
  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.users) setAllUsers(data.users)
      })
      .catch(() => {})
    // Read cookie after users load
    setViewAsClientId(readViewAsCookie())
  }, [isAdmin])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  // ── View-as actions ────────────────────────────────────────────────────────

  async function handleViewAs(user: UserEntry) {
    if (user.id === profile?.userId) return
    if (!user.clientId) {
      toast.error('Este usuario no tiene organización asignada.')
      return
    }
    setViewAsLoading(true)
    try {
      const res = await fetch('/api/admin/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: user.clientId }),
      })
      if (res.ok) {
        setViewAsClientId(user.clientId)
        setDropdownOpen(false)
        router.refresh()
        window.location.reload()
      }
    } catch {
      toast.error('Error al cambiar de usuario.')
    } finally {
      setViewAsLoading(false)
    }
  }

  async function handleClearViewAs() {
    setViewAsLoading(true)
    try {
      await fetch('/api/admin/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: null }),
      })
      setViewAsClientId(null)
      setDropdownOpen(false)
      router.refresh()
      window.location.reload()
    } finally {
      setViewAsLoading(false)
    }
  }

  // ── Sign out ───────────────────────────────────────────────────────────────

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Metrics ────────────────────────────────────────────────────────────────

  const metrics = [
    { Icon: Eye,        label: 'VIEWS',     value: stats ? formatM(stats.views)                : EMPTY, color: 'var(--stat-icon)',           delay: '0ms'   },
    { Icon: Users,      label: 'FOLLOWERS', value: stats ? formatM(stats.followers)            : EMPTY, color: 'var(--stat-icon)',           delay: '60ms'  },
    { Icon: TrendingUp, label: 'ENG. RATE', value: stats ? formatPercent(stats.engagementRate) : EMPTY, color: 'var(--stat-icon-secondary)', delay: '120ms' },
  ]

  return (
    <header
      className="sticky top-0 z-sticky h-16 flex items-center justify-between gap-4 px-4 md:px-6 backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--background) 80%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Mobile menu */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Abrir menú"
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl transition-colors cursor-pointer hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Center metric pills */}
      <div
        className="hidden lg:flex items-center gap-1 rounded-xl border px-1 py-1"
        style={{ backgroundColor: 'color-mix(in srgb, var(--card) 60%, transparent)', borderColor: 'var(--border)' }}
        aria-busy={!loaded || undefined}
        aria-label="Métricas globales"
      >
        {metrics.map(({ Icon, label, value, color, delay }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ animationDelay: delay, animationFillMode: 'both' }}
          >
            <Icon size={13} style={{ color }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
              {label}
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">

        {/* View-as active banner */}
        {viewAsClientId && viewAsUser && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
            }}
          >
            <Eye size={11} />
            Viendo como {viewAsUser.displayName ?? viewAsUser.email}
            <button
              type="button"
              onClick={handleClearViewAs}
              disabled={viewAsLoading}
              className="ml-0.5 cursor-pointer hover:opacity-70 transition-opacity disabled:opacity-40"
              aria-label="Salir de vista como"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {/* User dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 px-3 py-2 rounded-full transition-colors cursor-pointer"
            style={{
              backgroundColor: viewAsClientId ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--card)',
              border: viewAsClientId
                ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)'
                : '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
            onMouseEnter={(e) => {
              if (!viewAsClientId)
                e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--card) 80%, var(--foreground) 4%)'
            }}
            onMouseLeave={(e) => {
              if (!viewAsClientId)
                e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
          >
            <span
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: viewAsClientId
                  ? 'color-mix(in srgb, var(--accent) 25%, transparent)'
                  : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                border: '1.5px solid color-mix(in srgb, var(--accent) 40%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {pillInitials}
            </span>
            <span className="hidden sm:block text-sm font-medium leading-none truncate max-w-[120px]">
              {pillName}
            </span>
            <ChevronDown
              size={13}
              style={{
                color: 'var(--muted-foreground)',
                flexShrink: 0,
                transition: 'transform 200ms',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-xl shadow-lg overflow-hidden"
              style={{
                zIndex: 100,
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                minWidth: '240px',
                boxShadow: 'var(--shadow-modal)',
              }}
            >
              {/* Current user email */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-[11px] font-medium truncate" style={{ color: 'var(--muted-foreground)' }}>
                  {profile?.email ?? ''}
                </p>
                {viewAsClientId && viewAsUser && (
                  <p className="text-[11px] mt-0.5 font-semibold flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    <Eye size={10} />
                    Viendo como {viewAsUser.displayName ?? viewAsUser.email}
                  </p>
                )}
              </div>

              {/* Users list — admin only */}
              {isAdmin && allUsers.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                      Usuarios
                    </p>
                  </div>
                  <div className="pb-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {allUsers.map((u) => {
                      const isSelf      = u.id === profile?.userId
                      const isViewingAs = u.clientId === viewAsClientId && !!viewAsClientId
                      const name        = u.displayName ?? u.email ?? u.id
                      const letter      = name.slice(0, 1).toUpperCase()

                      return (
                        <div
                          key={u.id}
                          className="group flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors"
                          style={{ backgroundColor: isViewingAs ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent' }}
                          onClick={() => !isSelf && !viewAsLoading && handleViewAs(u)}
                          onMouseEnter={(e) => {
                            if (!isSelf && !isViewingAs)
                              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 5%, transparent)'
                          }}
                          onMouseLeave={(e) => {
                            if (!isViewingAs)
                              e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <span
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{
                              backgroundColor: isSelf || isViewingAs
                                ? 'color-mix(in srgb, var(--accent) 18%, transparent)'
                                : 'var(--muted)',
                              color: isSelf || isViewingAs ? 'var(--accent)' : 'var(--muted-foreground)',
                              border: isSelf || isViewingAs
                                ? '1.5px solid color-mix(in srgb, var(--accent) 35%, transparent)'
                                : '1px solid var(--border)',
                            }}
                          >
                            {letter}
                          </span>

                          <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {name}
                          </span>

                          {isSelf && (
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                                color: 'var(--accent)',
                              }}
                            >
                              Activo
                            </span>
                          )}

                          {isViewingAs && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void handleClearViewAs() }}
                              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                              style={{ color: 'var(--accent)' }}
                              title="Salir de vista como"
                            >
                              <X size={12} />
                            </button>
                          )}

                          {!isSelf && !isViewingAs && (
                            <span
                              className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity text-[10px] font-medium flex items-center gap-0.5"
                              style={{ color: 'var(--muted-foreground)' }}
                            >
                              <Eye size={10} />
                              Ver
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                </>
              )}

              {/* Settings */}
              <button
                type="button"
                onClick={() => { setSettingsOpen(true); setDropdownOpen(false) }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium cursor-pointer transition-colors"
                style={{ color: 'var(--foreground)', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 5%, transparent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <Settings size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                Configuración
              </button>

              {/* Sign out */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium cursor-pointer transition-colors"
                style={{ color: 'var(--muted-foreground)', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 5%, transparent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <LogOut size={13} style={{ flexShrink: 0 }} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        role={profile?.role ?? null}
        email={profile?.email ?? null}
        displayName={profile?.displayName ?? null}
        avatarUrl={profile?.avatarUrl ?? null}
      />
    </header>
  )
}
