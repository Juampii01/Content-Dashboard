import type { Metadata } from 'next'
import { Fira_Sans, Fira_Code, Raleway } from 'next/font/google'
import './globals.css'
import { ConditionalShell } from '@/components/layout/ConditionalShell'
import { GlobalOverlays } from '@/components/layout/GlobalOverlays'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { bootstrapAuth } from '@/lib/auth-bootstrap'
import { db } from '@/lib/db'
import { getActiveClientId } from '@/lib/auth-user'

const firaSans = Fira_Sans({ variable: '--font-sans-eternity', subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })
const firaMono = Fira_Code({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const raleway = Raleway({ variable: '--font-sans-govbidder', subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Content Dashboard by eternity',
  description: 'Análisis profundo de tu contenido e ingresos',
}

const KNOWN_THEMES = new Set(['eternity', 'govbidder'])

async function resolveActiveTheme(): Promise<'eternity' | 'govbidder'> {
  try {
    const activeClientId = await getActiveClientId()
    if (!activeClientId) return 'eternity'
    const client = await db.client.findUnique({
      where: { id: activeClientId },
      select: { themeKey: true },
    })
    const key = client?.themeKey ?? 'eternity'
    return KNOWN_THEMES.has(key) ? (key as 'eternity' | 'govbidder') : 'eternity'
  } catch {
    return 'eternity'
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await bootstrapAuth()
  const theme = await resolveActiveTheme()
  // GovBidder theme defaults to LIGHT mode (matches Sales-Dashboard primary look).
  // Eternity stays DARK. Users can still toggle within their tenant.
  const initialMode = theme === 'govbidder' ? 'light' : 'dark'
  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${firaSans.variable} ${firaMono.variable} ${raleway.variable} ${initialMode}`}
      suppressHydrationWarning
    >
      <body className="antialiased" style={{ minHeight: '100vh' }}>
        <AuthProvider>
          <ConditionalShell>{children}</ConditionalShell>
          <GlobalOverlays />
        </AuthProvider>
      </body>
    </html>
  )
}
