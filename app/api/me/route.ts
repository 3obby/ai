import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-options"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Force Node.js runtime to support jsonwebtoken
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    })
  } catch (error) {
    console.error("[GET_CURRENT_USER_ERROR]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
