'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar } from 'lucide-react'
import { ContentPiece } from '@/lib/types'
import { CategoryChip, FORMAT_ICONS, PLATFORM_ICONS } from './CategoryChip'
import { formatDate } from '@/lib/utils/formatDate'
import { stripHtml } from '@/lib/utils/stripHtml'

interface PipelineCardProps {
  item: ContentPiece
  onClick: (item: ContentPiece) => void
}

export function PipelineCard({ item, onClick }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const dndTransform = CSS.Transform.toString(transform)

  // During drag: full drag overrides. During drop-return (transition active): dnd-kit controls.
  // Normal state: .interactive-card CSS handles hover (transform + shadow + border).
  // Normal state has NO inline backgroundColor → lets .interactive-card CSS :hover take effect.
  // Drag/transition states set it explicitly to prevent CSS background-color from animating
  // during dnd-kit's drop animation.
  const style: React.CSSProperties = isDragging ? {
    backgroundColor: 'var(--card)',
    transform: `${dndTransform ?? ''} scale(1.04) rotate(1.5deg)`.trim(),
    boxShadow: 'var(--shadow-drag)',
    borderColor: 'var(--accent)',
    zIndex: 50,
    opacity: 0.95,
  } : transition ? {
    backgroundColor: 'var(--card)',
    transform: dndTransform || undefined,
    transition,
  } : {}

  const dateFormatted = item.date
    ? formatDate(item.date + 'T00:00:00')
    : null

  // Whole card is the drag source. dnd-kit's PointerSensor with `activationConstraint:
  // { distance: 8 }` distinguishes click (opens modal) from drag (>= 8px movement).
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing group interactive-card"
      onClick={() => onClick(item)}
    >
      {/* Category chip */}
      {item.category && (
        <div className="mb-1.5">
          <CategoryChip category={item.category} small />
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
        {item.title}
      </p>

      {/* Description */}
      {item.description && (
        <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          {stripHtml(item.description)}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center gap-2 mt-2">
        {item.format && <span className="text-base leading-none" title={item.format}>{FORMAT_ICONS[item.format]}</span>}
        {item.platform && <span className="text-base leading-none" title={item.platform}>{PLATFORM_ICONS[item.platform]}</span>}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          {item.type === 'reel' ? 'Reel' : 'Historia'}
        </span>
        {dateFormatted && (
          <div className="flex items-center gap-1 ml-auto">
            <Calendar size={10} style={{ color: 'var(--muted-foreground)' }} />
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{dateFormatted}</span>
          </div>
        )}
      </div>
    </div>
  )
}
