'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Check, Camera, Trash2 } from 'lucide-react'
import { resizeToDataUrl, MAX_AVATAR_FILE_BYTES } from './avatarUtils'

interface ProfileViewProps {
  email: string | null
  displayName?: string | null
  avatarUrl?: string | null
  onCancel: () => void
  onSaved: (next: { displayName: string; avatarUrl: string | null }) => void
  onDone: () => void
}

export function ProfileView({
  email,
  displayName,
  avatarUrl,
  onCancel,
  onSaved,
  onDone,
}: ProfileViewProps) {
  const [name, setName] = useState(displayName ?? '')
  const [avatar, setAvatar] = useState<string | null>(avatarUrl ?? null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const initial = (name || email || 'U').charAt(0).toUpperCase()

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileError('El archivo debe ser una imagen')
      return
    }
    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setProfileError('La imagen supera 5 MB')
      return
    }
    try {
      const dataUrl = await resizeToDataUrl(file)
      setAvatar(dataUrl)
      setProfileError('')
    } catch {
      setProfileError('No se pudo procesar la imagen')
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      setProfileError('El nombre es obligatorio')
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: trimmed, avatarUrl: avatar }),
      })
      if (!res.ok) {
        setProfileError('No se pudo guardar')
        return
      }
      setProfileSuccess(true)
      onSaved({ displayName: trimmed, avatarUrl: avatar })
      setTimeout(() => {
        setProfileSuccess(false)
        onDone()
      }, 1200)
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <form onSubmit={handleProfileSave} className="space-y-5">
      {profileSuccess && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
          style={{
            backgroundColor: 'rgba(34,197,94,0.1)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <Check size={14} /> Perfil actualizado
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div
          className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-semibold text-white"
          style={{
            background: avatar
              ? 'transparent'
              : 'linear-gradient(135deg, var(--accent) 0%, var(--eternity-deep, #5C1220) 100%)',
            boxShadow: '0 4px 14px rgba(142, 31, 47, 0.35)',
          }}
        >
          {avatar ? (
            <Image
              src={avatar}
              alt={`Avatar de ${name || email || 'tu cuenta'}`}
              fill
              sizes="64px"
              className="object-cover"
              // data: URLs (just-uploaded preview) can't go through the
              // optimizer — bypass it for those, optimize remote URLs.
              unoptimized={avatar.startsWith('data:')}
            />
          ) : (
            initial
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarPick}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            <Camera size={13} />
            {avatar ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar(null)}
              className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <Trash2 size={12} /> Quitar foto
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}>
          Nombre
        </label>
        <input
          type="text"
          required
          maxLength={64}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      {profileError && (
        <p className="text-center text-sm" style={{ color: '#ef4444' }}>
          {profileError}
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
          disabled={savingProfile}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)',
          }}
        >
          {savingProfile && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {savingProfile ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
