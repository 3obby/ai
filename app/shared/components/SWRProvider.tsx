'use client';

import { SWRConfig } from 'swr';
import { swrConfig } from '@/app/shared/utils/swr-config';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

/**
 * SWR Provider component that applies our persistent cache configuration
 * Wrap application or sections that need the SWR cache with this component
 */
export default function SWRProvider({ children }: SWRProviderProps) {
  // Define cache provider that aligns with SWR's expected Cache interface
  const provider = () => {
    const map = new Map();
    
    // Use localStorage as persistent cache
    if (typeof window !== 'undefined') {
      // Load cache from localStorage on mount
      try {
        const cache = localStorage.getItem('swr-cache');
        if (cache) {
          const data = JSON.parse(cache);
          Object.keys(data).forEach(key => {
            map.set(key, data[key]);
          });
        }
      } catch (e) {
        console.error('Failed to load SWR cache from localStorage', e);
      }
      
      // Save cache to localStorage before unloading
      window.addEventListener('beforeunload', () => {
        const cacheToStore: Record<string, any> = {};
        map.forEach((value, key) => {
          cacheToStore[key] = value;
        });
        localStorage.setItem('swr-cache', JSON.stringify(cacheToStore));
      });
    }
    
    return new Map(map);
  };
  
  return (
    <SWRConfig 
      value={{
        provider,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        dedupingInterval: 2000,
        errorRetryCount: 3
      }}
    >
      {children}
    </SWRConfig>
  );
} 