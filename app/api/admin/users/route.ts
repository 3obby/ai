import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
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

    // Check if user is admin based on localStorage in frontend
    // Server-side just checks if the user exists
    const user = await prismadb.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    // Get all users with their usage information
    const users = await prismadb.userUsage.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("[ADMIN_USERS_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
