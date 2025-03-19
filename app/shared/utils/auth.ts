import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Get the current session on the server side
 * This function is async and must be awaited in Next.js 15
 */
export async function auth() {
  const session = await getServerSession(authOptions);
  
  return {
    userId: session?.user?.id,
    user: session?.user,
  };
}

/**
 * Get authentication status information for server components
 * This function is async and must be awaited in Next.js 15
 */
export async function getServerAuthStatus() {
  const session = await getServerSession(authOptions);
  
  return { 
    isSignedIn: !!session?.user?.id, 
    userId: session?.user?.id || null 
  };
}

/**
 * Gets the current authentication session
 * Alias for getServerSession for backward compatibility
 * This function is async and must be awaited in Next.js 15
 */
export async function getAuthSession() {
  return getServerSession(authOptions);
}

/**
 * Utility function for server components that need auth status
 * Handles awaiting the auth() function properly for Next.js 15
 * @returns Object with auth status and optional redirect function
 */
export async function withAuth(options?: { 
  redirectTo?: string;
  redirectIfAuthenticated?: string;
}) {
  const session = await auth();
  
  const result = {
    isAuthenticated: !!session?.userId,
    userId: session?.userId,
    user: session?.user,
    redirect: null as string | null,
  };
  
  // Handle redirect if unauthenticated
  if (options?.redirectTo && !result.isAuthenticated) {
    result.redirect = options.redirectTo;
  }
  
  // Handle redirect if authenticated but should be redirected elsewhere
  if (options?.redirectIfAuthenticated && result.isAuthenticated) {
    result.redirect = options.redirectIfAuthenticated;
  }
  
  return result;
}

/**
 * Utility function for API route handlers
 * Gets user ID from authenticated session or query parameter
 * @returns Object with userId and authentication status
 */
export async function getUserIdForApi(request: Request) {
  const session = await auth();
  const userId = session?.userId;
  
  // Check for userId in URL query parameters for anonymous access
  const url = new URL(request.url);
  const queryUserId = url.searchParams.get('userId');
  
  // Use query userId if provided and no session userId exists
  const effectiveUserId = userId || queryUserId;
  
  return {
    userId: effectiveUserId,
    isAuthenticated: !!userId,
    isAnonymous: !userId && !!queryUserId
  };
}
