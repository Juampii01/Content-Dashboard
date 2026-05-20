'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, ArrowLeft } from 'lucide-react'

type Mode = 'dark' | 'light'

function readCurrentTheme(): string {
  return document.documentElement.dataset.theme ?? 'eternity'
}

function readCurrentMode(): Mode {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

function storageKey(themeKey: string): string {
  return `eternity_theme:${themeKey}`
}

interface AppearanceViewProps {
  onBack: () => void
}

export function AppearanceView({ onBack }: AppearanceViewProps) {
  const [mode, setMode] = useState<Mode>('dark')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(readCurrentMode())
  }, [])

  function toggleMode() {
    const next: Mode = mode === 'dark' ? 'light' : 'dark'
    const html = document.documentElement
    const themeKey = readCurrentTheme()
    html.classList.toggle('dark', next === 'dark')
    html.classList.toggle('light', next === 'light')
    localStorage.setItem(storageKey(themeKey), next)
    setMode(next)
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <ArrowLeft size={13} />
        Volver
      </button>

      {/* Dark / light mode */}
      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
          Modo
        </p>
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            {mode === 'dark'
              ? <Moon size={15} style={{ color: 'var(--accent)' }} />
              : <Sun size={15} style={{ color: 'var(--stat-icon)' }} />
            }
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {mode === 'dark' ? 'Modo oscuro' : 'Modo claro'}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {mode === 'dark' ? 'Fondo oscuro, bajo consumo visual' : 'Fondo claro, ideal para ambientes con luz'}
              </p>
            </div>
          </div>
          {/* Toggle pill */}
          <button
            onClick={toggleMode}
            role="switch"
            aria-checked={mode === 'light'}
            className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 cursor-pointer"
            style={{ backgroundColor: mode === 'light' ? 'var(--accent)' : 'var(--border)' }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full transition-transform duration-200"
              style={{
                backgroundColor: 'var(--card)',
                left: '2px',
                transform: mode === 'light' ? 'translateX(20px)' : 'translateX(0)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          Para cambiar el tema de marca (Eternity / GovBidder) usá el selector en la barra superior.
        </p>
      </section>
    </div>
  )
}
