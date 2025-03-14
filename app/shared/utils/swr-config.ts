/**
 * SWR Configuration for persistent cache and revalidation strategies
 */

// Cache time constants (in milliseconds)
export const CACHE_TIMES = {
  SHORT: 1000 * 60 * 5,      // 5 minutes
  MEDIUM: 1000 * 60 * 30,    // 30 minutes
  LONG: 1000 * 60 * 60 * 24, // 24 hours
};

// Default SWR configuration with persistent cache
export const swrConfig = {
  provider: () => {
    // Use localStorage as persistent cache provider
    const localStorage = typeof window !== 'undefined' ? window.localStorage : null;
    
    // Create map cache that syncs with localStorage
    const map = new Map(
      localStorage ? 
        // Initialize cache from localStorage on startup
        Object.entries(JSON.parse(localStorage.getItem('swr-cache') || '{}')) : 
        []
    );
    
    // Save cache to localStorage when window is about to unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        const cacheToStore: Record<string, any> = {};
        map.forEach((value, key) => {
          cacheToStore[key] = value;
        });
        localStorage?.setItem('swr-cache', JSON.stringify(cacheToStore));
      });
    }
    
    return {
      get: (key: string) => {
        return map.get(key);
      },
      set: (key: string, value: any) => {
        map.set(key, value);
      },
      delete: (key: string) => {
        map.delete(key);
      }
    };
  },
  // Default SWR revalidation strategies
  revalidateOnFocus: false,    // Don't revalidate on window focus
  revalidateOnReconnect: true, // Revalidate when browser regains connection
  revalidateIfStale: true,     // Revalidate if data is stale
  revalidateOnMount: true,     // Always revalidate on component mount
  dedupingInterval: 2000,      // Dedupe requests with the same key in 2s
  errorRetryCount: 3,          // Retry 3 times if error occurs
  errorRetryInterval: 5000,    // Wait 5 seconds between retries
  refreshInterval: 0,          // Default to no auto-refresh (0)
  // Function to determine if a cached response is stale
  isOnline: () => typeof navigator !== 'undefined' && navigator.onLine,
  isDocumentVisible: () => typeof document !== 'undefined' && document.visibilityState === 'visible',
};

// Utility to create a key for a specific resource and ID
export function createCacheKey(resource: string, id?: string | number) {
  return id ? `${resource}:${id}` : resource;
}

// Revalidation utility functions
export const revalidationUtils = {
  // Utility to add custom cache control for specific resources
  withTTL: (ttl: number) => {
    return (useSWRNext: any) => {
      return (key: string, fetcher: any, config: any) => {
        // Add timestamp to cache entry
        const enhancedFetcher = async (...args: any[]) => {
          const result = await fetcher(...args);
          return {
            data: result,
            timestamp: Date.now()
          };
        };
        
        config = {
          ...config,
          shouldRetryOnError: false,
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          revalidateIfStale: false,
          ...config,
        };
        
        const swr = useSWRNext(key, enhancedFetcher, config);
        
        if (swr.data && (Date.now() - swr.data.timestamp > ttl)) {
          // Revalidate if the cache is older than the TTL
          swr.mutate();
        }
        
        return {
          ...swr,
          data: swr.data ? swr.data.data : undefined
        };
      };
    };
  },
  
  // Invalidate multiple related cache keys
  invalidateMany: async (keys: string[], mutate: any) => {
    for (const key of keys) {
      await mutate(key);
    }
  }
}; 