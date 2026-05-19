import type { Metadata } from 'next'
import { Fira_Sans, Fira_Code, Raleway } from 'next/font/google'
import './globals.css'
import { ConditionalShell } from '@/components/layout/ConditionalShell'
import { GlobalOverlays } from '@/components/layout/GlobalOverlays'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { bootstrapAuth } from '@/lib/auth-bootstrap'
import { DEFAULT_THEME_KEY } from '@/lib/themes'

const firaSans = Fira_Sans({ variable: '--font-sans-eternity', subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })
const firaMono = Fira_Code({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const raleway = Raleway({ variable: '--font-sans-govbidder', subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Content Dashboard by eternity',
  description: 'Análisis profundo de tu contenido e ingresos',
}

/**
 * Inline script injected in <head> to prevent FOUC (Flash Of Unstyled Content).
 *
 * Runs synchronously before the browser paints anything. For admin users who
 * have stored a brand theme in localStorage ('admin_theme'), this script sets
 * data-theme and the dark/light class on <html> immediately — before React
 * even loads — so the correct theme is visible from the very first frame.
 *
 * Non-admins have no 'admin_theme' key, so this script does nothing for them
 * and they see the server-rendered DEFAULT_THEME ('eternity', dark mode).
 */
const FOUC_PREVENTION_SCRIPT = `(function(){try{
  var t=localStorage.getItem('admin_theme');
  var valid=['eternity','govbidder'];
  if(t&&valid.indexOf(t)!==-1){
    document.documentElement.dataset.theme=t;
    var mk='eternity_theme:'+t;
    var m=localStorage.getItem(mk);
    var mode=m==='light'?'light':m==='dark'?'dark':t==='govbidder'?'light':'dark';
    document.documentElement.classList.toggle('dark',mode==='dark');
    document.documentElement.classList.toggle('light',mode==='light');
  }
}catch(e){}})()`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await bootstrapAuth()

  // SSR always uses the default theme. ThemeProvider + FOUC script handle
  // the admin's custom preference client-side without an extra DB query.
  const initialMode = 'dark' // DEFAULT_THEME_KEY ('eternity') defaults to dark

  return (
    <html
      lang="es"
      data-theme={DEFAULT_THEME_KEY}
      className={`${firaSans.variable} ${firaMono.variable} ${raleway.variable} ${initialMode}`}
      suppressHydrationWarning
    >
      <head>
        {/* FOUC prevention — must be synchronous, before any paint */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: FOUC_PREVENTION_SCRIPT }} />
      </head>
      <body className="antialiased" style={{ minHeight: '100vh' }}>
        <AuthProvider>
          {/* ThemeProvider must be inside AuthProvider to read profile.role */}
          <ThemeProvider>
            <ConditionalShell>{children}</ConditionalShell>
            <GlobalOverlays />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
