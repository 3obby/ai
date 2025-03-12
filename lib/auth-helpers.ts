import { NextRequest } from 'next/server';

export const runtime = 'experimental-edge';

/**
 * Verify the authentication token in the request
 * This is a simplified version that just checks for the session cookie
 * and doesn't actually verify the JWT token in Edge Runtime
 */
export async function verifyAuthToken(request: NextRequest) {
  try {
    // In Edge Runtime, we'll just check if the session cookie exists
    // The actual verification will happen in the API routes
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value ||
                         request.cookies.get('__Secure-next-auth.session-token')?.value;
    
    if (!sessionCookie) {
      return null;
    }
    
    // Return a minimal token object
    // The actual user data will be fetched from the API
    return {
      exists: true
    };
  } catch (error) {
    console.error("[AUTH_TOKEN_VERIFICATION_ERROR]", error);
    return null;
  }
}

/**
 * Check if a path is public and doesn't require authentication
 */
export function isPublicPath(pathname: string, searchParams: URLSearchParams) {
  // Public routes that don't require authentication
  const publicPaths = [
    "/",
    "/login",
    "/register",
    "/api/auth",
    "/api/webhook",
    "/subscribe",
    "/dashboard",
    "/chat",
    "/companion",
    "/groups",
    "/group-chat", // Allow anonymous users to access group chat pages
    "/group-chat-start", // New route for starting group chats as anonymous user
  ];
  
  // Check if the path is in the public paths list or is a group chat URL with userId param
  return publicPaths.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(publicPath)
  ) || (pathname.match(/^\/group-chat\/[a-zA-Z0-9-]+$/) && searchParams.has('userId'));
}

/**
 * Check if a path is restricted and always requires authentication
 */
export function isRestrictedPath(pathname: string) {
  // Restricted paths that always require authentication
  const restrictedPaths = [
    "/files",
    "/vote",
    "/admin",
  ];
  
  return restrictedPaths.some(restrictedPath => pathname.startsWith(restrictedPath));
} 