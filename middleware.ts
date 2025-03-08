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

  // Get session token using NextAuth's getToken
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
