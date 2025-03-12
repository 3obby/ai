import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prismadb from "@/lib/prismadb"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const UPVOTE_COST = 10000
const DOWNVOTE_COST = 3000

export async function POST(
  req: Request,
  { params }: { params: { ideaId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId
    const body = await req.json()
    const { type } = body // 'upvote' or 'downvote'

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!params.ideaId) {
      return new NextResponse("Idea ID required", { status: 400 })
    }

    if (!type || !["upvote", "downvote"].includes(type)) {
      return new NextResponse("Invalid vote type", { status: 400 })
    }

    // Set cost based on vote type
    const voteCost = type === "upvote" ? UPVOTE_COST : DOWNVOTE_COST

    // Check user's available XP
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: userId },
    })

    if (!userUsage || userUsage.availableTokens < voteCost) {
      return new NextResponse(
        `Insufficient XP. Need ${voteCost} XP to ${type} idea.`,
        { status: 403 }
      )
    }

    // Update vote and deduct XP
    const [idea] = await prismadb.$transaction([
      prismadb.communityIdea.update({
        where: { id: params.ideaId },
        data: {
          [type === "upvote" ? "upvotes" : "downvotes"]: { increment: 1 },
        },
      }),
      prismadb.userUsage.update({
        where: { userId: userId },
        data: {
          availableTokens: userUsage.availableTokens - voteCost,
          totalSpent: userUsage.totalSpent + voteCost,
        },
      }),
    ])

    return NextResponse.json(idea)
  } catch (error) {
    console.log("[VOTE_API_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
