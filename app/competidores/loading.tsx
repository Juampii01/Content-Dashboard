import { SkeletonRows } from '@/components/ui/LoadingSkeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-shell flex-1 min-h-screen">
      <Skeleton className="mb-6" style={{ height: 28, width: 180 }} />
      <div className="max-w-xl">
        <SkeletonRows count={4} />
      </div>
    </div>
  )
}
