import { cn } from "@/lib/utils"

/**
 * Skeleton — low-level loading placeholder.
 *
 * Uses the global `.animate-shimmer` keyframe (defined in `app/globals.css`)
 * which gives a theme-aware moving highlight instead of the static pulse.
 * Drop-in compatible with the previous shadcn-style API — existing code
 * importing `@/components/ui/skeleton` keeps working without changes.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
