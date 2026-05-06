import type { Metadata } from 'next'
import { EternityAIContent } from '@/components/ai/EternityAIContent'

export const metadata: Metadata = {
  title: 'Eternity AI | Content Dashboard',
  description: 'Tu consultor de marketing con acceso a toda la data de tu workspace.',
}

export default function Page() {
  return <EternityAIContent />
}
