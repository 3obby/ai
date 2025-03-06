import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    })
  } catch (error) {
    console.error("[GET_CURRENT_USER_ERROR]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
