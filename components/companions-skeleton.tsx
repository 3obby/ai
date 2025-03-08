import { Skeleton } from "@/components/ui/skeleton";

export const CompanionsSkeleton = () => {
  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div 
            key={i} 
            className="bg-[#DEDEDE] dark:bg-zinc-800 rounded-2xl border-2 border-zinc-300/50 dark:border-zinc-700 shadow-lg overflow-hidden flex flex-col h-full"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center text-center p-4 space-y-3">
                <Skeleton className="w-32 h-32 rounded-2xl" />
                <Skeleton className="h-6 w-24 mt-3" />
              </div>
              <div className="flex items-center px-4 py-3 border-t border-zinc-300/50 dark:border-zinc-700 bg-[#BDBDBD] dark:bg-zinc-900/50 mt-auto">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination skeleton */}
      <div className="flex justify-center gap-4 pt-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex items-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}; 