// ─── TikTok Mock Data ─────────────────────────────────────────────────────────

import type { Period } from '@/lib/types'

export interface TikTokKPIs {
  followers: number
  followersChange: number
  totalViews: number
  totalViewsChange: number
  likes: number
  likesChange: number
  comments: number
  commentsChange: number
  engagementRate: number
  engagementChange: number
}

export interface TikTokChartPoint {
  date: string
  followers: number
  views: number
}

export interface TikTokVideo {
  id: string
  title: string
  publishedAt: string
  duration: string
  views: number
  likes: number
  shares: number
  comments: number
  engagementRate: number
  coverUrl: string
}

export interface TikTokHashtag {
  tag: string
  views: number
  growth: number
}

export interface TikTokBestHour {
  hour: string
  engagementScore: number
}

export interface TikTokDemographics {
  ageData: { age: string; pct: number }[]
  genderData: { name: string; value: number }[]
  countriesData: { country: string; pct: number }[]
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export const TIKTOK_KPIS: TikTokKPIs = {
  followers: 128400,
  followersChange: 8.3,
  totalViews: 4_820_000,
  totalViewsChange: 22.1,
  likes: 312_500,
  likesChange: 15.4,
  comments: 28_700,
  commentsChange: 11.2,
  engagementRate: 7.4,
  engagementChange: 1.8,
}

// ─── Growth chart (90-day base dataset) ──────────────────────────────────────

function buildGrowthData(count = 30): TikTokChartPoint[] {
  const baseFollowers = 100_000
  const baseViews = 3_200_000
  const today = new Date('2026-04-20')
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (count - 1 - i))
    const label = d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
    return {
      date: label,
      followers: Math.round(baseFollowers + (i / (count - 1)) * 28_400 + Math.sin(i * 0.8) * 800),
      views: Math.round(baseViews + (i / (count - 1)) * 1_620_000 + Math.cos(i * 0.6) * 40_000),
    }
  })
}

export const TIKTOK_GROWTH_DATA_90 = buildGrowthData(90)

// Keep 30-day slice as existing constant for backwards compat
export const TIKTOK_GROWTH_DATA = TIKTOK_GROWTH_DATA_90.slice(-30)

// ─── Videos ───────────────────────────────────────────────────────────────────

export const TIKTOK_VIDEOS: TikTokVideo[] = [
  {
    id: 'tt-001',
    title: 'Cómo gané $10k en 30 días con TikTok',
    publishedAt: '2026-04-15',
    duration: '0:58',
    views: 1_230_000,
    likes: 87_400,
    shares: 23_100,
    comments: 6_800,
    engagementRate: 9.5,
    coverUrl: '',
  },
  {
    id: 'tt-002',
    title: 'Estrategia de contenido que nadie te dice',
    publishedAt: '2026-04-10',
    duration: '1:12',
    views: 845_000,
    likes: 54_300,
    shares: 18_200,
    comments: 4_100,
    engagementRate: 9.1,
    coverUrl: '',
  },
  {
    id: 'tt-003',
    title: 'Errores fatales al vender online (evítalos)',
    publishedAt: '2026-04-07',
    duration: '0:47',
    views: 612_000,
    likes: 38_700,
    shares: 12_400,
    comments: 2_900,
    engagementRate: 8.8,
    coverUrl: '',
  },
  {
    id: 'tt-004',
    title: 'Duplica tu engagement con este truco',
    publishedAt: '2026-04-03',
    duration: '1:05',
    views: 389_000,
    likes: 22_100,
    shares: 8_700,
    comments: 1_840,
    engagementRate: 8.4,
    coverUrl: '',
  },
  {
    id: 'tt-005',
    title: 'Rutina diaria de creador de contenido',
    publishedAt: '2026-03-29',
    duration: '2:14',
    views: 278_000,
    likes: 15_600,
    shares: 5_200,
    comments: 1_350,
    engagementRate: 7.9,
    coverUrl: '',
  },
  {
    id: 'tt-006',
    title: 'Herramientas de IA para creadores 2026',
    publishedAt: '2026-03-24',
    duration: '1:38',
    views: 195_000,
    likes: 10_400,
    shares: 3_900,
    comments: 980,
    engagementRate: 7.8,
    coverUrl: '',
  },
  {
    id: 'tt-007',
    title: 'El algoritmo de TikTok en 60 segundos',
    publishedAt: '2026-03-19',
    duration: '0:59',
    views: 142_000,
    likes: 7_800,
    shares: 2_600,
    comments: 670,
    engagementRate: 7.8,
    coverUrl: '',
  },
  {
    id: 'tt-008',
    title: 'Monetización para cuentas pequeñas',
    publishedAt: '2026-03-14',
    duration: '1:22',
    views: 98_000,
    likes: 5_100,
    shares: 1_800,
    comments: 440,
    engagementRate: 7.5,
    coverUrl: '',
  },
  {
    id: 'tt-009',
    title: 'Cómo hacer un hook irresistible',
    publishedAt: '2026-03-09',
    duration: '0:52',
    views: 71_000,
    likes: 3_700,
    shares: 1_200,
    comments: 310,
    engagementRate: 7.3,
    coverUrl: '',
  },
]

