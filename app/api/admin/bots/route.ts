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

    const companions = await prismadb.companion.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(companions)
  } catch (error) {
    console.log("[ADMIN_BOTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
