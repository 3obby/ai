import { NextResponse } from "next/server"
import { createMagicLink, sendMagicLinkEmail } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    console.log("[LOGIN_ROUTE] Processing login request");
    const body = await req.json()
    const { email } = body

    if (!email) {
      console.log("[LOGIN_ROUTE] No email provided");
      return new NextResponse("Email is required", { status: 400 })
    }

    console.log(`[LOGIN_ROUTE] Creating magic link for ${email}`);
    // Create magic link
    const magicLink = await createMagicLink(email)
    
    console.log(`[LOGIN_ROUTE] Magic link created, sending email to ${email}`);
    // Send email with magic link
    const emailSent = await sendMagicLinkEmail(email, magicLink)

    if (!emailSent) {
      console.error("[LOGIN_ROUTE] Failed to send magic link email");
      return new NextResponse("Failed to send magic link email", {
        status: 500,
      })
    }

    console.log(`[LOGIN_ROUTE] Magic link email sent successfully to ${email}`);
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("[LOGIN_ROUTE_ERROR]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
