import { ContentCategory } from '@/lib/types'

export const CATEGORY_COLORS: Record<ContentCategory, string> = {
  // Pipeline (legacy)
  motivacional: 'var(--accent)',
  educacional:  '#B08A4A',
  humor:        '#C49A6C',
  personal:     '#7A6060',
  otro:         '#5C4B50',
  // Reels
  viral:        '#E05A2B',
  nicho:        '#5B8DEF',
  // Historias
  lifestyle:    '#B08A4A',
  dolor:        '#C04B6B',
  deseo:        '#7C5CBF',
}

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
  // Pipeline (legacy)
  motivacional: 'Motivacional',
  educacional:  'Educacional',
  humor:        'Humor',
  personal:     'Personal',
  otro:         'Otro',
  // Reels
  viral:        'Viral',
  nicho:        'Nicho',
  // Historias
  lifestyle:    'Lifestyle',
  dolor:        'Dolor',
  deseo:        'Deseo',
}

export const FORMAT_ICONS: Record<string, string> = {
  reel:         '🎬',
  carrusel:     '🖼️',
  historia:     '⏱️',
  foto:         '📷',
  'video-largo':'📹',
  meme:         '😂',
}

export const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok:    '🎵',
  youtube:   '▶️',
  threads:   '🧵',
}

interface CategoryChipProps {
  category: ContentCategory
  small?: boolean
}

export function CategoryChip({ category, small = false }: CategoryChipProps) {
  const color = CATEGORY_COLORS[category]
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  )
}
