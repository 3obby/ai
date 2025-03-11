import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

// Force Node.js runtime to support jsonwebtoken
export const runtime = 'nodejs';

// This handles authentication protection for routes
export async function middleware(request: NextRequest) {
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
  ]

  // Restricted paths that always require authentication
  const restrictedPaths = [
    "/files",
    "/vote",
    "/admin",
  ]

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Check if the path is one of the restricted paths
  if (restrictedPaths.some(restrictedPath => path.startsWith(restrictedPath))) {
    // Get session token using NextAuth's getToken
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    // If no token found for restricted path, redirect to login
    if (!token) {
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
    
    return NextResponse.next()
  }

  // Check if the path is public or should be accessible to anonymous users
  // Special handling for group chat URLs with the userId parameter
  if (
    publicPaths.some(
      (publicPath) => path === publicPath || path.startsWith(publicPath)
    ) ||
    // Allow access to group-chat/[id] with userId parameter for anonymous users
    (path.match(/^\/group-chat\/[a-zA-Z0-9-]+$/) && url.searchParams.has('userId'))
  ) {
    return NextResponse.next()
  }

  // For any other path, check authentication
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // If no token found and not on a public path, redirect to login
  if (!token) {
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
