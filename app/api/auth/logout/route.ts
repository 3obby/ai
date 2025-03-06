import { NextResponse } from "next/server"

export async function POST() {
  // Create response that redirects to home
  const response = NextResponse.redirect(new URL("/"))

  // Clear the auth cookie
  response.headers.set(
    "Set-Cookie",
    "auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
  )

  return response
}
