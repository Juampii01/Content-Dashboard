import { TaskLabel } from '@/lib/types'

interface LabelBadgeProps {
  label: TaskLabel
  small?: boolean
}

export function LabelBadge({ label, small = false }: LabelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ backgroundColor: label.color + '22', color: label.color, border: `1px solid ${label.color}44` }}
    >
      {label.text}
    </span>
  )
}

export const LABEL_PRESETS: TaskLabel[] = [
  { text: 'Reel', color: 'var(--accent)' },
  { text: 'Historia', color: '#B08A4A' },
  { text: 'Urgente', color: '#E05252' },
  { text: 'Ideas', color: '#5B8DEF' },
  { text: 'Edición', color: '#8B5CF6' },
  { text: 'Guión', color: '#10B981' },
  { text: 'Grabación', color: '#F59E0B' },
  { text: 'Revisión', color: '#6B7280' },
]
