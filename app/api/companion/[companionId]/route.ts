import { auth } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { checkSubscription } from "@/lib/subscription"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const body = await req.json()
    const session = await auth()
    const userId = session?.userId
    const user = session?.user

    const { src, name, instructions, categoryId, private: isPrivate } = body

    if (!params.companionId) {
      return new NextResponse("Companion ID required", { status: 400 })
    }

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!src || !name || !instructions || !categoryId) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const companion = await prismadb.companion.update({
      where: {
        id: params.companionId,
      },
      data: {
        categoryId,
        userId: userId,
        userName: user.name || "User",
        src,
        name,
        instructions,
        private: isPrivate,
      },
    })

    return NextResponse.json(companion)
  } catch (error) {
    console.log("[COMPANION_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const companion = await prismadb.companion.delete({
      where: {
        userId,
        id: params.companionId,
      },
    })

    return NextResponse.json(companion)
  } catch (error) {
    console.log("[COMPANION_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const companion = await prismadb.companion.findFirst({
      where: {
        id: params.companionId,
      },
    })

    const categories = await prismadb.category.findMany()

    return NextResponse.json({ companion, categories })
  } catch (error) {
    console.log("[COMPANION_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