// ─── Tendencias ───────────────────────────────────────────────────────────────

export const TRENDING_HASHTAGS: TikTokHashtag[] = [
  { tag: '#marketing2026', views: 48_200_000, growth: 34 },
  { tag: '#creadordecontenido', views: 31_500_000, growth: 28 },
  { tag: '#emprendimiento', views: 27_100_000, growth: 19 },
  { tag: '#ia', views: 22_800_000, growth: 51 },
  { tag: '#negociodigital', views: 18_600_000, growth: 16 },
  { tag: '#tiktoktips', views: 14_300_000, growth: 12 },
  { tag: '#viralcontent', views: 11_200_000, growth: 9 },
  { tag: '#ventas', views: 9_700_000, growth: 22 },
]

export const BEST_HOURS: TikTokBestHour[] = [
  { hour: '6am', engagementScore: 42 },
  { hour: '8am', engagementScore: 58 },
  { hour: '10am', engagementScore: 67 },
  { hour: '12pm', engagementScore: 81 },
  { hour: '2pm', engagementScore: 74 },
  { hour: '4pm', engagementScore: 88 },
  { hour: '6pm', engagementScore: 95 },
  { hour: '8pm', engagementScore: 100 },
  { hour: '10pm', engagementScore: 87 },
  { hour: '12am', engagementScore: 51 },
]

export const OPTIMAL_DURATIONS = [
  { range: '15–30s', avgViews: 1_120_000, label: 'Máxima retención' },
  { range: '30–60s', avgViews: 980_000, label: 'Balance ideal' },
  { range: '60–90s', avgViews: 730_000, label: 'Educativo corto' },
  { range: '90–180s', avgViews: 420_000, label: 'Storytelling' },
  { range: '3–10min', avgViews: 210_000, label: 'Formato largo' },
]

// ─── Audiencia (demografía) ───────────────────────────────────────────────────

export const TIKTOK_DEMOGRAPHICS: TikTokDemographics = {
  ageData: [
    { age: '13-17', pct: 8 },
    { age: '18-24', pct: 38 },
    { age: '25-34', pct: 33 },
    { age: '35-44', pct: 14 },
    { age: '45-54', pct: 5 },
    { age: '55+', pct: 2 },
  ],
  genderData: [
    { name: 'Mujeres', value: 56 },
    { name: 'Hombres', value: 42 },
    { name: 'Otro', value: 2 },
  ],
  countriesData: [
    { country: 'México', pct: 28 },
    { country: 'Argentina', pct: 22 },
    { country: 'Colombia', pct: 14 },
    { country: 'España', pct: 11 },
    { country: 'Perú', pct: 9 },
    { country: 'Chile', pct: 7 },
    { country: 'Otros', pct: 9 },
  ],
}

// ─── Period-aware getters ──────────────────────────────────────────────────────

export function getTikTokGrowthData(period: Period): TikTokChartPoint[] {
  return TIKTOK_GROWTH_DATA_90.slice(-period)
}

export function getTikTokVideos(period: Period): TikTokVideo[] {
  const cutoff = new Date('2026-04-20')
  cutoff.setDate(cutoff.getDate() - period)
  return TIKTOK_VIDEOS.filter(v => new Date(v.publishedAt) >= cutoff)
}

export function getTikTokKPIs(period: Period): TikTokKPIs {
  const ratio = period / 30
  return {
    followers: Math.round(TIKTOK_KPIS.followers * Math.min(ratio, 1.0)),
    followersChange: TIKTOK_KPIS.followersChange,
    totalViews: Math.round(TIKTOK_KPIS.totalViews * ratio),
    totalViewsChange: TIKTOK_KPIS.totalViewsChange,
    likes: Math.round(TIKTOK_KPIS.likes * ratio),
    likesChange: TIKTOK_KPIS.likesChange,
    comments: Math.round(TIKTOK_KPIS.comments * ratio),
    commentsChange: TIKTOK_KPIS.commentsChange,
    engagementRate: TIKTOK_KPIS.engagementRate,
    engagementChange: TIKTOK_KPIS.engagementChange,
  }
}
