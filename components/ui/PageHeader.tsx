/**
 * PageHeader — consistent header block for every top-level route.
 *
 * Usage:
 *   <PageHeader
 *     eyebrow="Contenido"
 *     title="Transcript"
 *     description="Pegá un link y obtené transcripción + resumen IA."
 *     icon={FileText}
 *     actions={<Button>Crear</Button>}
 *   />
 *
 * Replaces the ad-hoc `<h1>` + `<p>` + `<div className="flex">` pattern that
 * was repeated across pages with subtly different paddings, font sizes, and
 * gap conventions. Goal: a single source of truth so v2's polish lands on
 * every page automatically.
 */
import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

interface PageHeaderProps {
  /** Small uppercase label rendered above the title. */
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Optional Lucide icon (or any SVG component) shown next to the title. */
  icon?: ComponentType<LucideProps>
  /** Right-aligned action buttons / controls. */
  actions?: ReactNode
  /** Render below the description, before any page content. */
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={['mb-8', className].filter(Boolean).join(' ')}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {eyebrow && <p className="text-eyebrow mb-2">{eyebrow}</p>}
          <div className="flex items-center gap-3">
            {Icon && (
              <span
                className="inline-flex items-center justify-center h-10 w-10 rounded-xl shrink-0"
                style={{
                  background:
                    'color-mix(in srgb, var(--accent) 12%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border))',
                }}
                aria-hidden
              >
                <Icon size={18} />
              </span>
            )}
            <h1
              className="text-display"
              style={{ color: 'var(--foreground)' }}
            >
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-lead mt-2 max-w-prose">{description}</p>
          )}
          {meta && <div className="mt-3">{meta}</div>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </header>
  )
}
