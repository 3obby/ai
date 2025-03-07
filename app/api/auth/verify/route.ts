import { NextResponse } from "next/server"
import { verifyMagicLink, getUserByEmail, createSession } from "@/lib/auth"

// We need to use NextResponse for redirection in route handlers, not the "redirect" import
export async function GET(req: Request) {
  try {
    console.log("[VERIFY_ROUTE] Processing verification request");
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      console.log("[VERIFY_ROUTE] No token provided");
      return new NextResponse("Token is required", { status: 400 })
    }

    console.log("[VERIFY_ROUTE] Verifying token");
    // Verify the magic link token - decode and validate the JWT
    const payload = verifyMagicLink(token)
    if (!payload) {
      console.log("[VERIFY_ROUTE] Invalid or expired token");
      return new NextResponse("Invalid or expired token", { status: 400 })
    }

    console.log(`[VERIFY_ROUTE] Token valid for email: ${payload.email}`);
    // Get or create the user - use a try/catch for database operations
    try {
      const user = await getUserByEmail(payload.email)
      if (!user) {
        console.log("[VERIFY_ROUTE] User not found");
        return new NextResponse("User not found", { status: 404 })
      }

      console.log(`[VERIFY_ROUTE] User found: ${user.id}, creating session`);
      // Create a session and set cookie - use home page URL for redirect
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      const response = NextResponse.redirect(`${baseUrl}/`)
      createSession(response, user)
      
      console.log("[VERIFY_ROUTE] Session created, redirecting to home");
      return response
    } catch (dbError) {
      console.error("[VERIFY_ROUTE] Database error:", dbError);
      return new NextResponse("Database error", { status: 500 })
    }
  } catch (error) {
    console.error("[VERIFY_MAGIC_LINK_ERROR]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
