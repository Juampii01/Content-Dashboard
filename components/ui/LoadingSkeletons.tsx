/**
 * Composite skeleton helpers built on the base `Skeleton` primitive.
 *
 * Use these for common loading patterns so views don't have to repeat the
 * `animate-pulse` rectangle pattern by hand. Each helper outputs surfaces
 * styled to match the v2 design system (`surface`, theme-aware shimmer).
 */
import { Skeleton } from './skeleton'

/**
 * SkeletonCardGrid — N card-shaped placeholders in a responsive grid.
 * Drop-in replacement for the loading state of any "list of cards" layout.
 */
export function SkeletonCardGrid({
  count = 6,
  cardHeight = 120,
  columns = 'sm:grid-cols-2 lg:grid-cols-3',
}: {
  count?: number
  cardHeight?: number
  columns?: string
}) {
  return (
    <div className={`grid grid-cols-1 ${columns} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="rounded-2xl"
          style={{ height: cardHeight, animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonText — N lines of text placeholders, last shorter for realism.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="rounded-sm"
          style={{
            height: 12,
            width: i === lines - 1 ? '60%' : '100%',
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonRows — list rows: avatar + 2 lines, repeated. Wrapped in a `surface`
 * so each row reads as a card.
 */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 surface"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Skeleton
            className="rounded-full shrink-0"
            style={{ width: 40, height: 40 }}
          />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="rounded-sm" style={{ width: '60%', height: 12 }} />
            <Skeleton className="rounded-sm" style={{ width: '40%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
