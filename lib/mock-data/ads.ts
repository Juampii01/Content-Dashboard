// ─── Ads Mock Data (Meta + TikTok) ───────────────────────────────────────────

export type AdsPlatform = 'meta' | 'tiktok'
export type CampaignStatus = 'activa' | 'pausada' | 'terminada'

export interface AdsKPIs {
  totalSpend: number
  totalSpendChange: number
  reach: number
  reachChange: number
  impressions: number
  impressionsChange: number
  ctr: number
  ctrChange: number
  cpc: number
  cpcChange: number
  roas: number
  roasChange: number
}

export interface AdsChartPoint {
  platform: string
  spend: number
  reach: number
  roas: number
}

export interface Campaign {
  id: string
  platform: AdsPlatform
  name: string
  status: CampaignStatus
  budget: number
  spent: number
  reach: number
  impressions: number
  ctr: number
  cpc: number
  roas: number
  startDate: string
  endDate?: string
}

export interface AdCreative {
  id: string
  platform: AdsPlatform
  name: string
  type: 'imagen' | 'video' | 'carrusel'
  impressions: number
  ctr: number
  cpc: number
  spend: number
  roas: number
  status: CampaignStatus
}

// ─── KPIs Totales ─────────────────────────────────────────────────────────────

export const ADS_KPIS: AdsKPIs = {
  totalSpend: 14_820,
  totalSpendChange: -3.2,
  reach: 2_840_000,
  reachChange: 18.4,
  impressions: 9_120_000,
  impressionsChange: 12.7,
  ctr: 3.8,
  ctrChange: 0.4,
  cpc: 0.52,
  cpcChange: -8.1,
  roas: 4.2,
  roasChange: 0.6,
}

// ─── Spend por plataforma (para gráfico de barras) ────────────────────────────

export const ADS_BY_PLATFORM: AdsChartPoint[] = [
  { platform: 'Meta Ads', spend: 9_480, reach: 1_820_000, roas: 4.6 },
  { platform: 'TikTok Ads', spend: 5_340, reach: 1_020_000, roas: 3.7 },
]

// ─── Campañas Meta ────────────────────────────────────────────────────────────

export const META_CAMPAIGNS: Campaign[] = [
  {
    id: 'meta-001',
    platform: 'meta',
    name: 'Conversiones — Lead Magnet Q2',
    status: 'activa',
    budget: 5_000,
    spent: 3_840,
    reach: 680_000,
    impressions: 2_100_000,
    ctr: 4.2,
    cpc: 0.44,
    roas: 5.1,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
  },
  {
    id: 'meta-002',
    platform: 'meta',
    name: 'Retargeting — Audiencia Caliente',
    status: 'activa',
    budget: 2_000,
    spent: 1_980,
    reach: 142_000,
    impressions: 540_000,
    ctr: 5.8,
    cpc: 0.24,
    roas: 7.3,
    startDate: '2026-04-05',
  },
  {
    id: 'meta-003',
    platform: 'meta',
    name: 'Awareness — Nuevo Curso 2026',
    status: 'activa',
    budget: 1_500,
    spent: 1_210,
    reach: 520_000,
    impressions: 1_840_000,
    ctr: 2.1,
    cpc: 0.71,
    roas: 2.8,
    startDate: '2026-04-10',
    endDate: '2026-04-30',
  },
  {
    id: 'meta-004',
    platform: 'meta',
    name: 'Tráfico — Blog SEO',
    status: 'pausada',
    budget: 800,
    spent: 450,
    reach: 98_000,
    impressions: 320_000,
    ctr: 3.4,
    cpc: 0.55,
    roas: 3.1,
    startDate: '2026-03-20',
    endDate: '2026-04-10',
  },
  {
    id: 'meta-005',
    platform: 'meta',
    name: 'Remarketing — Carrito Abandonado',
    status: 'terminada',
    budget: 600,
    spent: 600,
    reach: 41_000,
    impressions: 188_000,
    ctr: 6.2,
    cpc: 0.18,
    roas: 8.9,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
  },
]

// ─── Campañas TikTok ──────────────────────────────────────────────────────────

