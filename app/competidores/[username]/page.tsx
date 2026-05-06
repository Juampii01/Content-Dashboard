import type { Metadata } from 'next'
import { CompetitorDetail } from '@/components/competidores/CompetitorDetail'

// Next.js 16: params is a Promise — must await.
interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} | Competidores`,
    description: `Reels y análisis de @${username}`,
  }
}

export default async function CompetidorDetailPage({ params }: PageProps) {
  const { username } = await params
  return (
    <main className="flex-1 p-6 min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <CompetitorDetail username={username} />
    </main>
  )
}
