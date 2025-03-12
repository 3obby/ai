import { useEffect, useState, useCallback } from 'react';
import { broadcastProgress } from '@/components/chat-limit';

interface UseDashboardDataOptions {
  userId?: string; // Make userId optional for anonymous users
  prefetch?: boolean;
}

interface DashboardData {
  companionCount: number;
  messageCount: number;
  userProgress: any; // Replace with proper type when available
  categories: any[];
  queryTimeMs: number;
  isLoading: boolean;
  error: string | null;
  isAnonymous: boolean;
}

// In-memory cache to reduce API calls
const dataCache = new Map<string, {data: any, timestamp: number}>();
const CACHE_TTL = 30000; // 30 seconds

export function useDashboardData({ userId, prefetch = false }: UseDashboardDataOptions): DashboardData & { 
  refreshData: () => Promise<void> 
} {
  const [data, setData] = useState<Omit<DashboardData, 'isLoading' | 'error'>>({
    companionCount: 0,
    messageCount: 0,
    userProgress: null,
    categories: [],
    queryTimeMs: 0,
    isAnonymous: !userId,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // For anonymous users, use a special cache key
    const cacheKey = userId ? `dashboard-${userId}` : 'dashboard-anonymous';
    const cachedData = dataCache.get(cacheKey);
    const now = Date.now();

    // Use cached data if available and not expired
    if (!forceRefresh && cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
      setData(cachedData.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the new consolidated API endpoint for better performance
      // If userId is undefined, the API will handle anonymous users
      const start = performance.now();
      const url = userId ? `/api/dashboard-data?userId=${userId}` : '/api/dashboard-data';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const clientFetchTime = performance.now() - start;
      
      console.log(`Dashboard data loaded in ${Math.round(clientFetchTime)}ms (server: ${result.performance.queryTimeMs}ms)`);

      const newData = {
        companionCount: result.counts.companions,
        messageCount: result.counts.messages,
        userProgress: result.userProgress,
        categories: result.categories,
        queryTimeMs: result.performance.queryTimeMs + Math.round(clientFetchTime),
        isAnonymous: result.isAnonymous || !userId,
      };

      // Update cache
      dataCache.set(cacheKey, {
        data: newData,
        timestamp: now
      });

      // Broadcast progress updates to other components
      if (result.userProgress) {
        broadcastProgress(result.userProgress);
      }

      setData(newData);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
      setIsLoading(false);
    }
  }, [userId]);

  // Function to manually refresh data
  const refreshData = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    // Fetch on mount or when userId changes
    fetchData();

    // Set up interval for periodic refresh in background
    const intervalId = setInterval(() => {
      fetchData();
    }, CACHE_TTL / 2); // Refresh halfway through cache lifetime

    return () => {
      clearInterval(intervalId);
    };
  }, [userId, fetchData]);

  // Prefetch on initial load if enabled
  useEffect(() => {
    if (prefetch && typeof window !== 'undefined') {
      // Preload additional resources that might be needed
      const prefetchResources = async () => {
        // Prefetch avatar images, template data, etc.
        try {
          await fetch('/api/templates');
          // Prefetch companion images
          document.querySelectorAll('img[data-src]').forEach(img => {
            const src = img.getAttribute('data-src');
            if (src) {
              const prefetchImg = new Image();
              prefetchImg.src = src;
            }
          });
        } catch (err) {
          console.error('Error prefetching resources:', err);
        }
      };
      
      prefetchResources();
    }
  }, [prefetch]);

  return {
    ...data,
    isLoading,
    error,
    refreshData
  };
} 