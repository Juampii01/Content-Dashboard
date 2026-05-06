import type { Metadata } from 'next'
import { CompetitorList } from '@/components/competidores/CompetitorList'

export const metadata: Metadata = {
  title: 'Competidores | Eternity Dashboard',
  description: 'Baúl de competidores: extrae reels, transcribe y analiza con IA',
}

export default function CompetidoresPage() {
  return (
    <main className="flex-1 p-6 min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <CompetitorList />
    </main>
  )
}
