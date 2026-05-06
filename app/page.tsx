import type { Metadata } from 'next'
import { HomeContent } from '@/components/home/HomeContent'

export const metadata: Metadata = {
  title: 'Inicio | Eternity Dashboard',
  description: 'Resumen de rendimiento, pipeline y contenido de tu cuenta',
}

export default function HomePage() {
  return (
    <main className="flex-1 min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <HomeContent />
    </main>
  )
}
