import { authMiddleware } from "@clerk/nextjs"
import { NextResponse } from "next/server"

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/nextjs/middleware for more information about configuring your middleware
export default authMiddleware({
  publicRoutes: [
    "/", // Make the landing page public
    "/login", // Make the login page public
    "/register", // Make the registration page public
    "/api/webhook/clerk",
    "/api/webhook",
    "/subscribe",
  ],
  afterAuth(auth, req, evt) {
    // If the user is logged in and trying to access sign-in, sign-up, or login, redirect to home
    if (
      auth.userId &&
      (req.url.includes("/sign-in") ||
        req.url.includes("/sign-up") ||
        req.url.includes("/login") ||
        req.url.includes("/register"))
    ) {
      const homeUrl = new URL("/", req.url)
      return NextResponse.redirect(homeUrl)
    }
  },
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
