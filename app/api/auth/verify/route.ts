import { NextResponse } from "next/server"

// Force Node.js runtime to support jsonwebtoken
export const runtime = 'nodejs';

// Use process.env.NODE_ENV to determine the environment
const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction
  ? (process.env.NEXTAUTH_URL_PRODUCTION || "https://groupchatbotbuilder.com")
  : (process.env.NEXTAUTH_URL || "http://localhost:3000");

export async function GET(req: Request) {
  try {
    // Get current URL to extract parameters
    const url = new URL(req.url)
    const callbackUrl = url.searchParams.get("callbackUrl") || "/dashboard"
    
    // Create absolute URL for redirection
    const redirectUrl = new URL(`/api/auth/callback/email`, baseUrl)
    redirectUrl.searchParams.set("callbackUrl", callbackUrl)
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("[VERIFY_MAGIC_LINK_ERROR]", error)
    const errorUrl = new URL("/login", baseUrl)
    errorUrl.searchParams.set("error", "VerificationError")
    return NextResponse.redirect(errorUrl)
  }
}
