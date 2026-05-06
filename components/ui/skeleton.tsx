import { cn } from "@/lib/utils"

/**
 * Skeleton — low-level loading placeholder.
 *
 * Matches the shadcn API shape (div with `animate-pulse` + muted background) so
 * existing code that imports `@/components/ui/skeleton` keeps working. Uses the
 * `bg-muted/40` token from the theme — no hardcoded hex. Brand rule: colors
 * flow through CSS vars (`var(--muted)` surfaces via the `bg-muted` utility in
 * Tailwind v4).
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/40", className)}
      {...props}
    />
  )
}

export { Skeleton }
