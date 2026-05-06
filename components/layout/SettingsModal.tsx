'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { SettingsMenuView } from './settings/SettingsMenuView'
import { ProfileView } from './settings/ProfileView'
import { PasswordView } from './settings/PasswordView'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  globalRole: 'PENDING' | 'MEMBER' | 'SUPER_ADMIN' | null
  email: string | null
  displayName?: string | null
  avatarUrl?: string | null
  onProfileChange?: (next: { displayName: string | null; avatarUrl: string | null }) => void
}

type View = 'menu' | 'password' | 'profile'

export function SettingsModal({
  open,
  onClose,
  globalRole,
  email,
  displayName,
  avatarUrl,
  onProfileChange,
}: SettingsModalProps) {
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<View>('menu')


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal gate: flips once on mount
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset view when modal closes
      setView('menu')
    }
  }, [open])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
            {view === 'menu' ? 'Ajustes' : view === 'password' ? 'Cambiar contraseña' : 'Perfil'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X size={16} />
          </button>
        </div>

        {view === 'menu' && (
          <SettingsMenuView
            email={email}
            globalRole={globalRole}
            onSelectProfile={() => setView('profile')}
            onSelectPassword={() => setView('password')}
            onAdminLink={onClose}
          />
        )}

        {view === 'profile' && (
          <ProfileView
            email={email}
            displayName={displayName}
            avatarUrl={avatarUrl}
            onCancel={() => setView('menu')}
            onSaved={(next) => onProfileChange?.(next)}
            onDone={() => setView('menu')}
          />
        )}

        {view === 'password' && (
          <PasswordView
            onCancel={() => setView('menu')}
            onDone={() => setView('menu')}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}
