/**
 * Section — typed wrapper for content blocks under the page header.
 *
 * Usage:
 *   <Section eyebrow="Resumen" title="Performance" description="Últimos 30 días">
 *     ...content...
 *   </Section>
 *
 * Adds consistent vertical rhythm + a small header band so groups of cards
 * read as one unit instead of floating loose.
 */
import type { ReactNode } from 'react'

interface SectionProps {
  eyebrow?: ReactNode
  title?: ReactNode
  description?: ReactNode
  /** Right-aligned controls (e.g. period filter). */
  actions?: ReactNode
  children: ReactNode
  /** Use `flush` to remove the bottom margin (e.g. last section in a page). */
  flush?: boolean
  className?: string
}

export function Section({
  eyebrow,
  title,
  description,
  actions,
  children,
  flush,
  className,
}: SectionProps) {
  return (
    <section
      className={[
        flush ? '' : 'mb-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(eyebrow || title || description || actions) && (
        <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
          <div>
            {eyebrow && <p className="text-eyebrow mb-1">{eyebrow}</p>}
            {title && (
              <h2
                className="text-section-title"
                style={{ color: 'var(--foreground)' }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
