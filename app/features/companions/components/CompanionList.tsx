import { getCompanions } from '@/app/features/companions/utils/companion-service';
import CompanionCardServer from './CompanionCardServer';
import { Skeleton } from '@/app/shared/components/ui/skeleton';
import type { Companion } from '@/app/shared/types/companion';

interface CompanionListProps {
  categoryId?: string;
  searchQuery?: string;
  limit?: number;
}

export default async function CompanionList({ 
  categoryId, 
  searchQuery,
  limit 
}: CompanionListProps) {
  // Fetch companions directly in the Server Component
  const companions = await getCompanions({ categoryId, searchQuery, limit });
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {companions.map((companion: Companion) => (
        <CompanionCardServer
          key={companion.id}
          id={companion.id}
          name={companion.name}
          description={companion.description || ''}
          avatar={companion.src || '/companions/default-avatar.png'}
          href={`/companions/${companion.id}`}
        />
      ))}
    </div>
  );
}

// Loading component for Suspense fallback
export function CompanionListSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array(8).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col rounded-xl overflow-hidden border border-dark-700 bg-dark-900">
          <Skeleton className="h-32 w-full" />
          <div className="pt-12 p-4 flex flex-col items-center">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-5/6 mb-1" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
} 