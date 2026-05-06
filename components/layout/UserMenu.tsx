'use client'

import { useState } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsModal } from './SettingsModal'

interface UserMenuProps {
  email: string | null
  globalRole: 'PENDING' | 'MEMBER' | 'SUPER_ADMIN' | null
  displayName?: string | null
  avatarUrl?: string | null
  collapsed: boolean
  onProfileChange?: (next: { displayName: string | null; avatarUrl: string | null }) => void
}

const ROLE_LABEL: Record<NonNullable<UserMenuProps['globalRole']>, string> = {
  PENDING: 'Pendiente',
  MEMBER: 'Miembro',
  SUPER_ADMIN: 'Super Admin',
}

export function UserMenu({
  email,
  globalRole,
  displayName,
  avatarUrl,
  collapsed,
  onProfileChange,
}: UserMenuProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const primaryLabel = displayName || email || '—'
  const initial = (displayName ?? email ?? 'U').charAt(0).toUpperCase()

  const avatar = (
    <div
      className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-white text-sm font-semibold"
      style={{
        background: avatarUrl
          ? 'transparent'
          : 'linear-gradient(135deg, var(--accent) 0%, var(--eternity-deep, #5C1220) 100%)',
        boxShadow: '0 4px 14px rgba(142, 31, 47, 0.35)',
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  )

  if (collapsed) {
    return (
      <>
        <button
          onClick={() => setSettingsOpen(true)}
          title={primaryLabel}
          aria-label="Ajustes"
          className="group relative mx-auto flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105"
          style={{ padding: 0 }}
        >
          {avatar}
        </button>
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          globalRole={globalRole}
          email={email}
          displayName={displayName}
          avatarUrl={avatarUrl}
          onProfileChange={onProfileChange}
        />
      </>
    )
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-2xl p-2.5',
        )}
        style={{
          backgroundColor: 'var(--muted)',
          border: '1px solid var(--border)',
        }}
      >
        {avatar}

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13px] font-semibold leading-tight"
            style={{ color: 'var(--foreground)' }}
            title={primaryLabel}
          >
            {primaryLabel}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium leading-tight">
            <Sparkles size={10} style={{ color: 'var(--eternity-gold, #B08A4A)' }} />
            <span style={{ color: 'var(--eternity-gold, #B08A4A)' }}>
              {globalRole ? ROLE_LABEL[globalRole] : '—'}
            </span>
          </p>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Ajustes"
          title="Ajustes"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card)'
            e.currentTarget.style.color = 'var(--foreground)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--muted-foreground)'
          }}
        >
          <Settings size={14} />
        </button>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        globalRole={globalRole}
        email={email}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onProfileChange={onProfileChange}
      />
    </>
  )
}
