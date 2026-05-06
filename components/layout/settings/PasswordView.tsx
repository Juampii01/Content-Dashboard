'use client'

import { useState } from 'react'
import { Eye, EyeOff, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PasswordViewProps {
  onCancel: () => void
  onDone: () => void
}

export function PasswordView({ onCancel, onDone }: PasswordViewProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwdError('')
    if (newPassword.length < 6) {
      setPwdError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (err) {
      setPwdError(err.message)
      return
    }
    setPwdSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => {
      setPwdSuccess(false)
      onDone()
    }, 1500)
  }

  return (
    <form onSubmit={handlePasswordChange} className="space-y-4">
      {pwdSuccess && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
          style={{
            backgroundColor: 'rgba(34,197,94,0.1)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <Check size={14} />
          Contraseña actualizada
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}>
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm outline-none"
            style={{
              backgroundColor: 'var(--muted)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}>
          Confirmar nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm outline-none"
            style={{
              backgroundColor: 'var(--muted)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {pwdError && (
        <p className="text-center text-sm" style={{ color: '#ef4444' }}>
          {pwdError}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)',
          }}
        >
          {loading && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
