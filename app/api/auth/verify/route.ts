import { NextResponse } from "next/server"
import { verifyMagicLink, getUserByEmail, createSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return new NextResponse("Token is required", { status: 400 })
    }

    // Verify the magic link token
    const payload = verifyMagicLink(token)
    if (!payload) {
      return new NextResponse("Invalid or expired token", { status: 400 })
    }

    // Get or create the user
    const user = await getUserByEmail(payload.email)
    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Create a session and set cookie
    const response = NextResponse.redirect(new URL("/", req.url))
    createSession(response, user)

    return response
  } catch (error) {
    console.error("[VERIFY_MAGIC_LINK_ERROR]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
