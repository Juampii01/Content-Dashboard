import type { Metadata } from 'next'
import { Suspense } from 'react'
import { YouTubeContent } from '@/components/youtube/YouTubeContent'
import Loading from './loading'

export const metadata: Metadata = {
  title: 'YouTube Analytics | Eternity Dashboard',
  description: 'Estadísticas detalladas de tu canal de YouTube',
}

export default function YouTubePage() {
  return (
    <Suspense fallback={<Loading />}>
      <YouTubeContent />
    </Suspense>
  )
}
