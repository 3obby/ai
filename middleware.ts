import { NextResponse } from "next/server"
import { getSessionFromCookie } from "./lib/auth"
import type { NextRequest } from "next/server"

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/nextjs/middleware for more information about configuring your middleware
export function middleware(request: NextRequest) {
  // Public routes that don't require authentication
  const publicPaths = [
    "/",
    "/login",
    "/api/auth/login",
    "/api/auth/verify",
    "/api/webhook",
    "/api/webhook/clerk",
    "/subscribe",
  ]

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Check if the path is public
  if (
    publicPaths.some(
      (publicPath) => path === publicPath || path.startsWith(publicPath)
    )
  ) {
    return NextResponse.next()
  }

  // Check for authenticated session
  const session = getSessionFromCookie(request)

  // If no session found and not on a public path, redirect to login
  if (!session) {
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
