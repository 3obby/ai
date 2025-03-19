'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/app/shared/components/ui/input';
import { Button } from '@/app/shared/components/ui/button';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  defaultValue?: string;
}

export default function SearchBar({ defaultValue = '' }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  
  useEffect(() => {
    // Update search state if URL parameter changes
    const query = searchParams?.get('search') || '';
    if (query !== searchQuery) {
      setSearchQuery(query);
    }
  }, [searchParams, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct new URL with updated search parameter
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    
    // Use transition to avoid blocking UI during navigation
    startTransition(() => {
      router.push(`/companions?${params.toString()}`);
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    
    // Remove search parameter from URL
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('search');
    
    startTransition(() => {
      router.push(`/companions?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search companions..."
          className="pl-10 pr-10"
          disabled={isPending}
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button 
        type="submit" 
        className="sr-only"
        disabled={isPending}
      >
        Search
      </Button>
    </form>
  );
} 