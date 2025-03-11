import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-helpers"
import prismadb from "@/lib/prismadb"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth()
    const userId = session?.userId
    
    // Get the userId from the query if passed
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;

    // Allow access for anonymous users
    // if (!userId) {
    //   return new NextResponse("Unauthorized", { status: 401 })
    // }

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
