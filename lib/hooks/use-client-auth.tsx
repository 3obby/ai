import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type AuthStatus = {
  authenticated: boolean;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isAnonymous?: boolean;
  } | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook for client components to check authentication status
 * Uses our new /api/auth/status endpoint which is compatible with Edge Runtime
 */
export default function useClientAuth(redirectToLogin = false) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>({
    authenticated: false,
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch authentication status');
        }
        
        const data = await response.json();
        
        setStatus({
          authenticated: data.authenticated,
          user: data.user,
          loading: false,
          error: null
        });
        
        // If redirectToLogin is true and user is not authenticated, redirect to login page
        if (redirectToLogin && !data.authenticated) {
          router.push('/login');
        }
      } catch (error) {
        setStatus({
          authenticated: false,
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
    
    checkAuth();
  }, [router, redirectToLogin]);

  return status;
} 