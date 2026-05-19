'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getDefaultLandingForRole } from '@/lib/auth/permissions'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [forgotOpen, setForgotOpen]     = useState(false)
  const [forgotEmail, setForgotEmail]   = useState('')
  const [forgotSending, setForgotSending] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !authData.session) {
      setLoading(false)
      setError('Credenciales incorrectas')
      return
    }
    try {
      const meRes = await fetch('/api/me')
      if (meRes.ok) {
        const me = await meRes.json() as { role?: string }
        const landing = getDefaultLandingForRole(me.role)
        router.replace(landing)
        router.refresh()
        return
      }
    } catch { /* fall through */ }
    setLoading(false)
    router.replace('/')
    router.refresh()
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = forgotEmail.trim()
    if (!trimmed) return
    setForgotSending(true)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setForgotSending(false)
    if (resetErr && process.env.NODE_ENV !== 'production') console.error('[forgot-password]', resetErr)
    toast.success('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.')
    setForgotOpen(false)
    setForgotEmail('')
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6"
      style={{ backgroundColor: '#0F0B0C', color: '#F5EDE3' }}
    >
      {/* Background video */}
      <video
        aria-hidden
        src="/login-bg.mp4"
        autoPlay loop muted playsInline
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-55"
      />

      {/* Dark overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: 'linear-gradient(180deg, rgba(15,11,12,0.5) 0%, rgba(15,11,12,0.88) 100%)' }}
      />

      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 z-0 h-[500px] w-[500px] animate-pulse rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(142,31,47,0.45) 0%, transparent 70%)', animationDuration: '8s' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 z-0 h-[500px] w-[500px] animate-pulse rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(176,138,74,0.25) 0%, transparent 70%)', animationDuration: '10s', animationDelay: '1s' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold"
            style={{
              backgroundColor: '#8E1F2F',
              color: '#F5EDE3',
              boxShadow: '0 10px 30px rgba(142,31,47,0.45)',
            }}
          >
            E
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(245,237,227,0.45)' }}>
            Content Dashboard
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 backdrop-blur-xl"
          style={{
            backgroundColor: 'rgba(15,11,12,0.72)',
            border: '1px solid rgba(245,237,227,0.1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          }}
        >
          <h1 className="text-[26px] font-bold leading-tight tracking-tight" style={{ color: '#F5EDE3' }}>
            Entra a tu cuenta
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(245,237,227,0.5)' }}>
            Bienvenido de vuelta. Por favor, ingresá tus datos.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold" style={{ color: 'rgba(245,237,227,0.8)' }}>
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-[#8E1F2F]"
                style={{
                  backgroundColor: 'rgba(245,237,227,0.06)',
                  border: '1px solid rgba(245,237,227,0.12)',
                  color: '#F5EDE3',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold" style={{ color: 'rgba(245,237,227,0.8)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-[#8E1F2F]"
                  style={{
                    backgroundColor: 'rgba(245,237,227,0.06)',
                    border: '1px solid rgba(245,237,227,0.12)',
                    color: '#F5EDE3',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-90 transition-opacity"
                  style={{ color: '#F5EDE3' }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setError(''); setForgotEmail(email); setForgotOpen(true) }}
                className="text-sm hover:underline transition-opacity"
                style={{ color: 'rgba(245,237,227,0.45)' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <p className="text-center text-sm" style={{ color: '#f87171' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-60 hover:brightness-110"
              style={{
                backgroundColor: '#8E1F2F',
                color: '#F5EDE3',
                boxShadow: '0 8px 24px rgba(142,31,47,0.4)',
              }}
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {loading ? 'Ingresando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: 'rgba(245,237,227,0.3)' }}>
          Protegido por Supabase Auth · Acceso gestionado por administrador
        </p>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => !forgotSending && setForgotOpen(false)}
        >
          <form
            onSubmit={handleForgotPassword}
            className="w-full max-w-sm rounded-2xl p-6 backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(15,11,12,0.96)',
              border: '1px solid rgba(245,237,227,0.12)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold" style={{ color: '#F5EDE3' }}>
              Restablecer contraseña
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'rgba(245,237,227,0.5)' }}>
              Ingresá tu email. Si existe una cuenta, te enviaremos un enlace para crear una contraseña nueva.
            </p>
            <input
              type="email"
              autoComplete="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="tu@email.com"
              className="mt-5 w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                backgroundColor: 'rgba(245,237,227,0.06)',
                border: '1px solid rgba(245,237,227,0.12)',
                color: '#F5EDE3',
              }}
              autoFocus
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                disabled={forgotSending}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'transparent', color: 'rgba(245,237,227,0.5)', border: '1px solid rgba(245,237,227,0.12)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={forgotSending || !forgotEmail.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-60 hover:brightness-110"
                style={{ backgroundColor: '#8E1F2F', color: '#F5EDE3' }}
              >
                {forgotSending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {forgotSending ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Autofill override */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px rgba(15,11,12,0.9) inset !important;
          -webkit-text-fill-color: #F5EDE3 !important;
          caret-color: #F5EDE3;
          border-color: rgba(245,237,227,0.12) !important;
        }
      `}</style>
    </div>
  )
}
