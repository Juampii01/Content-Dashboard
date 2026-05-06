import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <Skeleton className="mx-auto h-8 w-56" />
        <Skeleton className="mx-auto h-4 w-72" />
        <Skeleton className="mx-auto h-4 w-64" />
        <Skeleton className="mx-auto h-9 w-32 rounded-lg" />
      </div>
    </div>
  )
}
