import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export const SearchInputSkeleton = () => {
  return (
    <div className="relative">
      <Search className="absolute h-4 w-4 top-3 left-4 text-muted-foreground opacity-50" />
      <Skeleton className="h-10 w-full pl-10 rounded-md" />
    </div>
  );
}; 