import { Skeleton } from "@/components/ui/skeleton";

export const CategoriesSkeleton = () => {
  return (
    <div className="w-full overflow-x-auto space-x-2 flex p-1">
      {/* "Newest" button skeleton */}
      <Skeleton className="h-10 w-20 md:w-24 rounded-md flex-shrink-0" />
      
      {/* Category button skeletons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-10 w-16 md:w-24 rounded-md flex-shrink-0" 
        />
      ))}
    </div>
  );
}; 