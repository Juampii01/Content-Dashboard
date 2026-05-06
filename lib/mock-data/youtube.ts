/**
 * YouTube mock data — used ONLY as fallback for demo when no real YouTube
 * connection exists on the active client. Real sync via /api/youtube/sync
 * overrides these values. TODO: remove once all demo clients connect real
 * accounts.
 */

export const youtubeMockSnapshot = {
  subscribers: 128_400,
  totalViews: 4_720_000,
  videoCount: 87,
}

export const youtubeMockSnapshotHistory: Array<{
  date: string
  subscribers: number
  totalViews: number
  videoCount: number
}> = Array.from({ length: 90 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (89 - i))
  return {
    date: d.toISOString(),
    subscribers: Math.round(115_000 + (i / 89) * 13_400 + Math.sin(i / 6) * 600),
    totalViews: Math.round(4_200_000 + (i / 89) * 520_000 + Math.sin(i / 4) * 8_000),
    videoCount: Math.min(87, Math.max(60, Math.round(60 + (i / 89) * 27))),
  }
})

export interface YouTubeMockVideo {
  id: string
  videoId: string
  title: string
  description: string
  thumbnailUrl: string
  url: string
  durationSec: number
  durationLabel: string
  viewsCount: number
  likesCount: number
  commentsCount: number
  favoriteCount: number
  watchTimeMinutes: number | null
  averageViewDuration: number | null
  averageViewPercent: number | null
  ctr: number | null
  publishedAt: string
  syncedAt: string
}

const baseDate = Date.now()
function daysAgo(n: number): string {
  return new Date(baseDate - n * 24 * 60 * 60 * 1000).toISOString()
}

export const youtubeMockVideos: YouTubeMockVideo[] = [
  {
    id: 'mock-yt-1',
    videoId: 'mock-yt-1',
    title: 'Cómo escalar tu marca personal en 2026',
    description: 'Tácticas prácticas para pasar de 1K a 100K seguidores.',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    url: '#',
    durationSec: 612,
    durationLabel: '10:12',
    viewsCount: 342_100,
    likesCount: 18_450,
    commentsCount: 1_230,
    favoriteCount: 0,
    watchTimeMinutes: 48_320,
    averageViewDuration: 312,
    averageViewPercent: 51,
    ctr: 9.4,
    publishedAt: daysAgo(3),
    syncedAt: daysAgo(0),
  },
  {
    id: 'mock-yt-2',
    videoId: 'mock-yt-2',
    title: 'El error #1 al crear contenido para Reels',
    description: 'Lo que nadie te dice sobre el hook de los primeros 2 segundos.',
    thumbnailUrl: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
    url: '#',
    durationSec: 421,
    durationLabel: '7:01',
    viewsCount: 198_700,
    likesCount: 11_900,
    commentsCount: 842,
    favoriteCount: 0,
    watchTimeMinutes: 27_410,
    averageViewDuration: 258,
    averageViewPercent: 61,
    ctr: 12.1,
    publishedAt: daysAgo(9),
    syncedAt: daysAgo(0),
  },
  {
    id: 'mock-yt-3',
    videoId: 'mock-yt-3',
    title: 'Mi setup completo de producción de contenido',
    description: 'Cámara, luces, software y workflow end-to-end.',
    thumbnailUrl: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
    url: '#',
    durationSec: 893,
    durationLabel: '14:53',
    viewsCount: 124_300,
    likesCount: 8_120,
    commentsCount: 512,
    favoriteCount: 0,
    watchTimeMinutes: 31_180,
    averageViewDuration: 486,
    averageViewPercent: 54,
    ctr: 8.2,
    publishedAt: daysAgo(17),
    syncedAt: daysAgo(0),
  },
  {
    id: 'mock-yt-4',
    videoId: 'mock-yt-4',
    title: '3 hábitos de creadores con 1M+ suscriptores',
    description: 'Entrevisté a 12 creadores con audiencia masiva — esto es lo que comparten.',
    thumbnailUrl: 'https://i.ytimg.com/vi/3tmd-ClpJxA/hqdefault.jpg',
    url: '#',
    durationSec: 534,
    durationLabel: '8:54',
    viewsCount: 87_600,
    likesCount: 5_430,
    commentsCount: 318,
    favoriteCount: 0,
    watchTimeMinutes: 14_200,
    averageViewDuration: 289,
    averageViewPercent: 54,
    ctr: 7.8,
    publishedAt: daysAgo(28),
    syncedAt: daysAgo(0),
  },
  {
    id: 'mock-yt-5',
    videoId: 'mock-yt-5',
    title: 'Por qué tu algoritmo NO es aleatorio (y qué hacer)',
    description: 'Lo que Meta / YouTube priorizan al ranquear contenido en 2026.',
    thumbnailUrl: 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg',
    url: '#',
    durationSec: 716,
    durationLabel: '11:56',
    viewsCount: 56_400,
    likesCount: 3_890,
    commentsCount: 241,
    favoriteCount: 0,
    watchTimeMinutes: 11_030,
    averageViewDuration: 412,
    averageViewPercent: 57,
    ctr: 9.9,
    publishedAt: daysAgo(42),
    syncedAt: daysAgo(0),
  },
]

export const youtubeMockDemographics = {
  ageGroups: [
    { range: '13-17', percent: 4 },
    { range: '18-24', percent: 28 },
    { range: '25-34', percent: 39 },
    { range: '35-44', percent: 18 },
    { range: '45-54', percent: 8 },
    { range: '55+', percent: 3 },
  ],
  gender: [
    { label: 'Mujeres', percent: 47 },
    { label: 'Hombres', percent: 52 },
    { label: 'Otro', percent: 1 },
  ],
  topCountries: [
    { country: 'México', percent: 34 },
    { country: 'Colombia', percent: 16 },
    { country: 'España', percent: 14 },
    { country: 'Argentina', percent: 11 },
    { country: 'Chile', percent: 7 },
    { country: 'Perú', percent: 5 },
    { country: 'Estados Unidos', percent: 5 },
    { country: 'Otros', percent: 8 },
  ],
}
