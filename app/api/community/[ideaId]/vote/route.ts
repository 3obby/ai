import { auth, currentUser } from "@clerk/nextjs"
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

const UPVOTE_COST = 10000
const DOWNVOTE_COST = 3000

export async function PATCH(
  req: Request,
  { params }: { params: { ideaId: string } }
) {
  try {
    const user = await currentUser()
    const body = await req.json()
    const { voteType } = body // 'up' or 'down'

    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!params.ideaId) {
      return new NextResponse("Idea ID required", { status: 400 })
    }

    if (!voteType || !["up", "down"].includes(voteType)) {
      return new NextResponse("Invalid vote type", { status: 400 })
    }

    // Set cost based on vote type
    const voteCost = voteType === "up" ? UPVOTE_COST : DOWNVOTE_COST

    // Check user's available XP
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: user.id },
    })

    if (!userUsage || userUsage.availableTokens < voteCost) {
      return new NextResponse(
        `Insufficient XP. Need ${voteCost} XP to ${voteType}vote.`,
        { status: 403 }
      )
    }

    // Update vote and deduct XP
    const [idea] = await prismadb.$transaction([
      prismadb.communityIdea.update({
        where: { id: params.ideaId },
        data: {
          [voteType === "up" ? "upvotes" : "downvotes"]: { increment: 1 },
        },
      }),
      prismadb.userUsage.update({
        where: { userId: user.id },
        data: {
          availableTokens: userUsage.availableTokens - voteCost,
          totalSpent: userUsage.totalSpent + voteCost,
        },
      }),
    ])

    return NextResponse.json(idea)
  } catch (error) {
    console.log("[COMMUNITY_VOTE_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
