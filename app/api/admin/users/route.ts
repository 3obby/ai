import { auth } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const session = await auth()
    const userId = session?.userId
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })

    const users = await prismadb.userUsage.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.log("[ADMIN_USERS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
