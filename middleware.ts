import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAuthToken, isPublicPath } from "@/lib/auth-helpers"

// Using 'experimental-edge' runtime for Next.js 15 compatibility
export const runtime = 'experimental-edge';

// This handles authentication protection and performance optimization
export async function middleware(request: NextRequest) {
  const requestStartTime = Date.now();
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  
  // Skip middleware for static asset requests
  if (
    pathname.includes('.') || // Static files
    pathname.startsWith('/_next') || // Next.js internals
    pathname.startsWith('/favicon') || // Favicon
    pathname.startsWith('/api/auth') // Auth endpoints handle their own auth
  ) {
    return NextResponse.next();
  }
  
  // Create response to later modify headers
  const response = NextResponse.next();
  
  // PERFORMANCE OPTIMIZATION: Add headers for API responses
  if (pathname.startsWith('/api/')) {
    // For frequently accessed public dashboard data endpoints, add caching headers
    if (pathname.startsWith('/api/dashboard') || 
        pathname.startsWith('/api/categories') ||
        pathname.startsWith('/api/companions') && request.method === 'GET') {
      
      // Add cache control headers based on whether this is an authenticated request
      const authCookie = request.cookies.get('authjs.session-token');
      
      if (!authCookie) {
        // For anonymous users, enable caching
        response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=300, stale-while-revalidate=600');
      } else {
        // For authenticated users, enable shorter caching
        response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
      }
    }
    
    // Continue with API requests without auth checks
    response.headers.set(
      "Server-Timing",
      `middleware;dur=${Date.now() - requestStartTime}`
    );
    return response;
  }
  
  // AUTH PROTECTION: Handle authentication for non-API routes
  
  // For public paths, just continue
  if (isPublicPath(pathname, searchParams)) {
    response.headers.set(
      "Server-Timing",
      `middleware;dur=${Date.now() - requestStartTime}`
    );
    return response;
  }
  
  // For protected paths, validate the token
  try {
    const token = request.cookies.get("session-token");
    
    // No token found, redirect to login
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set("callbackUrl", encodeURI(request.url));
      return NextResponse.redirect(url);
    }
    
    // Validate token (passing the request)
    const validToken = await verifyAuthToken(request);
    
    // Invalid token, redirect to login
    if (!validToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set("callbackUrl", encodeURI(request.url));
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("[MIDDLEWARE_AUTH_ERROR]", error);
    
    // On error, redirect to login
    const url = new URL('/login', request.url);
    url.searchParams.set("callbackUrl", encodeURI(request.url));
    return NextResponse.redirect(url);
  }
  
  // Add Server-Timing header for performance monitoring
  response.headers.set(
    "Server-Timing",
    `middleware;dur=${Date.now() - requestStartTime}`
  );
  
  return response;
}

// Run the middleware on all routes except static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
