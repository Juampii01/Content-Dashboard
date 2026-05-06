import type { Metadata } from 'next'
import { BasesContent } from '@/components/bases/BasesContent'

export const metadata: Metadata = {
  title: 'Bases | Eternity Dashboard',
  description: 'Define tu ICP, oferta, dolores, deseos y estrategia de contenido',
}

export default function BasesPage() {
  return (
    <main className="flex-1 p-6 min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <BasesContent />
    </main>
  )
}
