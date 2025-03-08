import { NextResponse } from "next/server"

// Force Node.js runtime to support jsonwebtoken
export const runtime = 'nodejs';

// Use process.env.NODE_ENV to determine the environment
const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction
  ? (process.env.NEXTAUTH_URL_PRODUCTION || "https://groupchatbotbuilder.com")
  : (process.env.NEXTAUTH_URL || "http://localhost:3000");

export async function POST(req: Request) {
  try {
    // Create absolute URL for redirection
    const redirectUrl = new URL("/api/auth/signin", baseUrl)
    
    // For backward compatibility, redirect to NextAuth's signin endpoint
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("[LOGIN_ERROR]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
