import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-helpers"
import prismadb from "@/lib/prismadb"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const categories = await prismadb.category.findMany({
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.log("[CATEGORIES_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
