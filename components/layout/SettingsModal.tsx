'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { SettingsMenuView } from './settings/SettingsMenuView'
import { ProfileView } from './settings/ProfileView'
import { PasswordView } from './settings/PasswordView'
import { AppearanceView } from './settings/AppearanceView'
import { ConnectedAccountsView } from './settings/ConnectedAccountsView'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  role: string | null
  email: string | null
  displayName?: string | null
  avatarUrl?: string | null
  onProfileChange?: (next: { displayName: string | null; avatarUrl: string | null }) => void
}

type View = 'menu' | 'password' | 'profile' | 'appearance' | 'accounts'

export function SettingsModal({
  open,
  onClose,
  role,
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
      role="dialog"
      aria-modal="true"
      aria-label="Ajustes"
      className="fixed inset-0 z-modal flex items-center justify-center p-4 glass-overlay"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
            {view === 'menu' ? 'Ajustes' : view === 'password' ? 'Cambiar contraseña' : view === 'appearance' ? 'Apariencia' : view === 'accounts' ? 'Cuentas conectadas' : 'Perfil'}
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
            role={role}
            onSelectProfile={() => setView('profile')}
            onSelectPassword={() => setView('password')}
            onSelectAppearance={() => setView('appearance')}
            onSelectAccounts={() => setView('accounts')}
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

        {view === 'appearance' && (
          <AppearanceView onBack={() => setView('menu')} />
        )}

        {view === 'accounts' && (
          <ConnectedAccountsView onBack={() => setView('menu')} />
        )}
      </div>
    </div>,
    document.body,
  )
}
