import { auth } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Server-side just checks if the user exists
    const user = await prismadb.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    // Get all bots/companions
    const bots = await prismadb.companion.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(bots)
  } catch (error) {
    console.error("[ADMIN_BOTS_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
