import type { Post } from '@/lib/types'

export const POSTS: Post[] = Array.from({ length: 18 }, (_, i) => ({
  id: `post-${String(i + 1).padStart(3, '0')}`,
  thumbnail: '',
  caption: [
    'El sistema que uso para escalar a 6 figuras sin ads.',
    'Por qué el 95% de los creadores fracasa en Instagram.',
    'Mi rutina de contenido semanal revelada.',
    'Cómo consigo 10 clientes al mes con orgánico.',
    'El error que cometí mis primeros 2 años.',
    'De 0 a 25K seguidores en 8 meses.',
  ][i % 6],
  publishedAt: new Date(Date.now() - i * 5 * 86400000).toISOString().split('T')[0],
  reach: Math.round(1200 + Math.random() * 8000),
  impressions: Math.round(1500 + Math.random() * 10000),
  likes: Math.round(80 + Math.random() * 900),
  saves: Math.round(40 + Math.random() * 600),
  comments: Math.round(10 + Math.random() * 200),
  shares: Math.round(20 + Math.random() * 300),
  engagementRate: Math.round((2 + Math.random() * 8) * 10) / 10,
}))
