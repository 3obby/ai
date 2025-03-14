'use client';

import useSWR from 'swr';
import axios from 'axios';
import { useState } from 'react';
import { CACHE_TIMES, createCacheKey, revalidationUtils } from '@/app/shared/utils/swr-config';

// Default fetcher function that uses axios
const defaultFetcher = async (url: string) => {
  const response = await axios.get(url);
  return response.data;
};

interface UseDataOptions {
  // Cache time in milliseconds
  cacheDuration?: number;
  // Whether to revalidate on mount
  revalidateOnMount?: boolean;
  // Custom fetch function
  fetcher?: (url: string) => Promise<any>;
  // Initial data
  initialData?: any;
  // Whether to skip the request
  skip?: boolean;
}

/**
 * Custom hook for data fetching with caching and revalidation strategies
 * 
 * @param resource Name of the resource being fetched
 * @param id Optional ID of the specific resource
 * @param endpoint API endpoint to fetch from
 * @param options Configuration options
 * @returns SWR response with data, error, isLoading, and mutate
 */
export function useData(
  resource: string,
  id: string | number | null = null,
  endpoint: string,
  options: UseDataOptions = {}
) {
  const {
    cacheDuration = CACHE_TIMES.MEDIUM,
    revalidateOnMount = true,
    fetcher = defaultFetcher,
    initialData,
    skip = false
  } = options;

  // Generate a cache key for this resource
  const cacheKey = createCacheKey(resource, id);
  
  // Track loading state separately for initial load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Use SWR with time-to-live middleware
  const ttlMiddleware = revalidationUtils.withTTL(cacheDuration);
  
  // Skip fetching if skip is true
  const shouldFetch = !skip ? endpoint : null;
  
  const swr = useSWR(
    shouldFetch ? cacheKey : null,
    shouldFetch ? () => fetcher(endpoint) : null,
    {
      revalidateOnMount,
      dedupingInterval: Math.min(cacheDuration, 60000), // Dedupe requests within the same minute or less
      fallbackData: initialData,
      use: [ttlMiddleware],
      onSuccess: () => {
        if (!initialLoadComplete) {
          setInitialLoadComplete(true);
        }
      }
    }
  );

  // Custom isLoading state that accounts for initial load
  const isLoading = !initialLoadComplete && swr.isLoading;

  // Utility function to invalidate related resources
  const invalidateRelated = (relatedResources: string[]) => {
    const keys = relatedResources.map(r => 
      id ? createCacheKey(r, id) : createCacheKey(r)
    );
    revalidationUtils.invalidateMany(keys, swr.mutate);
  };

  return {
    ...swr,
    isLoading,
    invalidateRelated
  };
} 