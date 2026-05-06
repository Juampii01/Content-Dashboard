// Skeleton for /ai — mimics EternityAIContent layout: conversation sidebar
// on the right + chat area on the left. Prevents blank screen on first nav
// while /api/ai/conversations is fetched.
export default function Loading() {
  return (
    <div className="flex h-screen w-full">
      {/* Chat area skeleton */}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-16 w-3/4 animate-pulse rounded-2xl bg-muted" />
          <div className="ml-auto h-20 w-2/3 animate-pulse rounded-2xl bg-muted" />
          <div className="h-14 w-4/5 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="mt-4 h-14 w-full animate-pulse rounded-xl bg-muted" />
      </div>
      {/* Conversation list skeleton */}
      <aside className="hidden w-72 flex-shrink-0 flex-col gap-2 border-l border-[var(--border)] p-3 md:flex">
        <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </aside>
    </div>
  )
}
