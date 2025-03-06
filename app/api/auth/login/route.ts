import { NextResponse } from "next/server"
import { createMagicLink, sendMagicLinkEmail } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return new NextResponse("Email is required", { status: 400 })
    }

    // Create magic link
    const magicLink = await createMagicLink(email)

    // Send email with magic link
    const emailSent = await sendMagicLinkEmail(email, magicLink)

    if (!emailSent) {
      return new NextResponse("Failed to send magic link email", {
        status: 500,
      })
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("[MAGIC_LINK_ERROR]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
