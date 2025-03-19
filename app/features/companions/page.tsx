import { Suspense } from 'react';
import CompanionList, { CompanionListSkeleton } from './components/CompanionList';
import CategoryList from './components/CategoryList';
import SearchBar from './components/SearchBar';
import { Metadata } from 'next';

interface CompanionsPageProps {
  searchParams: {
    category?: string;
    search?: string;
  };
}

export const metadata: Metadata = {
  title: 'Companions | AgentConsult',
  description: 'Browse and interact with your AI companions',
};

export default async function CompanionsPage({ searchParams }: CompanionsPageProps) {
  const { category, search } = searchParams;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">AI Companions</h1>
      
      <div className="mb-6">
        <SearchBar defaultValue={search || ''} />
      </div>
      
      {/* Categories with efficient parallel data fetching */}
      <Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded-full mb-4" />}>
        <CategoryList activeCategoryId={category} />
      </Suspense>
      
      {/* Companion list with dedicated loading state */}
      <Suspense fallback={<CompanionListSkeleton />}>
        <CompanionList 
          categoryId={category} 
          searchQuery={search}
          limit={12}
        />
      </Suspense>
    </div>
  );
} 