export const TIKTOK_CAMPAIGNS: Campaign[] = [
  {
    id: 'tt-ads-001',
    platform: 'tiktok',
    name: 'TopFeed — Lanzamiento Masterclass',
    status: 'activa',
    budget: 3_000,
    spent: 2_410,
    reach: 490_000,
    impressions: 1_820_000,
    ctr: 3.6,
    cpc: 0.58,
    roas: 4.1,
    startDate: '2026-04-08',
    endDate: '2026-04-30',
  },
  {
    id: 'tt-ads-002',
    platform: 'tiktok',
    name: 'Spark Ads — Mejores Orgánicos',
    status: 'activa',
    budget: 1_500,
    spent: 1_380,
    reach: 320_000,
    impressions: 980_000,
    ctr: 5.1,
    cpc: 0.31,
    roas: 5.8,
    startDate: '2026-04-12',
  },
  {
    id: 'tt-ads-003',
    platform: 'tiktok',
    name: 'In-Feed — Prospecting Frío',
    status: 'pausada',
    budget: 1_200,
    spent: 780,
    reach: 180_000,
    impressions: 640_000,
    ctr: 2.4,
    cpc: 0.82,
    roas: 2.3,
    startDate: '2026-04-01',
    endDate: '2026-04-20',
  },
  {
    id: 'tt-ads-004',
    platform: 'tiktok',
    name: 'Hashtag Challenge — #Emprendimiento',
    status: 'terminada',
    budget: 770,
    spent: 770,
    reach: 30_000,
    impressions: 128_000,
    ctr: 4.8,
    cpc: 0.45,
    roas: 3.4,
    startDate: '2026-03-10',
    endDate: '2026-03-31',
  },
]

// ─── Creativos ────────────────────────────────────────────────────────────────

export const AD_CREATIVES: AdCreative[] = [
  {
    id: 'cr-001',
    platform: 'meta',
    name: 'Video — "Método 90 días"',
    type: 'video',
    impressions: 940_000,
    ctr: 5.2,
    cpc: 0.38,
    spend: 2_140,
    roas: 6.4,
    status: 'activa',
  },
  {
    id: 'cr-002',
    platform: 'tiktok',
    name: 'Spark — "Error que cometes"',
    type: 'video',
    impressions: 812_000,
    ctr: 4.8,
    cpc: 0.41,
    spend: 1_820,
    roas: 5.9,
    status: 'activa',
  },
  {
    id: 'cr-003',
    platform: 'meta',
    name: 'Carrusel — "5 Errores de Marketing"',
    type: 'carrusel',
    impressions: 680_000,
    ctr: 4.1,
    cpc: 0.52,
    spend: 1_640,
    roas: 5.1,
    status: 'activa',
  },
  {
    id: 'cr-004',
    platform: 'meta',
    name: 'Imagen — Lead Magnet Guía PDF',
    type: 'imagen',
    impressions: 540_000,
    ctr: 3.7,
    cpc: 0.61,
    spend: 1_320,
    roas: 4.3,
    status: 'activa',
  },
  {
    id: 'cr-005',
    platform: 'tiktok',
    name: 'In-Feed — "Estrategia TikTok 2026"',
    type: 'video',
    impressions: 490_000,
    ctr: 3.3,
    cpc: 0.72,
    spend: 1_180,
    roas: 3.8,
    status: 'pausada',
  },
  {
    id: 'cr-006',
    platform: 'meta',
    name: 'Video — Testimonios Clientes',
    type: 'video',
    impressions: 320_000,
    ctr: 6.1,
    cpc: 0.29,
    spend: 980,
    roas: 7.8,
    status: 'activa',
  },
  {
    id: 'cr-007',
    platform: 'tiktok',
    name: 'TopView — "Lanzamiento Q2"',
    type: 'video',
    impressions: 240_000,
    ctr: 2.9,
    cpc: 0.94,
    spend: 840,
    roas: 3.1,
    status: 'terminada',
  },
  {
    id: 'cr-008',
    platform: 'meta',
    name: 'Carrusel — Comparativa de Planes',
    type: 'carrusel',
    impressions: 182_000,
    ctr: 4.4,
    cpc: 0.48,
    spend: 720,
    roas: 4.9,
    status: 'pausada',
  },
]
