'use client'

import { Trash2 } from 'lucide-react'
import { PlatformBadge } from '@/components/ui/PlatformBadge'
import { formatDate } from '@/lib/utils/formatDate'
import { ResultPanel } from './ResultPanel'
import type { HistoryItem } from './types'

const dateOpts: Intl.DateTimeFormatOptions = {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}

interface HistoryRowProps {
  item: HistoryItem
  expanded: boolean
  onToggle: () => void
  onRequestDelete: () => void
}

/**
 * One row in the transcript history list.
 *
 * Layout: a flex container holding two SIBLING buttons:
 *   1. the toggle button (badge + title + meta)
 *   2. the delete button (trash icon)
 *
 * Previously the trash was *nested* inside the toggle — invalid HTML and
 * unpredictable behavior across screen readers. The flex-with-siblings
 * structure keeps the same visual layout without nesting.
 */
export function HistoryRow({ item, expanded, onToggle, onRequestDelete }: HistoryRowProps) {
  const detailId = `transcript-detail-${item.id}`
  return (
    <div
      className="rounded-xl card-lift overflow-hidden"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="flex-1 text-left p-4 flex items-start gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-l-xl"
        >
          <PlatformBadge platform={item.platform} />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold leading-tight truncate"
              style={{ color: 'var(--foreground)' }}
            >
              {item.title ?? item.url}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {[item.creator, item.duration, formatDate(item.createdAt, dateOpts)]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onRequestDelete}
          className="flex-shrink-0 px-4 flex items-center justify-center hover:opacity-70 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-r-xl"
          style={{ color: 'var(--muted-foreground)' }}
          aria-label={`Eliminar transcript de ${item.title ?? item.url}`}
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>

      {expanded && (
        <div id={detailId} className="px-4 pb-4">
          <ResultPanel
            result={{
              id: item.id,
              url: item.url,
              platform: item.platform,
              title: item.title,
              creator: item.creator,
              duration: item.duration,
              thumbnail: item.thumbnail,
              transcript: item.transcript ?? '',
              summary: item.summary ?? '',
            }}
          />
        </div>
      )}
    </div>
  )
}
