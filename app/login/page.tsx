'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSending, setForgotSending] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Credenciales incorrectas')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    void fetch('/api/auth/notify-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId: data.user?.id }),
    }).catch(() => {})
    router.push('/pending-approval')
  }

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    const email = forgotEmail.trim()
    if (!email) return
    setForgotSending(true)
    // Supabase reset uses the session-less API; the email link redirects to
    // /auth/reset-password where the user sets a new password. Rate-limited
    // by Supabase server-side (avoid duplicating rate-limit here).
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setForgotSending(false)
    if (resetErr) {
      // Even on error we show the same success message to avoid email
      // enumeration (Supabase also behaves this way). Log silently.
      console.error('[forgot-password]', resetErr)
    }
    toast.success('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.')
    setForgotOpen(false)
    setForgotEmail('')
  }

  const inputStyle = {
    backgroundColor: 'rgba(22, 17, 18, 0.6)',
    border: '1px solid var(--border, #2A1C1F)',
    color: 'var(--foreground)',
  } as const

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6"
      style={{
        backgroundColor: 'var(--background, #0F0B0C)',
        color: 'var(--foreground)',
      }}
    >
      {/* Fullscreen background video — visible on mobile AND desktop */}
      <video
        aria-hidden
        src="/login-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-60"
      />

      {/* Dark gradient overlay for readability over the video */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(15, 11, 12, 0.55) 0%, rgba(15, 11, 12, 0.85) 100%)',
        }}
      />

      {/* Ambient gradient orbs — match /pending-approval, rendered above the video */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 z-0 h-[500px] w-[500px] animate-pulse rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(142, 31, 47, 0.45) 0%, rgba(142, 31, 47, 0) 70%)',
          animationDuration: '8s',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 z-0 h-[500px] w-[500px] animate-pulse rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(176, 138, 74, 0.3) 0%, rgba(176, 138, 74, 0) 70%)',
          animationDuration: '10s',
          animationDelay: '1s',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(142, 31, 47, 0.1) 0%, rgba(142, 31, 47, 0) 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark — matches /pending-approval */}
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
          <h1
            className="text-[28px] font-bold leading-tight tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            {tab === 'login' ? 'Entra a tu cuenta' : 'Crea tu cuenta'}
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--muted-foreground, #9A8F89)' }}
          >
            {tab === 'login'
              ? 'Bienvenido de vuelta. Por favor, ingresa tus datos.'
              : 'Regístrate para solicitar acceso al dashboard.'}
          </p>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
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
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--muted-foreground, #9A8F89)' }}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end text-sm">
                <button
                  type="button"
                  className="hover:underline"
                  style={{ color: 'var(--muted-foreground, #9A8F89)' }}
                  onClick={() => {
                    setError('')
                    setForgotEmail(email)
                    setForgotOpen(true)
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {error && <p className="text-center text-sm" style={{ color: '#ef4444' }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--foreground)',
                  color: '#000',
                  boxShadow: '0 10px 30px rgba(245, 237, 227, 0.15)',
                }}
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {loading ? 'Ingresando…' : 'Entrar'}
              </button>

              <p className="mt-4 text-center text-sm" style={{ color: 'var(--muted-foreground, #9A8F89)' }}>
                ¿Aún no tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--foreground)' }}
                >
                  Regístrate
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--muted-foreground, #9A8F89)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--muted-foreground, #9A8F89)' }}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-center text-sm" style={{ color: '#ef4444' }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--foreground)',
                  color: '#000',
                  boxShadow: '0 10px 30px rgba(245, 237, 227, 0.15)',
                }}
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {loading ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>

              <p className="mt-4 text-center text-sm" style={{ color: 'var(--muted-foreground, #9A8F89)' }}>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--foreground)' }}
                >
                  Inicia sesión
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <p
          className="mt-8 text-center text-xs"
          style={{ color: 'var(--muted-foreground, #9A8F89)' }}
        >
          Protegido por Supabase Auth · Acceso requiere aprobación
        </p>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => !forgotSending && setForgotOpen(false)}
        >
          <form
            onSubmit={handleForgotPassword}
            className="w-full max-w-sm rounded-2xl p-6 backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(22, 17, 18, 0.95)',
              border: '1px solid var(--border, #2A1C1F)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Restablecer contraseña
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground, #9A8F89)' }}>
              Ingresa tu email. Si existe una cuenta asociada, te enviaremos un enlace para crear una contraseña nueva.
            </p>
            <input
              type="email"
              autoComplete="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="tu@email.com"
              className="mt-5 w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
              style={inputStyle}
              autoFocus
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                disabled={forgotSending}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--muted-foreground, #9A8F89)',
                  border: '1px solid var(--border, #2A1C1F)',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={forgotSending || !forgotEmail.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: 'var(--foreground)', color: '#000' }}
              >
                {forgotSending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {forgotSending ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
