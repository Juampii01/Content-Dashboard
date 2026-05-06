import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TikTokContent } from './TikTokContent'
import Loading from './loading'

export const metadata: Metadata = {
  title: 'TikTok Analytics | Eternity Dashboard',
  description: 'Estadísticas detalladas de tu cuenta de TikTok',
}

export default function TikTokPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TikTokContent />
    </Suspense>
  )
}
