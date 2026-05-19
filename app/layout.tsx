import type { Metadata } from 'next'
import { Fira_Sans, Fira_Code, Raleway } from 'next/font/google'
import './globals.css'
import { ConditionalShell } from '@/components/layout/ConditionalShell'
import { GlobalOverlays } from '@/components/layout/GlobalOverlays'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { bootstrapAuth } from '@/lib/auth-bootstrap'
import { getActiveThemeKey } from '@/lib/active-brand'
import { ThemeInit } from '@/components/layout/ThemeInit'

const firaSans = Fira_Sans({ variable: '--font-sans-eternity', subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })
const firaMono = Fira_Code({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const raleway = Raleway({ variable: '--font-sans-govbidder', subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Content Dashboard by eternity',
  description: 'Análisis profundo de tu contenido e ingresos',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await bootstrapAuth()
  const theme = await getActiveThemeKey()
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
        <ThemeInit />
        <AuthProvider>
          <ConditionalShell>{children}</ConditionalShell>
          <GlobalOverlays />
        </AuthProvider>
      </body>
    </html>
  )
}
