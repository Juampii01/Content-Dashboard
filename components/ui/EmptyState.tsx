/**
 * EmptyState — used when a list/grid has no data yet.
 *
 * Visual rhythm: large illustrated icon → title → body → CTA.
 * Built on `surface` so it matches every other card on the page.
 */
import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

interface EmptyStateProps {
  icon?: ComponentType<LucideProps>
  title: ReactNode
  description?: ReactNode
  /** Primary call-to-action — typically a button or link. */
  action?: ReactNode
  /** Secondary CTA below the primary one. */
  secondaryAction?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        'surface flex flex-col items-center justify-center text-center px-6 py-12',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {Icon && (
        <span
          className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4 animate-float"
          style={{
            background: 'var(--gradient-accent-soft)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border))',
          }}
          aria-hidden
        >
          <Icon size={24} />
        </span>
      )}
      <h3
        className="text-section-title mb-1.5"
        style={{ color: 'var(--foreground)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-sm max-w-md leading-relaxed"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
