import { Skeleton } from "@/components/ui/skeleton"

interface PageSkeletonProps {
  type?: "default" | "grid" | "list"
  items?: number
}

export function PageSkeleton({ type = "default", items = 3 }: PageSkeletonProps) {
  switch (type) {
    case "grid":
      return (
        <div className="p-4">
          <Skeleton className="h-8 w-1/4 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: items }).map((_, i) => (
              <div key={i} className="bg-secondary rounded-xl p-3 mb-4">
                <Skeleton className="h-32 w-full mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex space-x-2 mt-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    
    case "list":
      return (
        <div className="p-4">
          <Skeleton className="h-8 w-1/4 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: items }).map((_, i) => (
              <div key={i} className="flex items-center p-3 bg-secondary rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full mr-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      )
      
    default:
      return (
        <div className="p-4 space-y-6">
          <Skeleton className="h-8 w-1/3 mb-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="pt-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      )
  }
} 