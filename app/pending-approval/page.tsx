'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Hourglass, LogOut, Mail, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PendingApprovalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [supabase])

  async function handleSignOut() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6"
      style={{
        backgroundColor: 'var(--background, #0F0B0C)',
        color: 'var(--foreground)',
      }}
    >
      {/* Ambient gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(142, 31, 47, 0.35) 0%, rgba(142, 31, 47, 0) 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(176, 138, 74, 0.25) 0%, rgba(176, 138, 74, 0) 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-10 flex flex-col items-center">
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold shadow-lg"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
              boxShadow: '0 10px 30px rgba(142, 31, 47, 0.4)',
            }}
          >
            E
          </div>
          <p
            className="text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: 'var(--muted-foreground, #9A8F89)' }}
          >
            Content Dashboard · eternity
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(22, 17, 18, 0.75)',
            border: '1px solid var(--border, #2A1C1F)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Animated icon + pulse */}
          <div className="mb-6 flex flex-col items-center">
            <div className="relative">
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{ backgroundColor: 'rgba(142, 31, 47, 0.3)' }}
              />
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--card, #161112)',
                  border: '1px solid var(--accent)',
                }}
              >
                <Hourglass
                  size={26}
                  className="animate-pulse"
                  style={{ color: 'var(--accent)' }}
                />
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1
            className="text-center text-2xl font-bold leading-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Tu cuenta está en revisión
          </h1>
          <p
            className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed"
            style={{ color: 'var(--muted-foreground, #9A8F89)' }}
          >
            Un administrador debe aprobar tu acceso antes de que puedas entrar al dashboard.
          </p>

          {email && (
            <div
              className="mt-5 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs"
              style={{
                backgroundColor: 'var(--muted, #1D1517)',
                border: '1px solid var(--border, #2A1C1F)',
                color: 'var(--muted-foreground, #9A8F89)',
              }}
            >
              <Mail size={13} />
              <span style={{ color: 'var(--foreground)' }}>{email}</span>
            </div>
          )}

          {/* Steps */}
          <div
            className="my-7 h-px w-full"
            style={{ backgroundColor: 'var(--border, #2A1C1F)' }}
          />
          <ul className="space-y-3">
            {[
              {
                label: 'Te registraste correctamente',
                done: true,
              },
              {
                label: 'Notificamos al administrador',
                done: true,
              },
              {
                label: 'Esperando aprobación',
                done: false,
              },
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: step.done
                      ? 'var(--accent)'
                      : 'var(--muted, #1D1517)',
                    border: step.done
                      ? 'none'
                      : '1px solid var(--border, #2A1C1F)',
                  }}
                >
                  {step.done ? (
                    <ShieldCheck size={11} style={{ color: 'var(--accent-foreground)' }} />
                  ) : (
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ backgroundColor: 'var(--muted-foreground, #9A8F89)' }}
                    />
                  )}
                </span>
                <span
                  style={{
                    color: step.done
                      ? 'var(--foreground)'
                      : 'var(--muted-foreground, #9A8F89)',
                  }}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ul>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--muted-foreground, #9A8F89)',
              border: '1px solid var(--border, #2A1C1F)',
            }}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <LogOut size={14} />
            )}
            {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>

        <p
          className="mt-6 text-center text-[11px]"
          style={{ color: 'var(--muted-foreground, #9A8F89)', opacity: 0.6 }}
        >
          ¿Problemas? Contacta a tu administrador.
        </p>
      </div>
    </div>
  )
}
