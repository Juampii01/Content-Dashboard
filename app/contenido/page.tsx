import type { Metadata } from 'next'
import { ContenidoContent } from '@/components/contenido/ContenidoContent'

export const metadata: Metadata = {
  title: 'Contenido | Eternity Dashboard',
  description: 'Escribe y organiza los guiones de tus reels e historias',
}

export default function ContenidoPage() {
  return <ContenidoContent />
}
