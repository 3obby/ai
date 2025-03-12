import { useEffect, useState, useCallback } from 'react';
import { broadcastProgress } from '@/components/chat-limit';
import { toast } from 'react-hot-toast';

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
  const [retryCount, setRetryCount] = useState(0);

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
      
      // Add timestamp to prevent cache issues
      const timestamp = Date.now();
      const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;
      
      console.log(`Fetching dashboard data from: ${fetchUrl}`);
      
      const response = await fetch(fetchUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.error(`Dashboard data fetch failed: ${response.status} ${response.statusText}`);
        
        // Try fallback approach for anonymous users
        if (!userId) {
          console.log('Trying fallback for anonymous user...');
          const fallbackData = {
            companionCount: 0,
            messageCount: 0,
            userProgress: null,
            categories: [],
            queryTimeMs: 0,
            isAnonymous: true,
          };
          
          setData(fallbackData);
          
          // Still try to fetch companions from the other endpoint
          try {
            console.log('Attempting fallback prefetch...');
            const prefetchResponse = await fetch(`/api/dashboard/prefetch?page=1&_t=${timestamp}`, {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (prefetchResponse.ok) {
              const prefetchData = await prefetchResponse.json();
              console.log('Successfully fetched fallback data:', prefetchData);
              // Update the categories at least
              setData(prev => ({
                ...prev,
                categories: prefetchData.categories || [],
                companionCount: prefetchData.totalCompanions || 0
              }));
            } else {
              console.error('Fallback prefetch failed with status:', prefetchResponse.status);
            }
          } catch (fallbackErr) {
            console.error('Fallback prefetch failed:', fallbackErr);
          } finally {
            setIsLoading(false);
          }
          
          return;
        }
        
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const clientFetchTime = performance.now() - start;
      
      console.log(`Dashboard data loaded in ${Math.round(clientFetchTime)}ms (server: ${result.performance?.queryTimeMs || 0}ms)`);

      const newData = {
        companionCount: result.counts?.companions || 0,
        messageCount: result.counts?.messages || 0,
        userProgress: result.userProgress || null,
        categories: result.categories || [],
        queryTimeMs: (result.performance?.queryTimeMs || 0) + Math.round(clientFetchTime),
        isAnonymous: result.isAnonymous || !userId,
      };

      // Reset retry count on success
      setRetryCount(0);

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
      
      // Show toast for user feedback
      toast.error('Failed to load dashboard data. Retrying...');
      
      // Set minimal fallback data
      setData(prev => ({
        ...prev,
        isAnonymous: !userId,
      }));
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      // Auto-retry up to 3 times with increasing backoff
      if (retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Will retry in ${backoffTime}ms (attempt ${retryCount + 1}/3)`);
        
        setTimeout(() => {
          fetchData(true);
        }, backoffTime);
      }
    }
  }, [userId, retryCount]);

  // Function to manually refresh data
  const refreshData = useCallback(async () => {
    // Reset retry count on manual refresh
    setRetryCount(0);
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    // Fetch on mount or when userId changes
    fetchData();

    // Set up interval for periodic refresh in background
    // but with a longer interval to avoid too many requests
    const intervalId = setInterval(() => {
      fetchData();
    }, 60000); // Refresh every minute instead of more frequently

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
          await fetch('/api/dashboard/prefetch?page=1');
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