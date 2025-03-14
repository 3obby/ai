import { auth } from '@/lib/auth';

export interface ApiAuthResult {
  userId: string | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  hasValidToken: boolean;
}

/**
 * Unified authentication utility for API routes
 * Handles both authenticated users and anonymous users consistently
 */
export async function getApiAuth(request: Request): Promise<ApiAuthResult> {
  // Try to get user from session first
  const session = await auth();
  let userId = session?.user?.id || null;
  let isAuthenticated = !!session?.user;
  let isAnonymous = false;
  let hasValidToken = isAuthenticated; // Authenticated users always have valid tokens
  
  // If no authenticated user, check for anonymous user
  if (!userId) {
    // Extract from URL if present
    const url = new URL(request.url);
    const anonIdFromUrl = url.searchParams.get('userId');
    
    // Extract from cookies using the Cookie header
    let anonIdFromCookie = null;
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
      const anonymousUserCookie = cookies.find(cookie => cookie.startsWith('anonymousUserId='));
      if (anonymousUserCookie) {
        anonIdFromCookie = anonymousUserCookie.split('=')[1];
      }
    }
    
    // Extract from headers as another option
    const anonIdFromHeader = request.headers.get('x-anonymous-user-id');
    
    // Extract from request body for POST requests
    let anonIdFromBody = null;
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        const clonedReq = request.clone();
        const body = await clonedReq.json();
        anonIdFromBody = body.userId || null;
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    // Use the first available ID source
    userId = anonIdFromUrl || anonIdFromHeader || anonIdFromCookie || anonIdFromBody || null;
    isAnonymous = !!userId;
    
    // For anonymous users, we consider them to have a valid token if they have a user ID
    // In a production system, we would verify the token here
    hasValidToken = isAnonymous;
  }
  
  return {
    userId,
    isAuthenticated,
    isAnonymous, 
    hasValidToken
  };
}

/**
 * Helper function to verify if a request is authorized
 * Returns userId if authorized, throws 401 otherwise
 */
export async function requireAuth(request: Request): Promise<string> {
  const { userId, hasValidToken } = await getApiAuth(request);
  
  if (!userId || !hasValidToken) {
    throw new Error("Unauthorized");
  }
  
  return userId;
} 