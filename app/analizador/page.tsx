import type { Metadata } from 'next'
import { AnalizadorContent } from '@/components/analizador/AnalizadorContent'

export const metadata: Metadata = {
  title: 'Analizador | Eternity Dashboard',
  description: 'Analiza reels de Instagram y extrae la estructura de cada guión',
}

export default function AnalizadorPage() {
  return (
    <main className="flex-1 p-6 min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <AnalizadorContent />
    </main>
  )
}
