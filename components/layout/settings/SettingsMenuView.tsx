'use client'

import Link from 'next/link'
import { Lock, Shield, User, Palette, Link2 } from 'lucide-react'

interface SettingsMenuViewProps {
  email: string | null
  role: string | null
  onSelectProfile: () => void
  onSelectPassword: () => void
  onSelectAppearance: () => void
  onSelectAccounts: () => void
  onAdminLink: () => void
}

export function SettingsMenuView({
  email,
  role,
  onSelectProfile,
  onSelectPassword,
  onSelectAppearance,
  onSelectAccounts,
  onAdminLink,
}: SettingsMenuViewProps) {
  return (
    <div className="space-y-1">
      {email && (
        <div
          className="mb-3 rounded-xl px-3 py-2 text-xs"
          style={{
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="mb-0.5 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>
            Sesión activa
          </p>
          <p style={{ color: 'var(--foreground)' }}>{email}</p>
        </div>
      )}

      <MenuItem
        icon={<User size={15} style={{ color: 'var(--accent)' }} />}
        title="Perfil"
        desc="Nombre y foto de perfil"
        onClick={onSelectProfile}
      />

      <MenuItem
        icon={<Palette size={15} style={{ color: 'var(--accent)' }} />}
        title="Apariencia"
        desc="Tema de marca y modo oscuro / claro"
        onClick={onSelectAppearance}
      />

      <MenuItem
        icon={<Link2 size={15} style={{ color: 'var(--accent)' }} />}
        title="Cuentas conectadas"
        desc="Instagram, YouTube, TikTok — conectar o desconectar"
        onClick={onSelectAccounts}
      />

      <MenuItem
        icon={<Lock size={15} style={{ color: 'var(--accent)' }} />}
        title="Cambiar contraseña"
        desc="Actualiza tu contraseña de acceso"
        onClick={onSelectPassword}
      />

      {role === 'admin' && (
        <MenuItem
          as={Link}
          href="/admin/users"
          onClick={onAdminLink}
          icon={<Shield size={15} style={{ color: 'var(--accent)' }} />}
          title="Panel de administración"
          desc="Gestionar usuarios y clientes"
        />
      )}
    </div>
  )
}

type MenuItemProps =
  | {
      as?: undefined
      onClick: () => void
      icon: React.ReactNode
      title: string
      desc: string
    }
  | {
      as: typeof Link
      href: string
      onClick?: () => void
      icon: React.ReactNode
      title: string
      desc: string
    }

function MenuItem(props: MenuItemProps) {
  const content = (
    <>
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
      >
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{props.title}</p>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{props.desc}</p>
      </div>
    </>
  )
  const baseClass = 'group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors'
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--muted)'
  }
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent'
  }

  if (props.as === Link) {
    return (
      <Link
        href={props.href}
        onClick={props.onClick}
        className={baseClass}
        style={{ backgroundColor: 'transparent' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {content}
      </Link>
    )
  }
  return (
    <button
      onClick={props.onClick}
      className={baseClass}
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {content}
    </button>
  )
}
