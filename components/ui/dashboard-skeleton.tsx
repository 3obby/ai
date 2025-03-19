import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search input skeleton */}
      <div className="w-full max-w-md">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      
      {/* Categories skeleton */}
      <div className="flex items-center gap-x-2 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-8 w-24 rounded-full flex-shrink-0" 
          />
        ))}
      </div>
      
      {/* Companions grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-10">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-1 px-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="px-2 pb-2">
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 